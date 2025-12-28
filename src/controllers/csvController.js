const fs = require('fs');
const csvParser = require('csv-parser');

const db = require('../db');
const { validateAndNormalizeTradeRow, isEmpty } = require('../utils/csvTradeValidator');
const { invalidatePortfolioCache } = require('./portfolioSummaryController');

const MAX_ROWS = 100000;
const BATCH_SIZE = 500;

const QTY_RELATIVE_TOLERANCE = 0.000001; // 0.0001%

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatPgTimestampUtc(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

function normalizeHeader(header) {
  if (!header) return header;
  return String(header).replace(/^\uFEFF/, '').trim().toLowerCase();
}

function quantitiesMatch(a, b) {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return diff <= scale * QTY_RELATIVE_TOLERANCE + 1e-12;
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

async function fetchExistingQuantitiesByKey(client, portfolioId, triples) {
  if (triples.length === 0) return new Map();

  const valuesSql = triples
    .map((_, i) => {
      const base = i * 3;
      return `($${base + 2}::timestamp, $${base + 3}, $${base + 4})`;
    })
    .join(',');

  const params = [portfolioId];
  for (const t of triples) {
    params.push(t.timestampUtc, t.symbol, t.side);
  }

  const res = await client.query(
    `
      WITH candidates(ts, symbol, side) AS (VALUES ${valuesSql})
      SELECT t.timestamp AS ts, t.symbol, t.side, t.quantity
      FROM trades t
      JOIN candidates c
        ON t.timestamp = c.ts
       AND t.symbol = c.symbol
       AND t.side = c.side
      WHERE t.portfolio_id = $1
    `,
    params
  );

  const map = new Map();
  for (const row of res.rows) {
    const ts = String(row.ts);
    const key = `${ts}|${row.symbol}|${row.side}`;
    const qty = Number(row.quantity);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(qty);
  }
  return map;
}

async function insertTradesBatch(client, portfolioId, trades) {
  if (trades.length === 0) return 0;

  const columns = '(portfolio_id, timestamp, symbol, side, quantity, price, fee, exchange)';
  const valuesSql = trades
    .map((_, i) => {
      const base = i * 8;
      return `($${base + 1}, $${base + 2}::timestamp, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    })
    .join(',');

  const params = [];
  for (const t of trades) {
    params.push(
      portfolioId,
      t.timestampUtc,
      t.symbol,
      t.side,
      t.quantityRaw,
      t.priceRaw,
      t.feeRaw,
      t.exchange
    );
  }

  const res = await client.query(
    `INSERT INTO trades ${columns} VALUES ${valuesSql}`,
    params
  );

  return res.rowCount;
}

async function importCsvTrades(req, res, next) {
  const { portfolio_id } = req.params;
  const uploadedFile = req.file || (Array.isArray(req.files) ? req.files[0] : undefined);

  if (!uploadedFile) {
    return res.status(400).json({
      success: false,
      message: 'No CSV file provided',
    });
  }

  const filePath = uploadedFile.path;
  const client = await db.pool.connect();

  try {
    const exists = await client.query('SELECT id FROM portfolios WHERE id = $1', [portfolio_id]);
    if (exists.rows.length === 0) {
      throw Object.assign(new Error('Portfolio not found'), { statusCode: 404 });
    }

    await client.query('BEGIN');

    const errors_detail = [];
    let total_rows = 0;
    let imported = 0;
    let skipped_duplicates = 0;

    const seenByKey = new Map();
    let batch = [];

    const requiredHeaders = ['timestamp', 'symbol', 'side', 'qty', 'price'];

    const parser = fs
      .createReadStream(filePath)
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => normalizeHeader(header),
        })
      );

    const headers = await new Promise((resolve, reject) => {
      const onHeaders = (h) => {
        cleanup();
        resolve(h);
      };

      const onError = (e) => {
        cleanup();
        reject(e);
      };

      const onEnd = () => {
        cleanup();
        reject(badRequest('CSV file is empty'));
      };

      const cleanup = () => {
        parser.off('headers', onHeaders);
        parser.off('error', onError);
        parser.off('end', onEnd);
      };

      parser.on('headers', onHeaders);
      parser.on('error', onError);
      parser.on('end', onEnd);
    });

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw badRequest(`Missing required CSV headers: ${missingHeaders.join(', ')}`);
    }

    const flushBatch = async () => {
      if (batch.length === 0) return;

      const uniqueInFile = [];
      for (const t of batch) {
        const key = `${t.timestampUtc}|${t.symbol}|${t.side}`;
        const seenQtys = seenByKey.get(key) || [];

        if (seenQtys.some((q) => quantitiesMatch(q, t.quantity))) {
          skipped_duplicates += 1;
          continue;
        }

        seenQtys.push(t.quantity);
        seenByKey.set(key, seenQtys);
        uniqueInFile.push(t);
      }

      if (uniqueInFile.length === 0) {
        batch = [];
        return;
      }

      const uniqueTriples = Array.from(
        new Map(
          uniqueInFile.map((t) => [
            `${t.timestampUtc}|${t.symbol}|${t.side}`,
            { timestampUtc: t.timestampUtc, symbol: t.symbol, side: t.side },
          ])
        ).values()
      );

      const existingMap = await fetchExistingQuantitiesByKey(client, portfolio_id, uniqueTriples);

      const toInsert = [];
      for (const t of uniqueInFile) {
        const key = `${t.timestampUtc}|${t.symbol}|${t.side}`;
        const existingQtys = existingMap.get(key) || [];

        if (existingQtys.some((q) => quantitiesMatch(q, t.quantity))) {
          skipped_duplicates += 1;
          continue;
        }

        toInsert.push(t);
      }

      const insertedCount = await insertTradesBatch(client, portfolio_id, toInsert);
      imported += insertedCount;

      batch = [];
    };

    for await (const rawRow of parser) {
      if (Object.values(rawRow).every((v) => isEmpty(v))) {
        continue;
      }

      total_rows += 1;
      if (total_rows > MAX_ROWS) {
        throw badRequest('CSV file exceeds maximum allowed rows (100,000)');
      }

      const rowNumber = total_rows + 1;
      const validation = validateAndNormalizeTradeRow(rawRow);

      if (!validation.ok) {
        console.warn('CSV validation error:', {
          row: rowNumber,
          reason: validation.reason,
        });

        errors_detail.push({
          row: rowNumber,
          reason: validation.reason,
          raw_data: validation.raw_data,
        });
        continue;
      }

      const trade = validation.value;
      batch.push({
        ...trade,
        timestampUtc: formatPgTimestampUtc(trade.timestamp),
      });

      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }

    if (total_rows === 0) {
      throw badRequest('CSV file contains no data rows');
    }

    await flushBatch();
    await client.query('COMMIT');

    const errors = errors_detail.length;
    const message =
      errors > 0
        ? `Imported ${imported}/${total_rows} trades. ${errors} rows have errors (see errors_detail).`
        : `Successfully imported ${imported} trades.`;

    // Invalidate cache for this portfolio
    await invalidatePortfolioCache(portfolio_id);

    return res.status(200).json({
      success: true,
      total_rows,
      imported,
      errors,
      skipped_duplicates,
      errors_detail,
      message,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
    if (filePath) {
      fs.promises.unlink(filePath).catch(() => {});
    }
  }
}

function getCsvTemplate(req, res) {
  const csvContent = `timestamp,symbol,side,qty,price,fee,exchange\n2024-01-15T10:30:00Z,BTC,BUY,0.5,42000,10,Binance\n2024-01-16T14:15:00Z,ETH,SELL,5,2300,2.5,Kraken\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="crypto_import_template.csv"');
  res.send(csvContent);
}

module.exports = {
  importCsvTrades,
  getCsvTemplate,
};

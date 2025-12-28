const ccxt = require('ccxt');
const db = require('../db');
const { normalizeSymbol } = require('../utils/symbolNormalizer');
const { invalidatePortfolioCache } = require('./portfolioSummaryController');

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const QTY_RELATIVE_TOLERANCE = 0.000001; // 0.0001%

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatPgTimestampUtc(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
}

function quantitiesMatch(a, b) {
  const diff = Math.abs(a - b);
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return diff <= scale * QTY_RELATIVE_TOLERANCE + 1e-12;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, retries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check for rate limit error
      if (error.message && (error.message.includes('429') || error.message.toLowerCase().includes('rate limit'))) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`Rate limit hit, backing off for ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(backoffMs);
        continue;
      }
      
      // Check for network timeout or temporary errors
      if (error.message && (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET'))) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`Network error, backing off for ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(backoffMs);
        continue;
      }
      
      // If it's not a retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

function normalizeTrade(trade) {
  // Extract base symbol from trading pair (e.g., 'BTC/USDT' -> 'BTC')
  let symbol = trade.symbol || '';
  if (symbol.includes('/')) {
    symbol = symbol.split('/')[0];
  }
  symbol = normalizeSymbol(symbol);
  
  // Convert side to uppercase
  const side = (trade.side || '').toUpperCase();
  
  // Extract values with defaults
  const quantity = trade.amount || 0;
  const price = trade.price || 0;
  const fee = (trade.fee && trade.fee.cost) ? trade.fee.cost : 0;
  const timestamp = trade.timestamp ? new Date(trade.timestamp) : new Date();
  const sourceId = trade.id ? String(trade.id) : null;
  
  return {
    timestamp,
    timestampUtc: formatPgTimestampUtc(timestamp),
    symbol,
    side,
    quantity,
    quantityRaw: String(quantity),
    price,
    priceRaw: String(price),
    fee,
    feeRaw: String(fee),
    exchange: 'Bybit',
    sourceId,
  };
}

async function checkDuplicateBySourceId(client, portfolioId, sourceId) {
  if (!sourceId) return false;
  
  const result = await client.query(
    'SELECT id FROM trades WHERE portfolio_id = $1 AND source_id = $2 LIMIT 1',
    [portfolioId, sourceId]
  );
  
  return result.rows.length > 0;
}

async function checkDuplicateByAttributes(client, portfolioId, trade) {
  const result = await client.query(
    `SELECT quantity FROM trades 
     WHERE portfolio_id = $1 
       AND timestamp = $2::timestamp 
       AND symbol = $3 
       AND side = $4`,
    [portfolioId, trade.timestampUtc, trade.symbol, trade.side]
  );
  
  for (const row of result.rows) {
    if (quantitiesMatch(Number(row.quantity), trade.quantity)) {
      return true;
    }
  }
  
  return false;
}

async function insertTrade(client, portfolioId, trade) {
  await client.query(
    `INSERT INTO trades 
     (portfolio_id, timestamp, symbol, side, quantity, price, fee, exchange, source_id) 
     VALUES ($1, $2::timestamp, $3, $4, $5, $6, $7, $8, $9)`,
    [
      portfolioId,
      trade.timestampUtc,
      trade.symbol,
      trade.side,
      trade.quantityRaw,
      trade.priceRaw,
      trade.feeRaw,
      trade.exchange,
      trade.sourceId,
    ]
  );
}

async function syncBybitTrades(req, res, next) {
  const { portfolio_id } = req.params;
  const { api_key, api_secret } = req.body;
  
  if (!api_key || !api_secret) {
    return res.status(400).json({
      success: false,
      error: 'Missing API credentials',
      details: 'Both api_key and api_secret are required',
    });
  }
  
  const client = await db.pool.connect();
  
  try {
    // Check if portfolio exists
    const portfolioCheck = await client.query(
      'SELECT id FROM portfolios WHERE id = $1',
      [portfolio_id]
    );
    
    if (portfolioCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
        details: `No portfolio found with ID: ${portfolio_id}`,
      });
    }
    
    // Initialize Bybit exchange with CCXT
    const exchange = new ccxt.bybit({
      apiKey: api_key,
      secret: api_secret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot', // Fetch spot trades only
      },
    });
    
    let allTrades = [];
    const limit = 100;
    const maxIterations = 100; // Safety limit to prevent infinite loops
    let iterations = 0;
    
    console.log('Starting Bybit trade sync...');
    
    // Fetch all trades with pagination
    try {
      await exchange.loadMarkets();
      
      let hasMoreData = true;
      let since = undefined;
      
      // Fetch all trades across all symbols
      while (hasMoreData && iterations < maxIterations) {
        iterations++;
        
        const trades = await fetchWithRetry(async () => {
          // Fetch trades (Bybit returns max 100 per request)
          // Passing undefined as symbol fetches trades for all symbols
          return await exchange.fetchMyTrades(undefined, since, limit);
        });
        
        if (trades.length === 0) {
          hasMoreData = false;
          break;
        }
        
        allTrades = allTrades.concat(trades);
        console.log(`Fetched batch ${iterations}: ${trades.length} trades (total: ${allTrades.length})`);
        
        // If we got less than limit trades, we've reached the end
        if (trades.length < limit) {
          hasMoreData = false;
        } else {
          // Sort trades by timestamp to ensure we get the latest one
          const sortedTrades = trades.sort((a, b) => a.timestamp - b.timestamp);
          const lastTimestamp = sortedTrades[sortedTrades.length - 1].timestamp;
          
          // Set since to just after the last trade timestamp for pagination
          since = lastTimestamp + 1;
          
          // Add a small delay to respect rate limits
          await sleep(100);
        }
      }
      
      if (iterations >= maxIterations) {
        console.warn(`Reached maximum iteration limit (${maxIterations}). Some trades may not be fetched.`);
      }
      
      console.log(`Fetched ${allTrades.length} trades from Bybit in ${iterations} iterations`);
      
    } catch (error) {
      console.error('Error fetching trades from Bybit:', error.message);
      
      // Handle specific error cases
      if (error.message && error.message.includes('Invalid API')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API credentials',
          details: 'Authentication failed. Please verify your API key and secret.',
        });
      }
      
      if (error.message && error.message.includes('API key')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API credentials',
          details: 'Authentication failed. Please verify your API key and secret.',
        });
      }
      
      if (error.message && error.message.includes('permission')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient API permissions',
          details: 'Your API key does not have permission to read trade history.',
        });
      }
      
      if (error.message && (error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
        return res.status(503).json({
          success: false,
          error: 'Network timeout',
          details: 'Connection to Bybit timed out. Please try again.',
        });
      }
      
      // Generic error for Bybit API issues
      return res.status(503).json({
        success: false,
        error: 'Bybit API temporarily unavailable',
        details: 'Unable to connect to Bybit API. Please try again later.',
      });
    }
    
    // Start transaction for inserting trades
    await client.query('BEGIN');
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    
    for (const rawTrade of allTrades) {
      try {
        // Normalize the trade data
        const trade = normalizeTrade(rawTrade);
        
        // Validate essential fields
        if (!trade.symbol || !trade.side || trade.quantity <= 0 || trade.price <= 0) {
          console.warn('Skipping invalid trade:', { symbol: trade.symbol, side: trade.side, qty: trade.quantity });
          errors.push({ message: 'Invalid trade data', trade: rawTrade.id });
          skippedCount++;
          continue;
        }
        
        // Check for duplicates
        const isDuplicateById = await checkDuplicateBySourceId(client, portfolio_id, trade.sourceId);
        if (isDuplicateById) {
          skippedCount++;
          continue;
        }
        
        const isDuplicateByAttrs = await checkDuplicateByAttributes(client, portfolio_id, trade);
        if (isDuplicateByAttrs) {
          skippedCount++;
          continue;
        }
        
        // Insert the trade
        await insertTrade(client, portfolio_id, trade);
        insertedCount++;
        
      } catch (error) {
        console.error('Error processing trade:', error.message);
        errors.push({ message: error.message, trade: rawTrade.id });
        // Continue processing other trades
      }
    }
    
    await client.query('COMMIT');
    
    // Invalidate cache for this portfolio if new trades were added
    if (insertedCount > 0) {
      await invalidatePortfolioCache(portfolio_id);
    }
    
    const message = insertedCount > 0
      ? `Synced ${allTrades.length} trades from Bybit. ${insertedCount} new trades added, ${skippedCount} duplicates skipped.`
      : allTrades.length > 0
      ? `All ${allTrades.length} trades from Bybit were duplicates. No new trades added.`
      : 'No trades found in your Bybit account.';
    
    return res.status(200).json({
      success: true,
      fetched_count: allTrades.length,
      inserted_count: insertedCount,
      skipped_count: skippedCount,
      errors: errors.length > 0 ? errors : [],
      message,
    });
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Unexpected error during Bybit sync:', error);
    next(error);
  } finally {
    client.release();
  }
}

module.exports = {
  syncBybitTrades,
};

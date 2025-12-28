const { normalizeSymbol } = require('./symbolNormalizer');

const MAX_SYMBOL_LENGTH = 10;
const MAX_EXCHANGE_LENGTH = 50;

function isEmpty(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function parseTimestampToUtc(raw) {
  if (isEmpty(raw)) {
    return { ok: false, error: 'Invalid timestamp format' };
  }

  const str = String(raw).trim();

  // YYYY-MM-DD
  let m = str.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (m) {
    const [_, y, mo, d] = m;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0));
    if (Number.isNaN(date.getTime())) return { ok: false, error: 'Invalid timestamp format' };
    if (date.getTime() > Date.now()) return { ok: false, error: 'Invalid timestamp format' };
    return { ok: true, value: date };
  }

  // YYYY-MM-DD HH:MM:SS
  m = str.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})\s+([0-9]{2}):([0-9]{2}):([0-9]{2})$/);
  if (m) {
    const [_, y, mo, d, hh, mm, ss] = m;
    const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
    if (Number.isNaN(date.getTime())) return { ok: false, error: 'Invalid timestamp format' };
    if (date.getTime() > Date.now()) return { ok: false, error: 'Invalid timestamp format' };
    return { ok: true, value: date };
  }

  // ISO / general Date parse
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: 'Invalid timestamp format' };
  }
  if (parsed.getTime() > Date.now()) {
    return { ok: false, error: 'Invalid timestamp format' };
  }

  // Ensure UTC normalization
  const utc = new Date(parsed.toISOString());
  return { ok: true, value: utc };
}

function parseFiniteNumber(raw) {
  if (isEmpty(raw)) return { ok: false };
  const str = String(raw).trim();
  const num = Number(str);
  if (!Number.isFinite(num)) return { ok: false };
  return { ok: true, value: num, raw: str };
}

function validateAndNormalizeTradeRow(rawRow) {
  const raw_data = { ...rawRow };

  // timestamp
  const tsRes = parseTimestampToUtc(rawRow.timestamp);
  if (!tsRes.ok) {
    return { ok: false, reason: tsRes.error, raw_data };
  }

  // symbol
  if (isEmpty(rawRow.symbol)) {
    return { ok: false, reason: 'Symbol is required and must be <= 10 chars', raw_data };
  }
  let symbol = String(rawRow.symbol).trim();
  symbol = symbol.replace(/\s+/g, ' ');
  symbol = normalizeSymbol(symbol);
  if (!symbol || typeof symbol !== 'string' || symbol.length > MAX_SYMBOL_LENGTH) {
    return { ok: false, reason: 'Symbol is required and must be <= 10 chars', raw_data };
  }

  // side
  if (isEmpty(rawRow.side)) {
    return { ok: false, reason: "Side must be 'BUY' or 'SELL'", raw_data };
  }
  const side = String(rawRow.side).trim().toUpperCase();
  if (side !== 'BUY' && side !== 'SELL') {
    return { ok: false, reason: "Side must be 'BUY' or 'SELL'", raw_data };
  }

  // qty
  const qtyRes = parseFiniteNumber(rawRow.qty);
  if (!qtyRes.ok || qtyRes.value <= 0) {
    return { ok: false, reason: 'Quantity must be a positive number', raw_data };
  }

  // price
  const priceRes = parseFiniteNumber(rawRow.price);
  if (!priceRes.ok || priceRes.value <= 0) {
    return { ok: false, reason: 'Price must be a positive number', raw_data };
  }

  // fee (optional)
  let feeNum = 0;
  let feeRaw = '0';
  if (!isEmpty(rawRow.fee)) {
    const feeRes = parseFiniteNumber(rawRow.fee);
    if (!feeRes.ok || feeRes.value < 0) {
      return { ok: false, reason: 'Fee must be a non-negative number', raw_data };
    }
    feeNum = feeRes.value;
    feeRaw = feeRes.raw;
  }

  // exchange
  let exchange = 'CSV';
  if (!isEmpty(rawRow.exchange)) {
    exchange = String(rawRow.exchange).trim();
  }
  if (isEmpty(exchange) || exchange.length > MAX_EXCHANGE_LENGTH) {
    return { ok: false, reason: 'Exchange is required', raw_data };
  }

  return {
    ok: true,
    value: {
      timestamp: tsRes.value,
      symbol,
      side,
      quantity: qtyRes.value,
      quantityRaw: qtyRes.raw,
      price: priceRes.value,
      priceRaw: priceRes.raw,
      fee: feeNum,
      feeRaw,
      exchange,
    },
    raw_data,
  };
}

module.exports = {
  validateAndNormalizeTradeRow,
  parseTimestampToUtc,
  parseFiniteNumber,
  isEmpty,
};

/**
 * Equity Curve Calculation Service
 * 
 * Calculates daily portfolio equity curves from trade history and price data.
 * This is the foundation for all portfolio metrics (volatility, drawdown, PnL, etc.)
 */

const db = require('../db');
const priceService = require('./priceService');
const { isStablecoin } = require('../utils/priceSymbolMap');

// In-memory cache for equity curves
// Key: portfolio_id:start_date:end_date
// Value: { data, timestamp, ttl }
const equityCurveCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
const CACHE_MAX_SIZE = 100; // Max cached curves per instance

/**
 * Clean up expired cache entries
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of equityCurveCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      equityCurveCache.delete(key);
    }
  }
  
  // If still too many entries, remove oldest half
  if (equityCurveCache.size > CACHE_MAX_SIZE * 2) {
    const entries = Array.from(equityCurveCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < entries.length / 2; i++) {
      equityCurveCache.delete(entries[i][0]);
    }
  }
}

/**
 * Get cache key for a query
 */
function getCacheKey(portfolioId, startDate, endDate) {
  return `${portfolioId}:${startDate || 'first'}:${endDate || 'today'}`;
}

/**
 * Get cached equity curve
 */
function getCachedEquityCurve(portfolioId, startDate, endDate) {
  const key = getCacheKey(portfolioId, startDate, endDate);
  const entry = equityCurveCache.get(key);
  
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    console.log(`Cache HIT for equity curve: ${key}`);
    return entry.data;
  }
  
  console.log(`Cache MISS for equity curve: ${key}`);
  return null;
}

/**
 * Cache equity curve data
 */
function cacheEquityCurve(portfolioId, startDate, endDate, data) {
  const key = getCacheKey(portfolioId, startDate, endDate);
  
  cleanExpiredCache();
  
  equityCurveCache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log(`Cached equity curve: ${key}`);
}

/**
 * Invalidate cache for a portfolio
 */
function invalidatePortfolioCache(portfolioId) {
  for (const key of equityCurveCache.keys()) {
    if (key.startsWith(portfolioId)) {
      equityCurveCache.delete(key);
      console.log(`Invalidated cache: ${key}`);
    }
  }
}

/**
 * Get all trades for a portfolio sorted by timestamp
 * @param {string} portfolioId - Portfolio UUID
 * @returns {Promise<object[]>} Array of trade records
 */
async function getPortfolioTrades(portfolioId) {
  const result = await db.query(
    `SELECT id, portfolio_id, timestamp, symbol, side, quantity, price, fee, exchange
     FROM trades 
     WHERE portfolio_id = $1 
     ORDER BY timestamp ASC`,
    [portfolioId]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    portfolio_id: row.portfolio_id,
    timestamp: new Date(row.timestamp),
    symbol: row.symbol,
    side: row.side.toUpperCase(),
    quantity: parseFloat(row.quantity),
    price: parseFloat(row.price),
    fee: parseFloat(row.fee),
    exchange: row.exchange,
  }));
}

/**
 * Get portfolio metadata and first trade date
 * @param {string} portfolioId - Portfolio UUID
 * @returns {Promise<object|null>} Portfolio info or null
 */
async function getPortfolioInfo(portfolioId) {
  const result = await db.query(
    `SELECT p.id, p.name, p.user_id, p.created_at,
            (SELECT MIN(timestamp) FROM trades WHERE portfolio_id = p.id) as first_trade_date,
            (SELECT COUNT(*) FROM trades WHERE portfolio_id = p.id) as total_trades,
            (SELECT array_agg(DISTINCT symbol) FROM trades WHERE portfolio_id = p.id) as symbols
     FROM portfolios p 
     WHERE p.id = $1`,
    [portfolioId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    user_id: row.user_id,
    created_at: new Date(row.created_at),
    first_trade_date: row.first_trade_date ? new Date(row.first_trade_date) : null,
    total_trades: parseInt(row.total_trades) || 0,
    symbols: row.symbols || [],
  };
}

/**
 * Get all unique symbols from trades
 * @param {string} portfolioId - Portfolio UUID
 * @returns {Promise<string[]>} Array of unique symbols
 */
async function getPortfolioSymbols(portfolioId) {
  const result = await db.query(
    `SELECT DISTINCT symbol FROM trades WHERE portfolio_id = $1 ORDER BY symbol`,
    [portfolioId]
  );
  
  return result.rows.map(row => row.symbol);
}

/**
 * Fetch historical prices for multiple symbols in a date range
 * @param {string[]} symbols - Array of symbols
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Map>} Map of symbol -> date -> price
 */
async function fetchPricesForSymbols(symbols, startDate, endDate) {
  // Filter out stablecoins (price = 1.00)
  const cryptoSymbols = symbols.filter(s => !isStablecoin(s));
  
  if (cryptoSymbols.length === 0) {
    return new Map();
  }
  
  // Fetch prices for all crypto symbols in one query
  const result = await db.query(
    `SELECT symbol, timestamp, close
     FROM prices 
     WHERE symbol = ANY($1)
       AND timestamp >= $2::timestamp 
       AND timestamp <= ($3::timestamp + interval '1 day')
     ORDER BY symbol, timestamp ASC`,
    [cryptoSymbols, startDate, endDate]
  );
  
  // Organize by symbol, then by date
  const priceMap = new Map();
  
  for (const row of result.rows) {
    const symbol = row.symbol;
    const dateKey = new Date(row.timestamp).toISOString().split('T')[0];
    const price = parseFloat(row.close);
    
    if (!priceMap.has(symbol)) {
      priceMap.set(symbol, new Map());
    }
    priceMap.get(symbol).set(dateKey, price);
  }
  
  return priceMap;
}

/**
 * Get date range between two dates (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string[]} Array of date strings (YYYY-MM-DD)
 */
function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
}

/**
 * Get the most recent price for a symbol before or on a given date
 * @param {Map} priceMap - Symbol -> date -> price map
 * @param {string} symbol - Symbol to get price for
 * @param {string} targetDate - Target date (YYYY-MM-DD)
 * @param {number} defaultPrice - Default price if no data found
 * @returns {number} Price value
 */
function getPriceForDate(priceMap, symbol, targetDate, defaultPrice = 0) {
  // Check if stablecoin
  if (isStablecoin(symbol)) {
    return 1.0;
  }
  
  if (!priceMap.has(symbol)) {
    return defaultPrice;
  }
  
  const symbolPrices = priceMap.get(symbol);
  
  // Try exact date first
  if (symbolPrices.has(targetDate)) {
    return symbolPrices.get(targetDate);
  }
  
  // Find most recent prior date
  const dates = Array.from(symbolPrices.keys()).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= targetDate) {
      return symbolPrices.get(dates[i]);
    }
  }
  
  return defaultPrice;
}

/**
 * Calculate daily equity curve for a portfolio
 * @param {string} portfolioId - Portfolio UUID
 * @param {object} options - Calculation options
 * @param {string} [options.startDate] - Start date (YYYY-MM-DD)
 * @param {string} [options.endDate] - End date (YYYY-MM-DD)
 * @param {boolean} [options.skipCache] - Skip cache lookup (default: false)
 * @returns {Promise<object>} Equity curve result
 */
async function calculateEquityCurve(portfolioId, options = {}) {
  const { startDate: startDateStr, endDate: endDateStr, skipCache = false } = options;
  
  // Check cache first (unless skipping)
  if (!skipCache) {
    const cached = getCachedEquityCurve(portfolioId, startDateStr, endDateStr);
    if (cached) {
      return {
        success: true,
        portfolio_id: portfolioId,
        data: cached.data,
        metadata: {
          ...cached.metadata,
          cached: true,
          cached_at: new Date(cached.timestamp).toISOString(),
        },
      };
    }
  }
  
  // Get portfolio info
  const portfolioInfo = await getPortfolioInfo(portfolioId);
  if (!portfolioInfo) {
    return {
      success: false,
      error: 'Portfolio not found',
      statusCode: 404,
    };
  }
  
  // Get trades
  const trades = await getPortfolioTrades(portfolioId);
  
  // Get all unique symbols
  const symbols = await getPortfolioSymbols(portfolioId);
  
  // Determine date range
  let startDate, endDate;
  
  if (portfolioInfo.total_trades === 0) {
    // No trades - return empty curve
    return {
      success: true,
      portfolio_id: portfolioId,
      data: [],
      metadata: {
        first_trade_date: null,
        last_updated: new Date().toISOString(),
        total_trades: 0,
        symbols: [],
        note: 'Portfolio has no trades',
      },
    };
  }
  
  // Parse dates
  if (startDateStr) {
    const [year, month, day] = startDateStr.split('-').map(Number);
    startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    startDate = new Date(portfolioInfo.first_trade_date);
    startDate.setUTCHours(0, 0, 0, 0);
  }
  
  if (endDateStr) {
    const [year, month, day] = endDateStr.split('-').map(Number);
    endDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  } else {
    endDate = new Date();
    endDate.setUTCHours(0, 0, 0, 0);
  }
  
  // Ensure start date is not after end date
  if (startDate > endDate) {
    return {
      success: false,
      error: 'Start date must be before or equal to end date',
      statusCode: 400,
    };
  }
  
  // Fetch prices for all symbols
  const priceMap = await fetchPricesForSymbols(symbols, startDate, endDate);
  
  // Get all dates in range
  const dates = getDateRange(startDate, endDate);
  
  // Initialize holdings map
  const holdings = new Map();
  for (const symbol of symbols) {
    holdings.set(symbol, 0);
  }
  
  // Track trade index for efficiency
  let tradeIndex = 0;
  
  // Calculate equity for each day
  const curve = [];
  const warnings = [];
  
  for (const dateStr of dates) {
    const dateObj = new Date(dateStr);
    
    // Apply trades that occurred on or before this date
    while (tradeIndex < trades.length) {
      const trade = trades[tradeIndex];
      
      // Compare dates (ignore time)
      const tradeDate = new Date(trade.timestamp);
      tradeDate.setUTCHours(0, 0, 0, 0);
      
      if (tradeDate <= dateObj) {
        const currentQty = holdings.get(trade.symbol) || 0;
        const quantity = trade.side === 'BUY' ? trade.quantity : -trade.quantity;
        holdings.set(trade.symbol, currentQty + quantity);
        tradeIndex++;
      } else {
        break;
      }
    }
    
    // Calculate total value for this day
    let totalValue = 0;
    const breakdown = {};
    
    for (const symbol of symbols) {
      const qty = holdings.get(symbol) || 0;
      
      // Skip if no holdings
      if (qty === 0) {
        breakdown[symbol] = {
          holdings: 0,
          price: isStablecoin(symbol) ? 1.0 : 0,
          value: 0,
        };
        continue;
      }
      
      // Get price for this date
      const price = getPriceForDate(priceMap, symbol, dateStr, 0);
      
      // Warn if no price found for a crypto with holdings
      if (!isStablecoin(symbol) && price === 0 && qty !== 0) {
        warnings.push(`No price data for ${symbol} on ${dateStr}`);
      }
      
      const value = qty * price;
      totalValue += value;
      
      breakdown[symbol] = {
        holdings: parseFloat(qty.toFixed(8)),
        price: parseFloat(price.toFixed(2)),
        value: parseFloat(value.toFixed(2)),
      };
    }
    
    curve.push({
      date: new Date(dateStr).toISOString(),
      total_value: parseFloat(totalValue.toFixed(2)),
      timestamp: new Date(dateStr).getTime(),
      breakdown,
    });
  }
  
  const result = {
    success: true,
    portfolio_id: portfolioId,
    data: curve,
    metadata: {
      first_trade_date: portfolioInfo.first_trade_date?.toISOString() || null,
      last_updated: new Date().toISOString(),
      total_trades: portfolioInfo.total_trades,
      symbols: symbols.filter(s => !isStablecoin(s) || holdings.get(s) !== 0),
      calculation_warnings: warnings.length > 0 ? warnings : undefined,
    },
  };
  
  // Cache the result for full-range queries
  if (!startDateStr && !endDateStr) {
    cacheEquityCurve(portfolioId, startDateStr, endDateStr, curve);
  }
  
  return result;
}

/**
 * Get equity curve summary statistics
 * @param {object[]} curve - Equity curve data
 * @returns {object} Summary statistics
 */
function calculateEquityStats(curve) {
  if (curve.length === 0) {
    return {
      total_return: 0,
      total_return_percent: 0,
      max_value: 0,
      min_value: 0,
      avg_value: 0,
      max_drawdown: 0,
      volatility_30d: 0,
    };
  }
  
  const values = curve.map(d => d.total_value);
  const startValue = values[0];
  const endValue = values[values.length - 1];
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Calculate total return
  const totalReturn = endValue - startValue;
  const totalReturnPercent = startValue > 0 ? (totalReturn / startValue) * 100 : 0;
  
  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = peak > 0 ? (peak - value) / peak : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return {
    total_return: parseFloat(totalReturn.toFixed(2)),
    total_return_percent: parseFloat(totalReturnPercent.toFixed(2)),
    max_value: parseFloat(maxValue.toFixed(2)),
    min_value: parseFloat(minValue.toFixed(2)),
    avg_value: parseFloat(avgValue.toFixed(2)),
    max_drawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
  };
}

module.exports = {
  getPortfolioTrades,
  getPortfolioInfo,
  getPortfolioSymbols,
  fetchPricesForSymbols,
  calculateEquityCurve,
  calculateEquityStats,
  getDateRange,
  getPriceForDate,
  invalidatePortfolioCache,
  CACHE_TTL_MS,
};

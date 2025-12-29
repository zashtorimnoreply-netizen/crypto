const ccxt = require('ccxt');
const db = require('../db');
const { redisClient } = require('../redis');
const { getCoingeckoId, getBybitPair, isStablecoin } = require('../utils/priceSymbolMap');
const { normalizeSymbol } = require('../utils/symbolNormalizer');

const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3';
const PRICE_CACHE_TTL = parseInt(process.env.PRICE_CACHE_TTL) || 900; // 15 minutes default (increased from 5 min)
const STABLE_CACHE_TTL = 3600; // 1 hour for stablecoins

// Cache statistics
const priceCacheStats = {
  hits: 0,
  misses: 0,
};

/**
 * Get price cache statistics
 */
function getPriceCacheStats() {
  const total = priceCacheStats.hits + priceCacheStats.misses;
  const hitRate = total > 0 ? (priceCacheStats.hits / total) * 100 : 0;
  return {
    hits: priceCacheStats.hits,
    misses: priceCacheStats.misses,
    hitRate: hitRate.toFixed(2) + '%',
  };
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const RATE_LIMIT_DELAY_MS = 100;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sleep with configurable delay for rate limiting
 */
async function rateLimitDelay() {
  await sleep(RATE_LIMIT_DELAY_MS);
}

/**
 * Fetch with exponential backoff and retry
 * @param {Function} fn - Async function to execute
 * @param {number} retries - Number of retries remaining
 * @returns {any} Result of the function
 */
async function fetchWithRetry(fn, retries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check for rate limit error (429)
      if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`Rate limit hit, backing off for ${backoffMs}ms (attempt ${attempt + 1}/${retries + 1})`);
        await sleep(backoffMs);
        continue;
      }
      
      // Check for network timeout or temporary errors
      if (error.message && (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNRESET') || error.message.includes('timeout'))) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`Network error, backing off for ${backoffMs}ms (attempt ${attempt + 1}/${retries + 1})`);
        await sleep(backoffMs);
        continue;
      }
      
      // If it's not a retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Get cached price from Redis with statistics tracking
 * @param {string} symbol - Normalized symbol
 * @returns {object|null} Cached price data or null
 */
async function getCachedPrice(symbol) {
  try {
    const key = `price:${symbol.toUpperCase()}`;
    const cached = await redisClient.get(key);
    if (cached) {
      priceCacheStats.hits++;
      console.log(`Price cache HIT for ${symbol}`);
      return JSON.parse(cached);
    }
    priceCacheStats.misses++;
    console.log(`Price cache MISS for ${symbol}`);
    return null;
  } catch (error) {
    console.error('Redis cache error:', error.message);
    priceCacheStats.misses++;
    return null;
  }
}

/**
 * Cache price in Redis with appropriate TTL
 * @param {string} symbol - Normalized symbol
 * @param {number} price - Price value
 * @param {Date} timestamp - Price timestamp
 */
async function cachePrice(symbol, price, timestamp) {
  try {
    const key = `price:${symbol.toUpperCase()}`;
    const ttl = isStablecoin(symbol) ? STABLE_CACHE_TTL : PRICE_CACHE_TTL;
    const value = JSON.stringify({
      price,
      timestamp: timestamp.toISOString(),
    });
    await redisClient.setEx(key, ttl, value);
    console.log(`Cached ${symbol} = ${price} (TTL: ${ttl}s)`);
  } catch (error) {
    console.error('Redis cache error:', error.message);
  }
}

/**
 * Fetch spot price from Bybit via CCXT
 * @param {string} symbol - Display symbol
 * @returns {object} Price data {price, timestamp}
 */
async function fetchFromBybit(symbol) {
  const pair = getBybitPair(symbol);
  if (!pair) {
    throw new Error(`No Bybit pair for symbol: ${symbol}`);
  }

  const exchange = new ccxt.bybit({
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
    },
  });

  return await fetchWithRetry(async () => {
    const ticker = await exchange.fetchTicker(pair);
    return {
      price: ticker.last || ticker.close,
      timestamp: new Date(ticker.timestamp),
    };
  });
}

/**
 * Fetch spot price from CoinGecko
 * @param {string} symbol - Display symbol
 * @returns {object} Price data {price, timestamp}
 */
async function fetchFromCoingecko(symbol) {
  const coingeckoId = getCoingeckoId(symbol);
  if (!coingeckoId) {
    throw new Error(`No CoinGecko ID for symbol: ${symbol}`);
  }

  const url = `${COINGECKO_API_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=false`;
  
  return await fetchWithRetry(async () => {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited by CoinGecko');
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data[coingeckoId] || typeof data[coingeckoId].usd !== 'number') {
      throw new Error(`Invalid CoinGecko response for ${symbol}`);
    }

    return {
      price: data[coingeckoId].usd,
      timestamp: new Date(),
    };
  });
}

/**
 * Fetch spot price with fallback
 * @param {string} symbol - Display symbol
 * @returns {object} Price data {price, timestamp}
 */
async function fetchSpotPrice(symbol) {
  // Handle stablecoins
  if (isStablecoin(symbol)) {
    return {
      price: 1.0,
      timestamp: new Date(),
    };
  }

  // Try Bybit first
  try {
    return await fetchFromBybit(symbol);
  } catch (bybitError) {
    console.warn(`Bybit fetch failed for ${symbol}: ${bybitError.message}`);
    
    // Fallback to CoinGecko
    try {
      return await fetchFromCoingecko(symbol);
    } catch (coingeckoError) {
      console.warn(`CoinGecko fetch failed for ${symbol}: ${coingeckoError.message}`);
      throw new Error(`Failed to fetch price for ${symbol} from all sources`);
    }
  }
}

/**
 * Get current spot price with caching
 * @param {string} symbol - Display symbol
 * @returns {object} Price data {symbol, price, timestamp}
 */
async function getCurrentPrice(symbol) {
  const normalized = normalizeSymbol(symbol);
  
  // Check cache first
  const cached = await getCachedPrice(normalized);
  if (cached) {
    return {
      symbol: normalized,
      price: cached.price,
      timestamp: cached.timestamp,
    };
  }

  // Fetch from API
  const priceData = await fetchSpotPrice(normalized);
  
  // Cache the result
  await cachePrice(normalized, priceData.price, priceData.timestamp);
  
  return {
    symbol: normalized,
    price: priceData.price,
    timestamp: priceData.timestamp.toISOString(),
  };
}

/**
 * Get multiple current prices
 * @param {string[]} symbols - Array of symbols
 * @returns {object[]} Array of price data
 */
async function getCurrentPrices(symbols) {
  const normalizedSymbols = [...new Set(symbols.map(s => normalizeSymbol(s)))];
  
  // Fetch all prices (caching is handled internally)
  const prices = await Promise.all(
    normalizedSymbols.map(symbol => getCurrentPrice(symbol))
  );
  
  return prices;
}

/**
 * Check if symbol is valid/known
 * @param {string} symbol - Symbol to validate
 * @returns {boolean} True if valid
 */
function isValidSymbol(symbol) {
  const normalized = normalizeSymbol(symbol);
  // Check if it's a stablecoin or known symbol
  if (isStablecoin(normalized)) {
    return true;
  }
  return getCoingeckoId(normalized) !== null || getBybitPair(normalized) !== null;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string
 * @returns {boolean} True if valid
 */
function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Parse date string to Date object
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {Date} Parsed date
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get dates in range as array
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {string[]} Array of date strings (YYYY-MM-DD)
 */
function getDatesInRange(start, end) {
  const dates = [];
  const current = new Date(start);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    dates.push(dateStr);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
}

/**
 * Fetch historical data from CoinGecko market chart
 * @param {string} symbol - Display symbol
 * @param {number} days - Number of days to fetch
 * @returns {object[]} Array of price points {timestamp, price}
 */
async function fetchHistoricalFromCoingecko(symbol, days = 365) {
  const coingeckoId = getCoingeckoId(symbol);
  if (!coingeckoId) {
    throw new Error(`No CoinGecko ID for symbol: ${symbol}`);
  }

  const url = `${COINGECKO_API_URL}/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by CoinGecko');
    }
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.prices || !Array.isArray(data.prices)) {
    throw new Error('Invalid CoinGecko response format');
  }

  return data.prices.map(([timestamp, price]) => ({
    timestamp: new Date(timestamp),
    price,
  }));
}

/**
 * Query historical prices from database
 * @param {string} symbol - Display symbol
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object[]} Array of price records
 */
async function queryHistoricalFromDb(symbol, startDate, endDate) {
  const normalized = normalizeSymbol(symbol);
  
  const result = await db.query(
    `SELECT symbol, timestamp, open, high, low, close, volume
     FROM prices 
     WHERE symbol = $1 
       AND timestamp >= $2::timestamp 
       AND timestamp < ($3::timestamp + interval '1 day')
     ORDER BY timestamp ASC`,
    [normalized, startDate, endDate]
  );
  
  return result.rows.map(row => ({
    timestamp: new Date(row.timestamp),
    open: parseFloat(row.open) || parseFloat(row.close),
    high: parseFloat(row.high) || parseFloat(row.close),
    low: parseFloat(row.low) || parseFloat(row.close),
    close: parseFloat(row.close),
    volume: parseFloat(row.volume) || 0,
  }));
}

/**
 * Insert historical price into database
 * @param {string} symbol - Display symbol
 * @param {Date} timestamp - Price timestamp
 * @param {number} open - Opening price
 * @param {number} high - High price
 * @param {number} low - Low price
 * @param {number} close - Closing price
 * @param {number} volume - Trading volume
 */
async function insertHistoricalPrice(symbol, timestamp, open, high, low, close, volume = 0) {
  const normalized = normalizeSymbol(symbol);
  
  await db.query(
    `INSERT INTO prices (symbol, timestamp, open, high, low, close, volume)
     VALUES ($1, $2::timestamp, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol, timestamp) DO NOTHING`,
    [normalized, timestamp, open, high, low, close, volume]
  );
}

/**
 * Batch insert historical prices for performance
 * @param {string} symbol - Display symbol
 * @param {object[]} pricePoints - Array of {timestamp, open, high, low, close, volume}
 */
async function batchInsertHistoricalPrices(symbol, pricePoints) {
  if (pricePoints.length === 0) {
    return 0;
  }

  const normalized = normalizeSymbol(symbol);
  
  // Build batch insert query
  const values = pricePoints.map((point, i) => {
    const offset = i * 7;
    return `(${offset + 1}, ${offset + 2}::timestamp, ${offset + 3}, ${offset + 4}, ${offset + 5}, ${offset + 6}, ${offset + 7})`;
  }).join(', ');
  
  const params = pricePoints.flatMap(point => [
    normalized,
    point.timestamp,
    point.open || point.close,
    point.high || point.close,
    point.low || point.close,
    point.close,
    point.volume || 0,
  ]);

  const result = await db.query(
    `INSERT INTO prices (symbol, timestamp, open, high, low, close, volume)
     VALUES ${values}
     ON CONFLICT (symbol, timestamp) DO NOTHING`,
    params
  );
  
  return result.rowCount;
}

/**
 * Get historical prices with database caching
 * @param {string} symbol - Display symbol
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object[]} Array of OHLCV-like data
 */
async function getHistoricalPrices(symbol, startDate, endDate) {
  const normalized = normalizeSymbol(symbol);
  
  // Query database for existing prices
  const dbPrices = await queryHistoricalFromDb(normalized, startDate, endDate);
  
  // Convert to map for easy lookup
  const priceMap = new Map();
  for (const p of dbPrices) {
    const dateKey = p.timestamp.toISOString().split('T')[0];
    priceMap.set(dateKey, p);
  }
  
  // Find dates that are missing from DB
  const datesInRange = getDatesInRange(startDate, endDate);
  const missingDates = datesInRange.filter(date => !priceMap.has(date));
  
  // Fetch missing dates from CoinGecko if any
  if (missingDates.length > 0) {
    console.log(`Fetching ${missingDates.length} missing dates for ${symbol} from CoinGecko`);
    
    try {
      // Calculate days needed (add buffer for safety)
      const daysNeeded = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 5;
      
      const fetchedPrices = await fetchHistoricalFromCoingecko(normalized, Math.min(daysNeeded, 365));
      
      // Create map of fetched prices by date
      const fetchedMap = new Map();
      for (const p of fetchedPrices) {
        const dateKey = p.timestamp.toISOString().split('T')[0];
        fetchedMap.set(dateKey, p);
      }
      
      // Collect prices that are in the requested range and needed
      const pricesToInsert = [];
      for (const date of datesInRange) {
        if (fetchedMap.has(date)) {
          priceMap.set(date, fetchedMap.get(date));
          pricesToInsert.push(fetchedMap.get(date));
        }
      }
      
      // Batch insert fetched prices
      if (pricesToInsert.length > 0) {
        await batchInsertHistoricalPrices(normalized, pricesToInsert);
        console.log(`Inserted ${pricesToInsert.length} prices for ${symbol}`);
      }
      
    } catch (error) {
      console.warn(`Failed to fetch historical prices for ${symbol}: ${error.message}`);
    }
  }
  
  // Build final result sorted by date
  const result = [];
  for (const date of datesInRange) {
    if (priceMap.has(date)) {
      const priceData = priceMap.get(date);
      result.push({
        timestamp: priceData.timestamp.toISOString(),
        open: priceData.open,
        high: priceData.high,
        low: priceData.low,
        close: priceData.close,
        volume: priceData.volume,
      });
    }
    // Note: We don't include dates without data (no interpolation)
  }
  
  return result;
}

module.exports = {
  getCurrentPrice,
  getCurrentPrices,
  getHistoricalPrices,
  isValidSymbol,
  isValidDateFormat,
  parseDate,
  getDatesInRange,
  fetchSpotPrice,
  fetchHistoricalFromCoingecko,
  queryHistoricalFromDb,
  insertHistoricalPrice,
  batchInsertHistoricalPrices,
  fetchWithRetry,
  sleep,
  rateLimitDelay,
  getPriceCacheStats,
  PRICE_CACHE_TTL,
  STABLE_CACHE_TTL,
  MAX_RETRIES,
  INITIAL_BACKOFF_MS,
};

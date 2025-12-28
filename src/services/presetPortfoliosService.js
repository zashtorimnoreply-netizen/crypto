/**
 * Preset Portfolios Service
 * 
 * Generates historical performance for preset portfolio allocations:
 * 1. BTC 100% - 100% Bitcoin allocation
 * 2. BTC/ETH 70/30 - 70% Bitcoin, 30% Ethereum with daily rebalancing
 */

const priceService = require('./priceService');
const { redisClient } = require('../redis');
const { normalizeSymbol } = require('../utils/symbolNormalizer');

const CACHE_TTL_SECONDS = 3600; // 1 hour cache
const INITIAL_CAPITAL = 10000; // $10,000 starting capital

// Preset definitions
const PRESETS = {
  BTC_100: {
    name: 'BTC 100%',
    description: '100% Bitcoin allocation',
    assets: [
      { symbol: 'BTC', percent: 100 },
    ],
    rebalance: false,
  },
  BTC_70_ETH_30: {
    name: 'BTC/ETH 70/30',
    description: '70% Bitcoin, 30% Ethereum with daily rebalancing',
    assets: [
      { symbol: 'BTC', percent: 70 },
      { symbol: 'ETH', percent: 30 },
    ],
    rebalance: true,
  },
};

/**
 * Parse date string to Date object in UTC
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {Date} Parsed date
 */
function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get all dates in range
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
 * Get price for a specific date from historical data
 * @param {object[]} historicalPrices - Array of historical price data
 * @param {string} targetDate - Target date (YYYY-MM-DD)
 * @returns {number|null} Price or null if not found
 */
function getPriceForDate(historicalPrices, targetDate) {
  // Build a map for quick lookup
  const priceMap = new Map();
  for (const p of historicalPrices) {
    const dateKey = p.timestamp.split('T')[0];
    priceMap.set(dateKey, p.close);
  }
  
  // Try exact date first
  if (priceMap.has(targetDate)) {
    return priceMap.get(targetDate);
  }
  
  // Find nearest previous date
  const dates = Array.from(priceMap.keys()).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] < targetDate) {
      return priceMap.get(dates[i]);
    }
  }
  
  return null;
}

/**
 * Calculate annualized volatility from daily returns
 * @param {number[]} dailyReturns - Array of daily returns
 * @returns {number} Annualized volatility as percentage
 */
function calculateVolatility(dailyReturns) {
  if (dailyReturns.length < 2) {
    return 0;
  }
  
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / dailyReturns.length;
  const dailyVol = Math.sqrt(variance);
  
  // Annualize: multiply by sqrt(365)
  return dailyVol * Math.sqrt(365) * 100;
}

/**
 * Calculate maximum drawdown
 * @param {number[]} values - Array of portfolio values
 * @returns {number} Max drawdown as percentage
 */
function calculateMaxDrawdown(values) {
  if (values.length === 0) {
    return 0;
  }
  
  let maxDrawdown = 0;
  let peak = values[0];
  
  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * @param {number} startValue - Starting value
 * @param {number} endValue - Ending value
 * @param {number} years - Number of years
 * @returns {number} CAGR as percentage
 */
function calculateCAGR(startValue, endValue, years) {
  if (startValue <= 0 || years <= 0) {
    return 0;
  }
  
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

/**
 * Calculate daily returns from values
 * @param {number[]} values - Array of values
 * @returns {number[]} Array of daily returns
 */
function calculateDailyReturns(values) {
  const returns = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] > 0) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
  }
  return returns;
}

/**
 * Calculate preset portfolio daily equity curve
 * @param {string} presetName - Preset identifier
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<object[]>} Daily portfolio data
 */
async function getPresetDaily(presetName, startDate, endDate) {
  const preset = PRESETS[presetName];
  
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  
  // Fetch historical prices for all assets in the preset
  const pricePromises = preset.assets.map(asset => {
    const normalizedSymbol = normalizeSymbol(asset.symbol);
    return priceService.getHistoricalPrices(normalizedSymbol, startDate, endDate);
  });
  
  const allPrices = await Promise.all(pricePromises);
  
  // Validate we have data for all assets
  for (let i = 0; i < preset.assets.length; i++) {
    if (allPrices[i].length === 0) {
      throw new Error(`No historical price data found for ${preset.assets[i].symbol}`);
    }
  }
  
  // Get all dates in range
  const allDates = getDatesInRange(startDate, endDate);
  
  // Get initial prices (first available)
  const initialPrices = preset.assets.map((asset, i) => {
    return getPriceForDate(allPrices[i], allDates[0]);
  });
  
  // Validate initial prices exist
  for (let i = 0; i < initialPrices.length; i++) {
    if (initialPrices[i] === null) {
      throw new Error(`No price data available at start date for ${preset.assets[i].symbol}`);
    }
  }
  
  // Initialize holdings based on allocation
  const holdings = preset.assets.map((asset, i) => {
    const allocation = INITIAL_CAPITAL * (asset.percent / 100);
    return allocation / initialPrices[i];
  });
  
  // Calculate daily values
  const dailyData = [];
  
  for (const dateStr of allDates) {
    // Get current prices
    const currentPrices = preset.assets.map((asset, i) => {
      return getPriceForDate(allPrices[i], dateStr);
    });
    
    // Calculate values for each asset
    const assetValues = preset.assets.map((asset, i) => {
      if (currentPrices[i] === null) {
        return 0;
      }
      return holdings[i] * currentPrices[i];
    });
    
    const totalValue = assetValues.reduce((sum, val) => sum + val, 0);
    
    // Rebalance if enabled (adjust holdings to maintain target percentages)
    if (preset.rebalance && totalValue > 0) {
      for (let i = 0; i < preset.assets.length; i++) {
        const targetValue = totalValue * (preset.assets[i].percent / 100);
        if (currentPrices[i] !== null && currentPrices[i] > 0) {
          holdings[i] = targetValue / currentPrices[i];
        }
      }
    }
    
    // Build daily record
    const dailyRecord = {
      date: dateStr,
      totalValue,
    };
    
    // Add asset-specific data
    preset.assets.forEach((asset, i) => {
      const symbol = asset.symbol.toLowerCase();
      dailyRecord[`${symbol}Value`] = assetValues[i];
      dailyRecord[`${symbol}Holdings`] = holdings[i];
      dailyRecord[`${symbol}Price`] = currentPrices[i] || 0;
    });
    
    dailyData.push(dailyRecord);
  }
  
  return dailyData;
}

/**
 * Calculate metrics from preset daily data
 * @param {object[]} dailyData - Daily preset data
 * @param {number} initialCapital - Initial capital
 * @returns {object} Calculated metrics
 */
function calculatePresetMetrics(dailyData, initialCapital = INITIAL_CAPITAL) {
  if (dailyData.length === 0) {
    return {
      totalValue: 0,
      pnl: { value: 0, percent: 0 },
      maxDrawdown: 0,
      volatility: 0,
      cagr: 0,
    };
  }
  
  const lastDay = dailyData[dailyData.length - 1];
  const totalValue = lastDay.totalValue;
  
  const pnlValue = totalValue - initialCapital;
  const pnlPercent = initialCapital > 0 ? (pnlValue / initialCapital) * 100 : 0;
  
  // Extract values for metrics
  const values = dailyData.map(d => d.totalValue);
  const dailyReturns = calculateDailyReturns(values);
  
  const maxDrawdown = calculateMaxDrawdown(values);
  const volatility = calculateVolatility(dailyReturns);
  
  // Calculate years for CAGR
  const years = dailyData.length / 365;
  const cagr = calculateCAGR(initialCapital, totalValue, years);
  
  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    pnl: {
      value: parseFloat(pnlValue.toFixed(2)),
      percent: parseFloat(pnlPercent.toFixed(2)),
    },
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    cagr: parseFloat(cagr.toFixed(2)),
  };
}

/**
 * Calculate preset portfolio performance
 * @param {string} presetName - Preset identifier
 * @param {string} startDateStr - Start date (YYYY-MM-DD)
 * @param {string} endDateStr - End date (YYYY-MM-DD)
 * @returns {Promise<object>} Preset performance results
 */
async function calculatePreset(presetName, startDateStr, endDateStr) {
  const preset = PRESETS[presetName];
  
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }
  
  // Parse dates
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  
  // Validate dates
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }
  
  // Get daily data
  const dailyData = await getPresetDaily(presetName, startDate, endDate);
  
  // Calculate metrics
  const metrics = calculatePresetMetrics(dailyData, INITIAL_CAPITAL);
  
  // Build allocation breakdown (from last day)
  const lastDay = dailyData[dailyData.length - 1];
  const allocation = {};
  
  preset.assets.forEach(asset => {
    const symbol = asset.symbol;
    const symbolLower = symbol.toLowerCase();
    allocation[symbol] = {
      percent: asset.percent,
      value: parseFloat((lastDay[`${symbolLower}Value`] || 0).toFixed(2)),
      holdings: parseFloat((lastDay[`${symbolLower}Holdings`] || 0).toFixed(8)),
    };
  });
  
  return {
    preset: presetName,
    name: preset.name,
    description: preset.description,
    period: {
      startDate: startDateStr,
      endDate: endDateStr,
    },
    initialCapital: INITIAL_CAPITAL,
    results: metrics,
    allocation,
    dailyData,
  };
}

/**
 * Get cached preset
 * @param {string} cacheKey - Cache key
 * @returns {Promise<object|null>} Cached data or null
 */
async function getCachedPreset(cacheKey) {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Preset Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }
    console.log(`Preset Cache MISS: ${cacheKey}`);
  } catch (error) {
    console.error('Redis cache read error:', error);
  }
  
  return null;
}

/**
 * Cache preset
 * @param {string} cacheKey - Cache key
 * @param {object} data - Data to cache
 */
async function cachePreset(cacheKey, data) {
  if (!redisClient || !redisClient.isOpen) {
    return;
  }
  
  try {
    await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
    console.log(`Preset Cache SET: ${cacheKey}`);
  } catch (error) {
    console.error('Redis cache write error:', error);
  }
}

/**
 * Invalidate preset cache
 * @param {string} pattern - Cache key pattern
 */
async function invalidatePresetCache(pattern = 'preset:*') {
  if (!redisClient || !redisClient.isOpen) {
    return;
  }
  
  try {
    let cursor = '0';
    let deletedCount = 0;
    
    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      const keys = result.keys;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');
    
    console.log(`Invalidated ${deletedCount} preset cache keys`);
  } catch (error) {
    console.error('Error invalidating preset cache:', error);
  }
}

/**
 * Get all preset portfolios performance
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<object[]>} Array of preset results
 */
async function getAllPresets(startDate, endDate) {
  const presetNames = Object.keys(PRESETS);
  
  const results = await Promise.all(
    presetNames.map(async (presetName) => {
      const cacheKey = `preset:${presetName}:${startDate}:${endDate}`;
      
      // Check cache
      const cached = await getCachedPreset(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Calculate preset
      const result = await calculatePreset(presetName, startDate, endDate);
      
      // Cache result
      await cachePreset(cacheKey, result);
      
      return result;
    })
  );
  
  return results;
}

/**
 * Get single preset portfolio performance with caching
 * @param {string} presetName - Preset identifier
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<object>} Preset results
 */
async function getPreset(presetName, startDate, endDate) {
  const cacheKey = `preset:${presetName}:${startDate}:${endDate}`;
  
  // Check cache
  const cached = await getCachedPreset(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Calculate preset
  const result = await calculatePreset(presetName, startDate, endDate);
  
  // Cache result
  await cachePreset(cacheKey, result);
  
  return result;
}

module.exports = {
  getAllPresets,
  getPreset,
  calculatePreset,
  getPresetDaily,
  calculatePresetMetrics,
  getCachedPreset,
  cachePreset,
  invalidatePresetCache,
  PRESETS,
  INITIAL_CAPITAL,
};

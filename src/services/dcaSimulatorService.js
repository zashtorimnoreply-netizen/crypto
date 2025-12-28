/**
 * DCA (Dollar-Cost Averaging) Simulator Service
 * 
 * Calculates DCA strategy performance compared to buy-and-hold (HODL) strategy
 * for single assets or asset pairs with historical price data.
 */

const priceService = require('./priceService');
const { redisClient } = require('../redis');
const { isStablecoin } = require('../utils/priceSymbolMap');
const { normalizeSymbol } = require('../utils/symbolNormalizer');

const CACHE_TTL_SECONDS = 3600; // 1 hour cache
const COMMISSION_RATE = 0.001; // 0.1% commission

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
 * Get purchase dates based on interval
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} interval - Interval in days (e.g., 7 for weekly)
 * @returns {string[]} Array of purchase date strings (YYYY-MM-DD)
 */
function getPurchaseDates(startDate, endDate, interval) {
  const dates = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + interval);
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
 * Calculate DCA daily equity curve for single asset
 * @param {string} asset - Asset symbol
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} amount - Purchase amount in USD
 * @param {number} interval - Purchase interval in days
 * @returns {Promise<object[]>} Daily DCA data
 */
async function getDCADaily(asset, startDate, endDate, amount, interval) {
  const normalizedAsset = normalizeSymbol(asset);
  
  // Fetch historical prices
  const historicalPrices = await priceService.getHistoricalPrices(normalizedAsset, startDate, endDate);
  
  if (historicalPrices.length === 0) {
    throw new Error(`No historical price data found for ${asset}`);
  }
  
  // Get all dates in range
  const allDates = getDatesInRange(startDate, endDate);
  
  // Get purchase dates
  const purchaseDates = getPurchaseDates(startDate, endDate, interval);
  const purchaseDateSet = new Set(purchaseDates);
  
  // Track holdings and investment
  let totalHoldings = 0;
  let totalInvested = 0;
  const dailyData = [];
  
  for (const dateStr of allDates) {
    // Check if this is a purchase date
    if (purchaseDateSet.has(dateStr)) {
      const price = getPriceForDate(historicalPrices, dateStr);
      
      if (price !== null) {
        // Apply commission (reduce purchase amount)
        const afterCommission = amount * (1 - COMMISSION_RATE);
        const purchaseQty = afterCommission / price;
        
        totalHoldings += purchaseQty;
        totalInvested += amount;
      }
    }
    
    // Calculate current value
    const currentPrice = getPriceForDate(historicalPrices, dateStr);
    const currentValue = currentPrice !== null ? totalHoldings * currentPrice : 0;
    
    dailyData.push({
      date: dateStr,
      holdings: totalHoldings,
      invested: totalInvested,
      value: currentValue,
      price: currentPrice || 0,
    });
  }
  
  return dailyData;
}

/**
 * Calculate DCA daily equity curve for asset pair
 * @param {string} asset1 - First asset symbol (e.g., 'BTC')
 * @param {string} asset2 - Second asset symbol (e.g., 'ETH')
 * @param {number} ratio1 - First asset ratio (e.g., 70 for 70%)
 * @param {number} ratio2 - Second asset ratio (e.g., 30 for 30%)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} amount - Total purchase amount in USD
 * @param {number} interval - Purchase interval in days
 * @returns {Promise<object[]>} Daily DCA data with both assets
 */
async function getDCAPairDaily(asset1, asset2, ratio1, ratio2, startDate, endDate, amount, interval) {
  const normalizedAsset1 = normalizeSymbol(asset1);
  const normalizedAsset2 = normalizeSymbol(asset2);
  
  // Fetch historical prices for both assets
  const [prices1, prices2] = await Promise.all([
    priceService.getHistoricalPrices(normalizedAsset1, startDate, endDate),
    priceService.getHistoricalPrices(normalizedAsset2, startDate, endDate),
  ]);
  
  if (prices1.length === 0 || prices2.length === 0) {
    throw new Error(`No historical price data found for ${asset1} or ${asset2}`);
  }
  
  // Get all dates in range
  const allDates = getDatesInRange(startDate, endDate);
  
  // Get purchase dates
  const purchaseDates = getPurchaseDates(startDate, endDate, interval);
  const purchaseDateSet = new Set(purchaseDates);
  
  // Track holdings for both assets
  let holdings1 = 0;
  let holdings2 = 0;
  let totalInvested = 0;
  const dailyData = [];
  
  const percent1 = ratio1 / 100;
  const percent2 = ratio2 / 100;
  
  for (const dateStr of allDates) {
    // Check if this is a purchase date
    if (purchaseDateSet.has(dateStr)) {
      const price1 = getPriceForDate(prices1, dateStr);
      const price2 = getPriceForDate(prices2, dateStr);
      
      if (price1 !== null && price2 !== null) {
        // Split amount according to ratio
        const amount1 = amount * percent1;
        const amount2 = amount * percent2;
        
        // Apply commission to each
        const afterCommission1 = amount1 * (1 - COMMISSION_RATE);
        const afterCommission2 = amount2 * (1 - COMMISSION_RATE);
        
        // Purchase quantities
        holdings1 += afterCommission1 / price1;
        holdings2 += afterCommission2 / price2;
        
        totalInvested += amount;
      }
    }
    
    // Calculate current values
    const currentPrice1 = getPriceForDate(prices1, dateStr);
    const currentPrice2 = getPriceForDate(prices2, dateStr);
    
    const value1 = currentPrice1 !== null ? holdings1 * currentPrice1 : 0;
    const value2 = currentPrice2 !== null ? holdings2 * currentPrice2 : 0;
    const totalValue = value1 + value2;
    
    dailyData.push({
      date: dateStr,
      holdings1,
      holdings2,
      invested: totalInvested,
      value1,
      value2,
      totalValue,
      price1: currentPrice1 || 0,
      price2: currentPrice2 || 0,
    });
  }
  
  return dailyData;
}

/**
 * Calculate HODL (buy once at start) equity curve
 * @param {string} asset - Asset symbol
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} purchaseAmount - One-time purchase amount in USD
 * @returns {Promise<object[]>} Daily HODL data
 */
async function getHODLDaily(asset, startDate, endDate, purchaseAmount) {
  const normalizedAsset = normalizeSymbol(asset);
  
  // Fetch historical prices
  const historicalPrices = await priceService.getHistoricalPrices(normalizedAsset, startDate, endDate);
  
  if (historicalPrices.length === 0) {
    throw new Error(`No historical price data found for ${asset}`);
  }
  
  // Get all dates in range
  const allDates = getDatesInRange(startDate, endDate);
  
  // Get initial price (first available price)
  const initialPrice = getPriceForDate(historicalPrices, allDates[0]);
  
  if (initialPrice === null) {
    throw new Error(`No price data available at start date for ${asset}`);
  }
  
  // Apply commission and calculate holdings
  const afterCommission = purchaseAmount * (1 - COMMISSION_RATE);
  const holdings = afterCommission / initialPrice;
  
  // Calculate daily values
  const dailyData = [];
  
  for (const dateStr of allDates) {
    const currentPrice = getPriceForDate(historicalPrices, dateStr);
    const currentValue = currentPrice !== null ? holdings * currentPrice : 0;
    
    dailyData.push({
      date: dateStr,
      holdings,
      invested: purchaseAmount,
      value: currentValue,
      price: currentPrice || 0,
    });
  }
  
  return dailyData;
}

/**
 * Calculate HODL equity curve for asset pair
 * @param {string} asset1 - First asset symbol
 * @param {string} asset2 - Second asset symbol
 * @param {number} ratio1 - First asset ratio
 * @param {number} ratio2 - Second asset ratio
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {number} purchaseAmount - One-time purchase amount in USD
 * @returns {Promise<object[]>} Daily HODL data with both assets
 */
async function getHODLPairDaily(asset1, asset2, ratio1, ratio2, startDate, endDate, purchaseAmount) {
  const normalizedAsset1 = normalizeSymbol(asset1);
  const normalizedAsset2 = normalizeSymbol(asset2);
  
  // Fetch historical prices for both assets
  const [prices1, prices2] = await Promise.all([
    priceService.getHistoricalPrices(normalizedAsset1, startDate, endDate),
    priceService.getHistoricalPrices(normalizedAsset2, startDate, endDate),
  ]);
  
  if (prices1.length === 0 || prices2.length === 0) {
    throw new Error(`No historical price data found for ${asset1} or ${asset2}`);
  }
  
  // Get all dates in range
  const allDates = getDatesInRange(startDate, endDate);
  
  // Get initial prices
  const initialPrice1 = getPriceForDate(prices1, allDates[0]);
  const initialPrice2 = getPriceForDate(prices2, allDates[0]);
  
  if (initialPrice1 === null || initialPrice2 === null) {
    throw new Error(`No price data available at start date for ${asset1} or ${asset2}`);
  }
  
  // Split amount according to ratio
  const percent1 = ratio1 / 100;
  const percent2 = ratio2 / 100;
  const amount1 = purchaseAmount * percent1;
  const amount2 = purchaseAmount * percent2;
  
  // Apply commission and calculate holdings
  const afterCommission1 = amount1 * (1 - COMMISSION_RATE);
  const afterCommission2 = amount2 * (1 - COMMISSION_RATE);
  const holdings1 = afterCommission1 / initialPrice1;
  const holdings2 = afterCommission2 / initialPrice2;
  
  // Calculate daily values
  const dailyData = [];
  
  for (const dateStr of allDates) {
    const currentPrice1 = getPriceForDate(prices1, dateStr);
    const currentPrice2 = getPriceForDate(prices2, dateStr);
    
    const value1 = currentPrice1 !== null ? holdings1 * currentPrice1 : 0;
    const value2 = currentPrice2 !== null ? holdings2 * currentPrice2 : 0;
    const totalValue = value1 + value2;
    
    dailyData.push({
      date: dateStr,
      holdings1,
      holdings2,
      invested: purchaseAmount,
      value1,
      value2,
      totalValue,
      price1: currentPrice1 || 0,
      price2: currentPrice2 || 0,
    });
  }
  
  return dailyData;
}

/**
 * Calculate metrics from DCA daily data
 * @param {object[]} dailyData - Daily DCA data
 * @returns {object} Calculated metrics
 */
function calculateDCAMetrics(dailyData) {
  if (dailyData.length === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      pnl: { value: 0, percent: 0 },
      maxDrawdown: 0,
      volatility: 0,
      cagr: 0,
    };
  }
  
  const lastDay = dailyData[dailyData.length - 1];
  const totalValue = lastDay.value || lastDay.totalValue || 0;
  const totalInvested = lastDay.invested;
  
  const pnlValue = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (pnlValue / totalInvested) * 100 : 0;
  
  // Extract values for metrics
  const values = dailyData.map(d => d.value || d.totalValue || 0);
  const dailyReturns = calculateDailyReturns(values);
  
  const maxDrawdown = calculateMaxDrawdown(values);
  const volatility = calculateVolatility(dailyReturns);
  
  // Calculate years for CAGR
  const years = dailyData.length / 365;
  const cagr = calculateCAGR(totalInvested, totalValue, years);
  
  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalInvested: parseFloat(totalInvested.toFixed(2)),
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
 * Calculate metrics from HODL daily data
 * @param {object[]} dailyData - Daily HODL data
 * @returns {object} Calculated metrics
 */
function calculateHODLMetrics(dailyData) {
  if (dailyData.length === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      pnl: { value: 0, percent: 0 },
      maxDrawdown: 0,
      volatility: 0,
      cagr: 0,
    };
  }
  
  const lastDay = dailyData[dailyData.length - 1];
  const totalValue = lastDay.value || lastDay.totalValue || 0;
  const totalInvested = lastDay.invested;
  
  const pnlValue = totalValue - totalInvested;
  const pnlPercent = totalInvested > 0 ? (pnlValue / totalInvested) * 100 : 0;
  
  // Extract values for metrics
  const values = dailyData.map(d => d.value || d.totalValue || 0);
  const dailyReturns = calculateDailyReturns(values);
  
  const maxDrawdown = calculateMaxDrawdown(values);
  const volatility = calculateVolatility(dailyReturns);
  
  // Calculate years for CAGR
  const years = dailyData.length / 365;
  const cagr = calculateCAGR(totalInvested, totalValue, years);
  
  return {
    totalValue: parseFloat(totalValue.toFixed(2)),
    totalInvested: parseFloat(totalInvested.toFixed(2)),
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
 * Run DCA simulation
 * @param {object} params - Simulation parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {number} params.amount - Purchase amount in USD
 * @param {number} params.interval - Purchase interval in days (e.g., 7 for weekly)
 * @param {string} params.asset - Asset symbol ('BTC' or 'ETH')
 * @param {string} [params.pair] - Optional pair ratio (e.g., '70/30' for BTC/ETH)
 * @returns {Promise<object>} Simulation results
 */
async function simulateDCA(params) {
  const { startDate: startDateStr, endDate: endDateStr, amount, interval, asset, pair } = params;
  
  // Parse dates
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);
  
  // Validate dates
  if (startDate >= endDate) {
    throw new Error('Start date must be before end date');
  }
  
  let dcaDailyData, hodlDailyData;
  let assetInfo;
  
  if (pair) {
    // Parse pair ratio (e.g., '70/30')
    const [ratio1Str, ratio2Str] = pair.split('/');
    const ratio1 = parseInt(ratio1Str);
    const ratio2 = parseInt(ratio2Str);
    
    if (ratio1 + ratio2 !== 100) {
      throw new Error('Pair ratios must sum to 100');
    }
    
    // Assume BTC/ETH for pair
    const asset1 = 'BTC';
    const asset2 = 'ETH';
    
    assetInfo = `${asset1}/${asset2} ${ratio1}/${ratio2}`;
    
    // Calculate DCA and HODL for pair
    dcaDailyData = await getDCAPairDaily(asset1, asset2, ratio1, ratio2, startDate, endDate, amount, interval);
    
    // For HODL, calculate total invested across all DCA purchases
    const purchaseDates = getPurchaseDates(startDate, endDate, interval);
    const totalHodlAmount = amount * purchaseDates.length;
    
    hodlDailyData = await getHODLPairDaily(asset1, asset2, ratio1, ratio2, startDate, endDate, totalHodlAmount);
  } else {
    // Single asset
    assetInfo = asset;
    
    // Calculate DCA and HODL for single asset
    dcaDailyData = await getDCADaily(asset, startDate, endDate, amount, interval);
    
    // For HODL, calculate total invested across all DCA purchases
    const purchaseDates = getPurchaseDates(startDate, endDate, interval);
    const totalHodlAmount = amount * purchaseDates.length;
    
    hodlDailyData = await getHODLDaily(asset, startDate, endDate, totalHodlAmount);
  }
  
  // Calculate metrics
  const dcaMetrics = calculateDCAMetrics(dcaDailyData);
  const hodlMetrics = calculateHODLMetrics(hodlDailyData);
  
  // Count purchases
  const purchaseDates = getPurchaseDates(startDate, endDate, interval);
  const purchaseCount = purchaseDates.length;
  
  // Build daily data combining DCA and HODL
  const dailyData = dcaDailyData.map((dca, i) => {
    const hodl = hodlDailyData[i];
    return {
      date: dca.date,
      dcaValue: dca.value || dca.totalValue || 0,
      dcaHoldings: pair ? { holdings1: dca.holdings1, holdings2: dca.holdings2 } : dca.holdings,
      hodlValue: hodl.value || hodl.totalValue || 0,
      hodlHoldings: pair ? { holdings1: hodl.holdings1, holdings2: hodl.holdings2 } : hodl.holdings,
      invested: dca.invested,
    };
  });
  
  return {
    asset: assetInfo,
    period: {
      startDate: startDateStr,
      endDate: endDateStr,
    },
    dca: {
      frequency: interval === 7 ? 'weekly' : `every ${interval} days`,
      amount,
      totalInvested: dcaMetrics.totalInvested,
      purchaseCount,
    },
    results: {
      dca: dcaMetrics,
      hodl: hodlMetrics,
    },
    dailyData,
  };
}

/**
 * Get cached DCA simulation
 * @param {string} cacheKey - Cache key
 * @returns {Promise<object|null>} Cached data or null
 */
async function getCachedDCA(cacheKey) {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`DCA Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }
    console.log(`DCA Cache MISS: ${cacheKey}`);
  } catch (error) {
    console.error('Redis cache read error:', error);
  }
  
  return null;
}

/**
 * Cache DCA simulation
 * @param {string} cacheKey - Cache key
 * @param {object} data - Data to cache
 */
async function cacheDCA(cacheKey, data) {
  if (!redisClient || !redisClient.isOpen) {
    return;
  }
  
  try {
    await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
    console.log(`DCA Cache SET: ${cacheKey}`);
  } catch (error) {
    console.error('Redis cache write error:', error);
  }
}

/**
 * Invalidate DCA cache for specific parameters
 * @param {string} pattern - Cache key pattern
 */
async function invalidateDCACache(pattern = 'dca:*') {
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
    
    console.log(`Invalidated ${deletedCount} DCA cache keys`);
  } catch (error) {
    console.error('Error invalidating DCA cache:', error);
  }
}

/**
 * Main entry point for DCA simulation with caching
 * @param {object} params - Simulation parameters
 * @returns {Promise<object>} Simulation results
 */
async function runDCASimulation(params) {
  const { startDate, endDate, amount, interval, asset, pair } = params;
  
  // Build cache key
  const cacheKey = `dca:${asset}:${startDate}:${endDate}:${amount}:${interval}:${pair || 'single'}`;
  
  // Check cache
  const cached = await getCachedDCA(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Run simulation
  const result = await simulateDCA(params);
  
  // Cache result
  await cacheDCA(cacheKey, result);
  
  return result;
}

module.exports = {
  runDCASimulation,
  simulateDCA,
  getDCADaily,
  getHODLDaily,
  calculateDCAMetrics,
  calculateHODLMetrics,
  getCachedDCA,
  cacheDCA,
  invalidateDCACache,
};

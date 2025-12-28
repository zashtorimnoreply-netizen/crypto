const priceService = require('../services/priceService');
const { isValidSymbol, isStablecoin } = require('../utils/priceSymbolMap');

/**
 * GET /api/prices/current
 * Get current spot prices for requested symbols
 * Query params: symbols - comma-separated list of symbols
 */
async function getCurrentPrices(req, res, next) {
  try {
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        details: 'symbols query parameter is required (comma-separated)',
      });
    }
    
    // Parse and validate symbols
    const symbolList = symbols
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);
    
    if (symbolList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid symbols',
        details: 'At least one valid symbol is required',
      });
    }
    
    // Validate each symbol
    const invalidSymbols = symbolList.filter(s => !isValidSymbol(s));
    if (invalidSymbols.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbol not found',
        details: `Invalid symbols: ${invalidSymbols.join(', ')}`,
      });
    }
    
    // Fetch prices
    const startTime = Date.now();
    const prices = await priceService.getCurrentPrices(symbolList);
    const duration = Date.now() - startTime;
    
    console.log(`Fetched ${prices.length} prices in ${duration}ms`);
    
    res.json({
      success: true,
      data: prices,
      meta: {
        responseTime: `${duration}ms`,
        cached: false, // Service handles caching internally
      },
    });
    
  } catch (error) {
    console.error('Error fetching current prices:', error);
    
    // Check if it's an API timeout/unavailability
    if (error.message.includes('Failed to fetch price')) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        details: 'Unable to fetch price data. Please try again later.',
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/prices/historical
 * Get historical price data for a symbol
 * Query params:
 *   - symbol: required, the crypto symbol
 *   - start_date: required, start date (YYYY-MM-DD)
 *   - end_date: required, end date (YYYY-MM-DD)
 */
async function getHistoricalPrices(req, res, next) {
  try {
    const { symbol, start_date, end_date } = req.query;
    
    // Validate required parameters
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        details: 'symbol query parameter is required',
      });
    }
    
    if (!start_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        details: 'start_date query parameter is required (YYYY-MM-DD format)',
      });
    }
    
    if (!end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        details: 'end_date query parameter is required (YYYY-MM-DD format)',
      });
    }
    
    // Normalize and validate symbol
    const normalizedSymbol = symbol.trim().toUpperCase();
    
    if (!isValidSymbol(normalizedSymbol)) {
      return res.status(400).json({
        success: false,
        error: 'Symbol not found',
        details: `Unknown symbol: ${symbol}`,
      });
    }
    
    // Check for stablecoin (no historical data needed)
    if (isStablecoin(normalizedSymbol)) {
      return res.json({
        success: true,
        symbol: normalizedSymbol,
        data: [],
        note: 'Stablecoins have fixed USD value of 1.00',
      });
    }
    
    // Validate date formats
    if (!priceService.isValidDateFormat(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: 'Invalid start_date format. Use YYYY-MM-DD',
      });
    }
    
    if (!priceService.isValidDateFormat(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        details: 'Invalid end_date format. Use YYYY-MM-DD',
      });
    }
    
    // Parse dates
    const startDate = priceService.parseDate(start_date);
    const endDate = priceService.parseDate(end_date);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Validate date range
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date range',
        details: 'start_date must be before or equal to end_date',
      });
    }
    
    if (endDate > today) {
      return res.status(400).json({
        success: false,
        error: 'End date cannot be in the future',
        details: `End date (${end_date}) cannot be in the future`,
      });
    }
    
    // Check for reasonable date range (prevent excessive API calls)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365 * 5) {
      return res.status(400).json({
        success: false,
        error: 'Date range too large',
        details: 'Maximum date range is 5 years. Please reduce the range.',
      });
    }
    
    // Fetch historical prices
    const startTime = Date.now();
    const data = await priceService.getHistoricalPrices(normalizedSymbol, startDate, endDate);
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      symbol: normalizedSymbol,
      data,
      meta: {
        start_date,
        end_date,
        responseTime: `${duration}ms`,
        dataPoints: data.length,
      },
    });
    
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    next(error);
  }
}

module.exports = {
  getCurrentPrices,
  getHistoricalPrices,
};

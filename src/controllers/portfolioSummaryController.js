/**
 * Portfolio Summary, Allocation, and Positions Controller
 * Handles endpoints for portfolio summary metrics, allocation breakdown, and detailed positions
 */

const equityCurveService = require('../services/equityCurveService');
const priceService = require('../services/priceService');
const db = require('../db');
const { redisClient } = require('../redis');

const CACHE_TTL_SECONDS = 300; // 5 minute cache

/**
 * Generate cache key for portfolio endpoints
 */
function getCacheKey(portfolioId, endpoint, sortBy = '', order = '') {
  return `portfolio:${portfolioId}:${endpoint}:${sortBy}:${order}`;
}

/**
 * Get cached data or return null
 */
async function getCachedData(key) {
  if (!redisClient) return null;
  
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis cache read error:', error);
  }
  
  return null;
}

/**
 * Set data in cache
 */
async function setCachedData(key, data, ttl = CACHE_TTL_SECONDS) {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    console.log(`Cache SET: ${key}`);
  } catch (error) {
    console.error('Redis cache write error:', error);
  }
}

/**
 * Invalidate cache for portfolio
 */
async function invalidatePortfolioCache(portfolioId) {
  if (!redisClient) return;
  
  try {
    // Find all keys for this portfolio
    const pattern = `portfolio:${portfolioId}:*`;
    let cursor = '0';
    
    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      const keys = result.keys;
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`Invalidated ${keys.length} cache keys for portfolio ${portfolioId}`);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

/**
 * Calculate cost basis for all symbols in a portfolio
 */
async function calculateCostBasis(portfolioId) {
  const result = await db.query(
    `SELECT 
      symbol,
      side,
      SUM(quantity) as total_qty,
      SUM(quantity * price) as total_value
     FROM trades 
     WHERE portfolio_id = $1 
     GROUP BY symbol, side`,
    [portfolioId]
  );
  
  const costBasis = {};
  
  for (const row of result.rows) {
    const symbol = row.symbol;
    if (!costBasis[symbol]) {
      costBasis[symbol] = { buyQty: 0, buyValue: 0, sellQty: 0, sellValue: 0 };
    }
    
    if (row.side.toUpperCase() === 'BUY') {
      costBasis[symbol].buyQty = parseFloat(row.total_qty);
      costBasis[symbol].buyValue = parseFloat(row.total_value);
    } else {
      costBasis[symbol].sellQty = parseFloat(row.total_qty);
      costBasis[symbol].sellValue = parseFloat(row.total_value);
    }
  }
  
  // Calculate final values
  for (const symbol in costBasis) {
    const data = costBasis[symbol];
    data.holdings = data.buyQty - data.sellQty;
    data.costBasis = data.buyValue - data.sellValue;
    data.avgCost = data.holdings > 0 ? data.costBasis / data.holdings : 0;
  }
  
  return costBasis;
}

/**
 * Get trade statistics for a portfolio
 */
async function getTradeStats(portfolioId) {
  const result = await db.query(
    `SELECT 
       COUNT(*) as total_trades,
       MIN(timestamp) as first_trade_date,
       MAX(timestamp) as last_trade_date,
       array_agg(DISTINCT symbol) as symbols,
       array_agg(DISTINCT exchange) as exchanges
     FROM trades 
     WHERE portfolio_id = $1`,
    [portfolioId]
  );
  
  const row = result.rows[0];
  return {
    total_trades: parseInt(row.total_trades) || 0,
    first_trade_date: row.first_trade_date,
    last_trade_date: row.last_trade_date,
    symbols: row.symbols || [],
    exchanges: row.exchanges || [],
  };
}

/**
 * Get position details including individual trade info
 */
async function getPositionDetails(portfolioId, symbol) {
  const result = await db.query(
    `SELECT 
       side, 
       quantity, 
       price, 
       timestamp,
       exchange
     FROM trades 
     WHERE portfolio_id = $1 AND symbol = $2
     ORDER BY timestamp ASC`,
    [portfolioId, symbol]
  );
  
  return result.rows.map(row => ({
    side: row.side.toUpperCase(),
    quantity: parseFloat(row.quantity),
    price: parseFloat(row.price),
    timestamp: row.timestamp,
    exchange: row.exchange,
  }));
}

/**
 * GET /api/portfolios/:portfolio_id/summary
 * Portfolio dashboard with current state, allocation, metrics, and stats
 */
async function getPortfolioSummary(req, res, next) {
  try {
    const { portfolio_id } = req.params;
    
    // Validate portfolio_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolio_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
        details: 'Portfolio ID must be a valid UUID',
      });
    }
    
    // Check cache
    const cacheKey = getCacheKey(portfolio_id, 'summary');
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get portfolio info
    const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolio_id);
    if (!portfolioInfo) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
    }
    
    // Get latest equity curve data (current holdings)
    const equityResult = await equityCurveService.calculateEquityCurve(portfolio_id);
    if (!equityResult.success || equityResult.data.length === 0) {
      // Empty portfolio
      const response = {
        success: true,
        portfolio_id: portfolio_id,
        portfolio_name: portfolioInfo.name,
        current_state: {
          total_value: 0,
          cost_basis: 0,
          pnl: { value: 0, percent: 0 },
          last_updated: new Date().toISOString(),
        },
        allocation: [],
        key_metrics: {
          volatility_percent: 0,
          max_drawdown_percent: 0,
          ytd_return_percent: 0,
          ytd_btc_return_percent: 0,
          ytd_eth_return_percent: 0,
        },
        stats: await getTradeStats(portfolio_id),
      };
      
      await setCachedData(cacheKey, response);
      return res.json(response);
    }
    
    const latestData = equityResult.data[equityResult.data.length - 1];
    const currentHoldings = latestData.breakdown || {};
    const symbols = Object.keys(currentHoldings);
    
    // Get current prices for all symbols
    let prices = [];
    if (symbols.length > 0) {
      prices = await priceService.getCurrentPrices(symbols);
    }
    
    const priceMap = {};
    for (const price of prices) {
      priceMap[price.symbol] = price.price;
    }
    
    // Calculate cost basis for all symbols
    const costBasisData = await calculateCostBasis(portfolio_id);
    
    // Calculate allocation and PnL for each symbol
    let totalValue = 0;
    let totalCostBasis = 0;
    const allocation = [];
    
    for (const symbol in currentHoldings) {
      const holdings = currentHoldings[symbol].holdings;
      if (holdings <= 0) continue; // Skip sold positions
      
      const currentPrice = priceMap[symbol] || currentHoldings[symbol].price || 0;
      const costData = costBasisData[symbol] || { costBasis: 0, avgCost: 0 };
      
      const positionValue = holdings * currentPrice;
      const costValue = costData.costBasis;
      const pnlValue = positionValue - costValue;
      const pnlPercent = costValue > 0 ? (pnlValue / costValue) * 100 : 0;
      
      totalValue += positionValue;
      totalCostBasis += costValue;
      
      allocation.push({
        symbol: symbol,
        holdings: holdings,
        current_price: currentPrice,
        position_value: positionValue,
        percent_of_portfolio: 0, // Will calculate after total is known
        pnl: {
          value: pnlValue,
          percent: pnlPercent,
        },
      });
    }
    
    // Calculate percentage of portfolio for each position
    for (const item of allocation) {
      item.percent_of_portfolio = totalValue > 0 ? (item.position_value / totalValue) * 100 : 0;
    }
    
    // Sort allocation by value descending
    allocation.sort((a, b) => b.position_value - a.position_value);
    
    // Calculate overall PnL
    const totalPnl = totalValue - totalCostBasis;
    const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
    
    // Get trade statistics
    const stats = await getTradeStats(portfolio_id);
    
    // Build response
    const response = {
      success: true,
      portfolio_id: portfolio_id,
      portfolio_name: portfolioInfo.name,
      current_state: {
        total_value: Math.round(totalValue * 100) / 100,
        cost_basis: Math.round(totalCostBasis * 100) / 100,
        pnl: {
          value: Math.round(totalPnl * 100) / 100,
          percent: Math.round(totalPnlPercent * 100) / 100,
        },
        last_updated: new Date().toISOString(),
      },
      allocation: allocation.map(item => ({
        ...item,
        holdings: Math.round(item.holdings * 100000000) / 100000000, // 8 decimal places
        current_price: Math.round(item.current_price * 100) / 100,
        position_value: Math.round(item.position_value * 100) / 100,
        percent_of_portfolio: Math.round(item.percent_of_portfolio * 100) / 100,
        pnl: {
          value: Math.round(item.pnl.value * 100) / 100,
          percent: Math.round(item.pnl.percent * 100) / 100,
        },
      })),
      key_metrics: {
        volatility_percent: 0, // Would come from metrics engine (Task 6)
        max_drawdown_percent: 0, // Would come from metrics engine (Task 6)
        ytd_return_percent: 0, // Would come from metrics engine (Task 6)
        ytd_btc_return_percent: 0, // Would come from metrics engine (Task 6)
        ytd_eth_return_percent: 0, // Would come from metrics engine (Task 6)
      },
      stats: stats,
    };
    
    // Cache the response
    await setCachedData(cacheKey, response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching portfolio summary:', error);
    next(error);
  }
}

/**
 * GET /api/portfolios/:portfolio_id/allocation
 * Pie chart data - current asset allocation breakdown
 */
async function getPortfolioAllocation(req, res, next) {
  try {
    const { portfolio_id } = req.params;
    
    // Validate portfolio_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolio_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
        details: 'Portfolio ID must be a valid UUID',
      });
    }
    
    // Check cache
    const cacheKey = getCacheKey(portfolio_id, 'allocation');
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get portfolio info for name
    const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolio_id);
    if (!portfolioInfo) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
    }
    
    // Get latest equity curve data
    const equityResult = await equityCurveService.calculateEquityCurve(portfolio_id);
    if (!equityResult.success || equityResult.data.length === 0) {
      // Empty portfolio
      const response = {
        success: true,
        portfolio_id: portfolio_id,
        current_value: 0,
        allocation: [],
        last_updated: new Date().toISOString(),
      };
      
      await setCachedData(cacheKey, response);
      return res.json(response);
    }
    
    const latestData = equityResult.data[equityResult.data.length - 1];
    const currentHoldings = latestData.breakdown || {};
    const symbols = Object.keys(currentHoldings);
    
    // Get current prices
    let prices = [];
    if (symbols.length > 0) {
      prices = await priceService.getCurrentPrices(symbols);
    }
    
    const priceMap = {};
    for (const price of prices) {
      priceMap[price.symbol] = price.price;
    }
    
    // Calculate allocation
    let totalValue = 0;
    const allocation = [];
    
    for (const symbol in currentHoldings) {
      const holdings = currentHoldings[symbol].holdings;
      if (holdings <= 0) continue;
      
      const currentPrice = priceMap[symbol] || currentHoldings[symbol].price || 0;
      const positionValue = holdings * currentPrice;
      
      totalValue += positionValue;
      
      allocation.push({
        symbol: symbol,
        value: positionValue,
        percent: 0, // Will calculate after total is known
        holdings: holdings,
        price: currentPrice,
      });
    }
    
    // Calculate percentage for each position
    for (const item of allocation) {
      item.percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    }
    
    // Sort by value descending
    allocation.sort((a, b) => b.value - a.value);
    
    const response = {
      success: true,
      portfolio_id: portfolio_id,
      current_value: Math.round(totalValue * 100) / 100,
      allocation: allocation.map(item => ({
        symbol: item.symbol,
        value: Math.round(item.value * 100) / 100,
        percent: Math.round(item.percent * 100) / 100,
        holdings: Math.round(item.holdings * 100000000) / 100000000,
        price: Math.round(item.price * 100) / 100,
      })),
      last_updated: new Date().toISOString(),
    };
    
    // Cache the response
    await setCachedData(cacheKey, response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching portfolio allocation:', error);
    next(error);
  }
}

/**
 * GET /api/portfolios/:portfolio_id/positions
 * Detailed position table with full breakdowns and sorting
 */
async function getPortfolioPositions(req, res, next) {
  try {
    const { portfolio_id } = req.params;
    const { sort_by = 'value', order = 'desc' } = req.query;
    
    // Validate portfolio_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolio_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
        details: 'Portfolio ID must be a valid UUID',
      });
    }
    
    // Validate sort parameters
    const validSortFields = ['value', 'symbol', 'percent', 'pnl'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'value';
    const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    // Check cache
    const cacheKey = getCacheKey(portfolio_id, 'positions', sortField, sortOrder);
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    
    // Get portfolio info
    const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolio_id);
    if (!portfolioInfo) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
    }
    
    // Get latest equity curve data
    const equityResult = await equityCurveService.calculateEquityCurve(portfolio_id);
    if (!equityResult.success || equityResult.data.length === 0) {
      // Empty portfolio
      const response = {
        success: true,
        portfolio_id: portfolio_id,
        total_value: 0,
        positions: [],
        summary: {
          total_positions: 0,
          winning_positions: 0,
          losing_positions: 0,
          total_pnl: 0,
          total_roi: 0,
        },
        last_updated: new Date().toISOString(),
      };
      
      await setCachedData(cacheKey, response);
      return res.json(response);
    }
    
    const latestData = equityResult.data[equityResult.data.length - 1];
    const currentHoldings = latestData.breakdown || {};
    const symbols = Object.keys(currentHoldings);
    
    // Get current prices
    let prices = [];
    if (symbols.length > 0) {
      prices = await priceService.getCurrentPrices(symbols);
    }
    
    const priceMap = {};
    for (const price of prices) {
      priceMap[price.symbol] = price.price;
    }
    
    // Calculate cost basis for all symbols
    const costBasisData = await calculateCostBasis(portfolio_id);
    
    // Build positions array
    let totalValue = 0;
    const positions = [];
    
    for (const symbol in currentHoldings) {
      const holdings = currentHoldings[symbol].holdings;
      if (holdings <= 0) continue;
      
      const currentPrice = priceMap[symbol] || currentHoldings[symbol].price || 0;
      const costData = costBasisData[symbol] || { costBasis: 0, avgCost: 0 };
      const positionDetails = await getPositionDetails(portfolio_id, symbol);
      
      const positionValue = holdings * currentPrice;
      const costValue = costData.costBasis;
      const pnlValue = positionValue - costValue;
      const pnlPercent = costValue > 0 ? (pnlValue / costValue) * 100 : 0;
      const roi = pnlPercent; // ROI is same as PnL % for closed positions
      
      // Get first trade date for this symbol
      const buyTrades = positionDetails.filter(t => t.side === 'BUY');
      const entryDate = buyTrades.length > 0 ? buyTrades[0].timestamp : null;
      
      // Get unique exchanges
      const exchanges = [...new Set(positionDetails.map(t => t.exchange))];
      
      totalValue += positionValue;
      
      positions.push({
        symbol: symbol,
        holdings: holdings,
        avg_cost: costData.avgCost,
        entry_date: entryDate,
        current_price: currentPrice,
        position_value: positionValue,
        cost_value: costValue,
        pnl: {
          value: pnlValue,
          percent: pnlPercent,
        },
        percent_of_portfolio: 0, // Will calculate after
        roi: roi,
        trades_count: positionDetails.length,
        exchange_sources: exchanges,
      });
    }
    
    // Calculate percentage of portfolio for each position
    for (const position of positions) {
      position.percent_of_portfolio = totalValue > 0 ? (position.position_value / totalValue) * 100 : 0;
    }
    
    // Sort positions
    positions.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'value':
          aValue = a.position_value;
          bValue = b.position_value;
          break;
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'percent':
          aValue = a.percent_of_portfolio;
          bValue = b.percent_of_portfolio;
          break;
        case 'pnl':
          aValue = a.pnl.value;
          bValue = b.pnl.value;
          break;
        default:
          aValue = a.position_value;
          bValue = b.position_value;
      }
      
      if (sortField === 'symbol') {
        // String comparison for symbol
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        // Numeric comparison for others
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });
    
    // Calculate summary metrics
    const winningPositions = positions.filter(p => p.pnl.value > 0).length;
    const losingPositions = positions.filter(p => p.pnl.value < 0).length;
    const totalPnl = positions.reduce((sum, p) => sum + p.pnl.value, 0);
    const totalRoi = totalValue > 0 ? (totalPnl / totalValue) * 100 : 0;
    
    const response = {
      success: true,
      portfolio_id: portfolio_id,
      total_value: Math.round(totalValue * 100) / 100,
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        holdings: Math.round(pos.holdings * 100000000) / 100000000,
        avg_cost: Math.round(pos.avg_cost * 100) / 100,
        entry_date: pos.entry_date,
        current_price: Math.round(pos.current_price * 100) / 100,
        position_value: Math.round(pos.position_value * 100) / 100,
        cost_value: Math.round(pos.cost_value * 100) / 100,
        pnl: {
          value: Math.round(pos.pnl.value * 100) / 100,
          percent: Math.round(pos.pnl.percent * 100) / 100,
        },
        percent_of_portfolio: Math.round(pos.percent_of_portfolio * 100) / 100,
        roi: Math.round(pos.roi * 100) / 100,
        trades_count: pos.trades_count,
        exchange_sources: pos.exchange_sources,
      })),
      summary: {
        total_positions: positions.length,
        winning_positions: winningPositions,
        losing_positions: losingPositions,
        total_pnl: Math.round(totalPnl * 100) / 100,
        total_roi: Math.round(totalRoi * 100) / 100,
      },
      last_updated: new Date().toISOString(),
    };
    
    // Cache the response
    await setCachedData(cacheKey, response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching portfolio positions:', error);
    next(error);
  }
}

module.exports = {
  getPortfolioSummary,
  getPortfolioAllocation,
  getPortfolioPositions,
  invalidatePortfolioCache,
};
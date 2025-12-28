/**
 * Portfolio Controller
 * Handles portfolio-related endpoints including equity curve calculation
 */

const equityCurveService = require('../services/equityCurveService');
const db = require('../db');

/**
 * GET /api/portfolios/:portfolio_id/equity-curve
 * Calculate and return daily equity curve for a portfolio
 * 
 * Query Parameters:
 *   - start_date: YYYY-MM-DD (default: first trade date)
 *   - end_date: YYYY-MM-DD (default: today)
 *   - granularity: "daily" (only option for MVP)
 *   - include_stats: "true" to include summary statistics
 */
async function getEquityCurve(req, res, next) {
  try {
    const { portfolio_id } = req.params;
    const { start_date, end_date, granularity, include_stats } = req.query;
    
    // Validate portfolio_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolio_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
        details: 'Portfolio ID must be a valid UUID',
      });
    }
    
    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (start_date && !dateRegex.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start_date format',
        details: 'start_date must be in YYYY-MM-DD format',
      });
    }
    
    if (end_date && !dateRegex.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid end_date format',
        details: 'end_date must be in YYYY-MM-DD format',
      });
    }
    
    // Validate granularity (for future use)
    if (granularity && granularity !== 'daily') {
      return res.status(400).json({
        success: false,
        error: 'Invalid granularity',
        details: 'Only "daily" granularity is supported in this version',
      });
    }
    
    // Calculate equity curve
    const result = await equityCurveService.calculateEquityCurve(portfolio_id, {
      start_date,
      end_date,
    });
    
    // Handle errors from service
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        error: result.error,
      });
    }
    
    // Build response
    const response = {
      success: true,
      portfolio_id: portfolio_id,
      symbol_breakdown: true,
      data: result.data,
      metadata: result.metadata,
    };
    
    // Optionally include statistics
    if (include_stats === 'true' && result.data.length > 0) {
      response.statistics = equityCurveService.calculateEquityStats(result.data);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error calculating equity curve:', error);
    next(error);
  }
}

/**
 * GET /api/portfolios/:portfolio_id
 * Get portfolio details including summary info
 */
async function getPortfolio(req, res, next) {
  try {
    const { portfolio_id } = req.params;
    
    // Validate portfolio_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(portfolio_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
        details: 'Portfolio ID must be a valid UUID',
      });
    }
    
    const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolio_id);
    
    if (!portfolioInfo) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        id: portfolioInfo.id,
        name: portfolioInfo.name,
        created_at: portfolioInfo.created_at,
        first_trade_date: portfolioInfo.first_trade_date,
        total_trades: portfolioInfo.total_trades,
        symbols: portfolioInfo.symbols,
      },
    });
    
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    next(error);
  }
}

/**
 * GET /api/portfolios
 * List all portfolios for the default user (for demo purposes)
 * In production, this would filter by authenticated user
 */
async function listPortfolios(req, res, next) {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.created_at, p.updated_at,
              (SELECT COUNT(*) FROM trades WHERE portfolio_id = p.id) as trade_count,
              (SELECT MIN(timestamp) FROM trades WHERE portfolio_id = p.id) as first_trade_date,
              (SELECT array_agg(DISTINCT symbol) FROM trades WHERE portfolio_id = p.id) as symbols
       FROM portfolios p
       ORDER BY p.created_at DESC`
    );
    
    const portfolios = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      trade_count: parseInt(row.trade_count) || 0,
      first_trade_date: row.first_trade_date,
      symbols: row.symbols || [],
    }));
    
    res.json({
      success: true,
      data: portfolios,
      meta: {
        total: portfolios.length,
      },
    });
    
  } catch (error) {
    console.error('Error listing portfolios:', error);
    next(error);
  }
}

/**
 * POST /api/portfolios
 * Create a new portfolio
 */
async function createPortfolio(req, res, next) {
  try {
    const { name, user_id } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        details: 'name is required',
      });
    }
    
    // For demo, use a default user if not provided
    const userId = user_id || '00000000-0000-0000-0000-000000000001';
    
    const result = await db.query(
      `INSERT INTO portfolios (user_id, name) VALUES ($1, $2) RETURNING *`,
      [userId, name]
    );
    
    const row = result.rows[0];
    
    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        user_id: row.user_id,
        created_at: row.created_at,
      },
    });
    
  } catch (error) {
    console.error('Error creating portfolio:', error);
    next(error);
  }
}

module.exports = {
  getEquityCurve,
  getPortfolio,
  listPortfolios,
  createPortfolio,
};

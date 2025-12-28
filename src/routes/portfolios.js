const express = require('express');
const { getEquityCurve, getPortfolio, listPortfolios, createPortfolio } = require('../controllers/portfolioController');
const { getPortfolioSummary, getPortfolioAllocation, getPortfolioPositions } = require('../controllers/portfolioSummaryController');

const router = express.Router();

/**
 * @route GET /api/portfolios
 * @description List all portfolios
 * @returns {object} List of portfolios with trade counts and symbols
 */
router.get('/portfolios', listPortfolios);

/**
 * @route POST /api/portfolios
 * @description Create a new portfolio
 * @body {string} name - Portfolio name
 * @body {string} [user_id] - User ID (optional, uses default for demo)
 * @returns {object} Created portfolio details
 */
router.post('/portfolios', createPortfolio);

/**
 * @route GET /api/portfolios/:portfolio_id
 * @description Get portfolio details
 * @param {string} portfolio_id - Portfolio UUID
 * @returns {object} Portfolio details including trade count and symbols
 */
router.get('/portfolios/:portfolio_id', getPortfolio);

/**
 * @route GET /api/portfolios/:portfolio_id/equity-curve
 * @description Calculate and return daily equity curve for a portfolio
 * @param {string} portfolio_id - Portfolio UUID
 * @query {string} [start_date] - Start date in YYYY-MM-DD format (default: first trade date)
 * @query {string} [end_date] - End date in YYYY-MM-DD format (default: today)
 * @query {string} [granularity] - Time granularity (only "daily" supported for MVP)
 * @query {string} [include_stats] - Include summary statistics ("true" to enable)
 * @returns {object} Equity curve data with daily values and symbol breakdown
 * 
 * @example
 * GET /api/portfolios/123e4567-e89b-12d3-a456-426614174000/equity-curve
 * 
 * Response:
 * {
 *   "success": true,
 *   "portfolio_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "symbol_breakdown": true,
 *   "data": [
 *     {
 *       "date": "2024-01-01T00:00:00Z",
 *       "total_value": 10000.00,
 *       "timestamp": 1704067200000,
 *       "breakdown": {
 *         "BTC": { "holdings": 0.5, "price": 42000, "value": 21000 }
 *       }
 *     }
 *   ],
 *   "metadata": {
 *     "first_trade_date": "2024-01-01T00:00:00Z",
 *     "last_updated": "2024-12-28T14:30:00Z",
 *     "total_trades": 150,
 *     "symbols": ["BTC", "ETH", "SOL"]
 *   }
 * }
 */
router.get('/portfolios/:portfolio_id/equity-curve', getEquityCurve);

/**
 * @route GET /api/portfolios/:portfolio_id/summary
 * @description Get portfolio summary with current state, allocation, metrics, and statistics
 * @param {string} portfolio_id - Portfolio UUID
 * @returns {object} Comprehensive portfolio summary
 * 
 * @example
 * GET /api/portfolios/123e4567-e89b-12d3-a456-426614174000/summary
 * 
 * Response:
 * {
 *   "success": true,
 *   "portfolio_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "portfolio_name": "My Portfolio",
 *   "current_state": {
 *     "total_value": 25000.00,
 *     "cost_basis": 19500.00,
 *     "pnl": { "value": 5500.00, "percent": 28.2 },
 *     "last_updated": "2024-12-28T14:30:00Z"
 *   },
 *   "allocation": [...],
 *   "key_metrics": { ... },
 *   "stats": { ... }
 * }
 */
router.get('/portfolios/:portfolio_id/summary', getPortfolioSummary);

/**
 * @route GET /api/portfolios/:portfolio_id/allocation
 * @description Get pie chart data - asset allocation breakdown
 * @param {string} portfolio_id - Portfolio UUID
 * @returns {object} Current allocation by symbol
 * 
 * @example
 * GET /api/portfolios/123e4567-e89b-12d3-a456-426614174000/allocation
 * 
 * Response:
 * {
 *   "success": true,
 *   "portfolio_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "current_value": 25000.00,
 *   "allocation": [
 *     { "symbol": "BTC", "value": 21250.00, "percent": 85.0, "holdings": 0.5, "price": 42500.00 },
 *     { "symbol": "ETH", "value": 3750.00, "percent": 15.0, "holdings": 10, "price": 2300.00 }
 *   ],
 *   "last_updated": "2024-12-28T14:30:00Z"
 * }
 */
router.get('/portfolios/:portfolio_id/allocation', getPortfolioAllocation);

/**
 * @route GET /api/portfolios/:portfolio_id/positions
 * @description Get detailed position breakdown with full trade history
 * @param {string} portfolio_id - Portfolio UUID
 * @query {string} [sort_by] - Sort field: "value" (default), "symbol", "percent", "pnl"
 * @query {string} [order] - Sort order: "desc" (default), "asc"
 * @returns {object} Detailed positions with PnL calculations
 * 
 * @example
 * GET /api/portfolios/123e4567-e89b-12d3-a456-426614174000/positions?sort_by=value&order=desc
 * 
 * Response:
 * {
 *   "success": true,
 *   "portfolio_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "total_value": 25000.00,
 *   "positions": [...],
 *   "summary": { ... },
 *   "last_updated": "2024-12-28T14:30:00Z"
 * }
 */
router.get('/portfolios/:portfolio_id/positions', getPortfolioPositions);

module.exports = router;

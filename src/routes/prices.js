const express = require('express');
const { getCurrentPrices, getHistoricalPrices } = require('../controllers/priceController');

const router = express.Router();

/**
 * @route GET /api/prices/current
 * @description Get current spot prices for requested symbols
 * @query {string} symbols - Comma-separated list of symbols (e.g., "BTC,ETH,SOL")
 * @returns {object} Success response with price data
 * 
 * @example
 * GET /api/prices/current?symbols=BTC,ETH,SOL
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "symbol": "BTC", "price": 42500.50, "timestamp": "2024-12-28T14:30:00Z" },
 *     { "symbol": "ETH", "price": 2300.75, "timestamp": "2024-12-28T14:30:00Z" }
 *   ]
 * }
 */
router.get('/prices/current', getCurrentPrices);

/**
 * @route GET /api/prices/historical
 * @description Get historical price data (OHLCV) for a symbol
 * @query {string} symbol - The crypto symbol (e.g., "BTC")
 * @query {string} start_date - Start date in YYYY-MM-DD format
 * @query {string} end_date - End date in YYYY-MM-DD format
 * @returns {object} Success response with historical price data
 * 
 * @example
 * GET /api/prices/historical?symbol=BTC&start_date=2024-01-01&end_date=2024-12-31
 * 
 * Response:
 * {
 *   "success": true,
 *   "symbol": "BTC",
 *   "data": [
 *     {
 *       "timestamp": "2024-01-01T00:00:00Z",
 *       "open": 42000,
 *       "high": 42500,
 *       "low": 41900,
 *       "close": 42300,
 *       "volume": 1500000
 *     }
 *   ]
 * }
 */
router.get('/prices/historical', getHistoricalPrices);

module.exports = router;

const express = require('express');
const { runDCASimulation, getPresetPortfolios, getSinglePreset } = require('../controllers/simulationsController');

const router = express.Router();

/**
 * @route POST /api/simulations/dca
 * @description Run DCA (Dollar-Cost Averaging) simulation
 * @body {string} startDate - Start date (YYYY-MM-DD)
 * @body {string} endDate - End date (YYYY-MM-DD)
 * @body {number} amount - Purchase amount in USD per interval
 * @body {number} interval - Purchase interval in days (e.g., 7 for weekly)
 * @body {string} asset - Asset symbol ('BTC' or 'ETH')
 * @body {string} [pair] - Optional pair ratio (e.g., '70/30' for BTC/ETH 70/30)
 * @returns {object} DCA simulation results with daily data
 * 
 * @example
 * POST /api/simulations/dca
 * Body: {
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31",
 *   "amount": 100,
 *   "interval": 7,
 *   "asset": "BTC",
 *   "pair": null
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "asset": "BTC",
 *   "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
 *   "dca": {
 *     "frequency": "weekly",
 *     "amount": 100,
 *     "totalInvested": 5200,
 *     "purchaseCount": 52
 *   },
 *   "results": {
 *     "dca": {
 *       "totalValue": 8500.00,
 *       "pnl": { "value": 3300.00, "percent": 63.5 },
 *       "maxDrawdown": -15.2,
 *       "volatility": 45.3,
 *       "cagr": 85.2
 *     },
 *     "hodl": {
 *       "totalValue": 9200.00,
 *       "pnl": { "value": 4000.00, "percent": 77.0 },
 *       "maxDrawdown": -25.0,
 *       "volatility": 50.1,
 *       "cagr": 95.0
 *     }
 *   },
 *   "dailyData": [...]
 * }
 */
router.post('/simulations/dca', runDCASimulation);

/**
 * @route GET /api/simulations/presets
 * @description Get all preset portfolios performance
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 * @returns {object} Array of preset results
 * 
 * @example
 * GET /api/simulations/presets?startDate=2024-01-01&endDate=2024-12-31
 * 
 * Response:
 * {
 *   "success": true,
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31",
 *   "presets": [
 *     {
 *       "preset": "BTC_100",
 *       "name": "BTC 100%",
 *       "description": "100% Bitcoin allocation",
 *       "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
 *       "initialCapital": 10000,
 *       "results": {
 *         "totalValue": 18500.00,
 *         "pnl": { "value": 8500.00, "percent": 85.0 },
 *         "maxDrawdown": -22.0,
 *         "volatility": 42.5,
 *         "cagr": 72.5
 *       },
 *       "allocation": {
 *         "BTC": { "percent": 100, "value": 18500.00, "holdings": 0.31 }
 *       },
 *       "dailyData": [...]
 *     },
 *     {
 *       "preset": "BTC_70_ETH_30",
 *       ...
 *     }
 *   ]
 * }
 */
router.get('/simulations/presets', getPresetPortfolios);

/**
 * @route GET /api/simulations/presets/:presetName
 * @description Get single preset portfolio performance
 * @param {string} presetName - Preset identifier (e.g., 'BTC_100', 'BTC_70_ETH_30')
 * @query {string} startDate - Start date (YYYY-MM-DD)
 * @query {string} endDate - End date (YYYY-MM-DD)
 * @returns {object} Preset results
 * 
 * @example
 * GET /api/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-12-31
 * 
 * Response:
 * {
 *   "success": true,
 *   "preset": "BTC_100",
 *   "name": "BTC 100%",
 *   "description": "100% Bitcoin allocation",
 *   "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
 *   "initialCapital": 10000,
 *   "results": {...},
 *   "allocation": {...},
 *   "dailyData": [...]
 * }
 */
router.get('/simulations/presets/:presetName', getSinglePreset);

module.exports = router;

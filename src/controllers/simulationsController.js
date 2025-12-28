/**
 * Simulations Controller
 * Handles DCA simulator and preset portfolio endpoints
 */

const dcaSimulatorService = require('../services/dcaSimulatorService');
const presetPortfoliosService = require('../services/presetPortfoliosService');

/**
 * POST /api/simulations/dca
 * Run DCA simulation
 */
async function runDCASimulation(req, res, next) {
  try {
    const { startDate, endDate, amount, interval, asset, pair } = req.body;
    
    // Validate required fields
    if (!startDate || !endDate || !amount || !interval || !asset) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: startDate, endDate, amount, interval, asset',
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
      });
    }
    
    // Validate interval
    const intervalNum = parseInt(interval);
    if (isNaN(intervalNum) || intervalNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be a positive integer',
      });
    }
    
    // Validate asset
    const validAssets = ['BTC', 'ETH'];
    if (!validAssets.includes(asset.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Asset must be one of: ${validAssets.join(', ')}`,
      });
    }
    
    // Validate pair if provided
    if (pair) {
      const pairRegex = /^\d+\/\d+$/;
      if (!pairRegex.test(pair)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pair format. Use format like "70/30"',
        });
      }
    }
    
    // Run simulation
    const result = await dcaSimulatorService.runDCASimulation({
      startDate,
      endDate,
      amount: amountNum,
      interval: intervalNum,
      asset: asset.toUpperCase(),
      pair: pair || null,
    });
    
    return res.json({
      success: true,
      ...result,
    });
    
  } catch (error) {
    console.error('DCA simulation error:', error);
    
    if (error.message.includes('No historical price data')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message.includes('must be before')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/simulations/presets
 * Get all preset portfolios performance
 */
async function getPresetPortfolios(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: startDate, endDate',
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }
    
    // Get all presets
    const presets = await presetPortfoliosService.getAllPresets(startDate, endDate);
    
    return res.json({
      success: true,
      startDate,
      endDate,
      presets,
    });
    
  } catch (error) {
    console.error('Preset portfolios error:', error);
    
    if (error.message.includes('No historical price data')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message.includes('must be before')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/simulations/presets/:presetName
 * Get single preset portfolio performance
 */
async function getSinglePreset(req, res, next) {
  try {
    const { presetName } = req.params;
    const { startDate, endDate } = req.query;
    
    // Validate required fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: startDate, endDate',
      });
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }
    
    // Validate preset name
    if (!presetPortfoliosService.PRESETS[presetName]) {
      return res.status(404).json({
        success: false,
        error: `Unknown preset: ${presetName}. Available: ${Object.keys(presetPortfoliosService.PRESETS).join(', ')}`,
      });
    }
    
    // Get preset
    const preset = await presetPortfoliosService.getPreset(presetName, startDate, endDate);
    
    return res.json({
      success: true,
      ...preset,
    });
    
  } catch (error) {
    console.error('Single preset error:', error);
    
    if (error.message.includes('No historical price data')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message.includes('must be before')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

module.exports = {
  runDCASimulation,
  getPresetPortfolios,
  getSinglePreset,
};

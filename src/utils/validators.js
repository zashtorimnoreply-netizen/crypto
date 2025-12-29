/**
 * Backend validation functions
 */

/**
 * Validate date range
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateDateRange(startDate, endDate) {
  const errors = [];
  
  if (!startDate || !endDate) {
    errors.push('Both start and end dates are required');
    return errors;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date format');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date format');
  }
  
  if (errors.length === 0) {
    if (start > end) {
      errors.push('Start date must be before end date');
    }
    if (end > new Date()) {
      errors.push('End date cannot be in the future');
    }
  }
  
  return errors;
}

/**
 * Validate amount
 * @param {number} amount - Amount to validate
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateAmount(amount) {
  const errors = [];
  
  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
    return errors;
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    errors.push('Amount must be a valid number');
  } else if (numAmount <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (numAmount > 1000000) {
    errors.push('Amount cannot exceed $1,000,000');
  }
  
  return errors;
}

/**
 * Validate portfolio ID (UUID format)
 * @param {string} portfolioId - Portfolio ID to validate
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validatePortfolioId(portfolioId) {
  if (!portfolioId) {
    return ['Portfolio ID is required'];
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(portfolioId)) {
    return ['Invalid portfolio ID format'];
  }
  
  return [];
}

/**
 * Validate asset symbol
 * @param {string} asset - Asset symbol to validate
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
function validateAsset(asset) {
  const errors = [];
  
  if (!asset) {
    errors.push('Asset is required');
    return errors;
  }

  const validAssets = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE'];
  const upperAsset = asset.toString().toUpperCase();
  
  if (!validAssets.includes(upperAsset)) {
    errors.push(`Invalid asset. Supported assets: ${validAssets.join(', ')}`);
  }
  
  return errors;
}

module.exports = {
  validateDateRange,
  validateAmount,
  validatePortfolioId,
  validateAsset,
};

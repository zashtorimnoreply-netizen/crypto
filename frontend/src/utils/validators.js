/**
 * Validate email address
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate number
 */
export const isValidNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value) => {
  return isValidNumber(value) && parseFloat(value) > 0;
};

/**
 * Validate portfolio ID (UUID format)
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate API key format
 */
export const isValidApiKey = (apiKey) => {
  return typeof apiKey === 'string' && apiKey.length > 10;
};

/**
 * Validate file type
 */
export const isValidFileType = (file, allowedTypes = ['.csv']) => {
  if (!file) return false;
  const fileName = file.name.toLowerCase();
  return allowedTypes.some(type => fileName.endsWith(type));
};

/**
 * Validate file size (in MB)
 */
export const isValidFileSize = (file, maxSizeMB = 5) => {
  if (!file) return false;
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB <= maxSizeMB;
};

/**
 * Validate date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
export const validateDateRange = (startDate, endDate) => {
  const errors = [];
  
  if (!startDate || !endDate) {
    errors.push('Both start and end dates are required');
    return errors;
  }

  if (!isValidDate(startDate)) {
    errors.push('Invalid start date format');
  }

  if (!isValidDate(endDate)) {
    errors.push('Invalid end date format');
  }

  if (errors.length === 0) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      errors.push('Start date must be before end date');
    }
    if (end > new Date()) {
      errors.push('End date cannot be in the future');
    }
  }
  
  return errors;
};

/**
 * Validate investment amount
 * @param {number} amount - Amount to validate
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
export const validateAmount = (amount) => {
  const errors = [];
  
  if (!amount) {
    errors.push('Amount is required');
    return errors;
  }

  if (!isValidNumber(amount)) {
    errors.push('Amount must be a valid number');
  } else if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  } else if (amount > 1000000) {
    errors.push('Amount cannot exceed $1,000,000');
  }
  
  return errors;
};

/**
 * Validate portfolio ID
 * @param {string} portfolioId - Portfolio ID to validate
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
export const validatePortfolioId = (portfolioId) => {
  if (!portfolioId) {
    return ['Portfolio ID is required'];
  }

  if (!isValidUUID(portfolioId)) {
    return ['Invalid portfolio ID format'];
  }
  
  return [];
};

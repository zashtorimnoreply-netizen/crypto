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

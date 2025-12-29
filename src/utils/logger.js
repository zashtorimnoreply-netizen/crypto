/**
 * Structured logging utility
 * Provides consistent logging format across the application
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Format log entry as structured JSON
 * @param {string} level - Log level (INFO, ERROR, WARN, DEBUG)
 * @param {string} message - Log message
 * @param {object} context - Additional context data
 * @returns {object} Formatted log entry
 */
function formatLog(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: process.env.NODE_ENV || 'development',
    ...context,
  };
}

/**
 * Pretty print for development
 * @param {object} logEntry - Log entry object
 * @param {string} consoleMethod - Console method to use
 */
function prettyPrint(logEntry, consoleMethod = 'log') {
  const { timestamp, level, message, ...context } = logEntry;
  const timeStr = new Date(timestamp).toLocaleTimeString();
  const contextStr = Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : '';
  
  console[consoleMethod](`[${timeStr}] ${level}: ${message}`);
  if (contextStr) {
    console[consoleMethod](contextStr);
  }
}

/**
 * Output log entry
 * @param {object} logEntry - Log entry object
 * @param {string} consoleMethod - Console method to use
 */
function outputLog(logEntry, consoleMethod = 'log') {
  if (isDevelopment) {
    prettyPrint(logEntry, consoleMethod);
  } else {
    // Production: Output structured JSON
    console[consoleMethod](JSON.stringify(logEntry));
  }
}

const logger = {
  /**
   * Log informational message
   * @param {string} message - Log message
   * @param {object} context - Additional context
   */
  info: (message, context = {}) => {
    const logEntry = formatLog('INFO', message, context);
    outputLog(logEntry, 'log');
  },

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|object} error - Error object or context
   * @param {object} context - Additional context
   */
  error: (message, error = null, context = {}) => {
    const errorContext = error instanceof Error ? {
      error: error.message,
      stack: error.stack,
      ...context,
    } : {
      ...error,
      ...context,
    };
    
    const logEntry = formatLog('ERROR', message, errorContext);
    outputLog(logEntry, 'error');
  },

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} context - Additional context
   */
  warn: (message, context = {}) => {
    const logEntry = formatLog('WARN', message, context);
    outputLog(logEntry, 'warn');
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Log message
   * @param {object} context - Additional context
   */
  debug: (message, context = {}) => {
    if (isDevelopment) {
      const logEntry = formatLog('DEBUG', message, context);
      outputLog(logEntry, 'log');
    }
  },

  /**
   * Log fatal error message
   * @param {string} message - Log message
   * @param {Error} error - Error object
   * @param {object} context - Additional context
   */
  fatal: (message, error, context = {}) => {
    const logEntry = formatLog('FATAL', message, {
      error: error.message,
      stack: error.stack,
      ...context,
    });
    outputLog(logEntry, 'error');
  },
};

module.exports = logger;

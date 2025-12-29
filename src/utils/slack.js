/**
 * Slack alerting utility
 * Sends alerts to Slack webhook for critical issues
 */

const logger = require('./logger');

// Rate limiting to prevent spam
const alertHistory = new Map();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if alert is rate limited
 * @param {string} alertKey - Unique key for alert type
 * @returns {boolean} True if should be rate limited
 */
function isRateLimited(alertKey) {
  const lastAlertTime = alertHistory.get(alertKey);
  if (!lastAlertTime) {
    return false;
  }
  
  const timeSinceLastAlert = Date.now() - lastAlertTime;
  return timeSinceLastAlert < ALERT_COOLDOWN_MS;
}

/**
 * Record alert sent time
 * @param {string} alertKey - Unique key for alert type
 */
function recordAlert(alertKey) {
  alertHistory.set(alertKey, Date.now());
}

/**
 * Get color for severity level
 * @param {string} severity - Severity level
 * @returns {string} Hex color code
 */
function getSeverityColor(severity) {
  const colors = {
    critical: '#FF0000',  // Red
    error: '#FF6B6B',      // Light red
    warning: '#FFA500',    // Orange
    info: '#0099FF',       // Blue
    success: '#00C851',    // Green
  };
  return colors[severity] || colors.info;
}

/**
 * Get emoji for severity level
 * @param {string} severity - Severity level
 * @returns {string} Emoji
 */
function getSeverityEmoji(severity) {
  const emojis = {
    critical: '🚨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅',
  };
  return emojis[severity] || emojis.info;
}

/**
 * Send alert to Slack
 * @param {object} options - Alert options
 * @param {string} options.title - Alert title
 * @param {string} options.message - Alert message
 * @param {string} options.severity - Severity level (critical, error, warning, info, success)
 * @param {object} options.context - Additional context data
 * @returns {Promise<boolean>} True if sent successfully
 */
async function alert({ title, message, severity = 'info', context = {} }) {
  // Check if Slack webhook is configured
  if (!process.env.SLACK_WEBHOOK_URL) {
    logger.debug('Slack webhook not configured, skipping alert', { title, severity });
    return false;
  }

  // Generate alert key for rate limiting
  const alertKey = `${severity}:${title}`;
  
  // Check rate limiting
  if (isRateLimited(alertKey)) {
    logger.debug('Alert rate limited', { alertKey });
    return false;
  }

  try {
    const emoji = getSeverityEmoji(severity);
    const color = getSeverityColor(severity);
    
    // Build Slack message payload
    const payload = {
      text: `${emoji} ${title}`,
      attachments: [{
        color,
        text: message,
        fields: Object.entries(context).map(([key, value]) => ({
          title: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          short: String(value).length < 40,
        })),
        footer: 'Crypto Portfolio Monitor',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    // Send to Slack
    const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }

    // Record alert sent
    recordAlert(alertKey);
    
    logger.info('Slack alert sent', { title, severity });
    return true;
  } catch (error) {
    logger.error('Failed to send Slack alert', error, { title, severity });
    return false;
  }
}

/**
 * Send critical alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {object} context - Additional context
 */
async function critical(title, message, context = {}) {
  return alert({ title, message, severity: 'critical', context });
}

/**
 * Send error alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {object} context - Additional context
 */
async function error(title, message, context = {}) {
  return alert({ title, message, severity: 'error', context });
}

/**
 * Send warning alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {object} context - Additional context
 */
async function warning(title, message, context = {}) {
  return alert({ title, message, severity: 'warning', context });
}

/**
 * Send info alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {object} context - Additional context
 */
async function info(title, message, context = {}) {
  return alert({ title, message, severity: 'info', context });
}

/**
 * Send success alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {object} context - Additional context
 */
async function success(title, message, context = {}) {
  return alert({ title, message, severity: 'success', context });
}

module.exports = {
  alert,
  critical,
  error,
  warning,
  info,
  success,
};

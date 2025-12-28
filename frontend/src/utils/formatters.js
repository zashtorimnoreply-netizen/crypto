import { format, parseISO } from 'date-fns';

/**
 * Format a number as currency
 */
export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format a number as percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00%';
  }
  
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format a large number with abbreviations (K, M, B)
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) {
    return `${sign}${(absValue / 1e9).toFixed(decimals)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}${(absValue / 1e6).toFixed(decimals)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}${(absValue / 1e3).toFixed(decimals)}K`;
  }
  
  return `${sign}${absValue.toFixed(decimals)}`;
};

/**
 * Format a date
 */
export const formatDate = (dateString, formatString = 'MMM dd, yyyy') => {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
};

/**
 * Format crypto symbol
 */
export const formatSymbol = (symbol) => {
  if (!symbol) return '';
  return symbol.toUpperCase();
};

/**
 * Format trade side with color
 */
export const getTradeSideColor = (side) => {
  return side?.toLowerCase() === 'buy' ? 'text-green-600' : 'text-red-600';
};

/**
 * Format PnL (Profit and Loss) with sign and color class
 */
export const formatPnL = (value, percent, includeSign = true) => {
  if (value === null || value === undefined || isNaN(value)) {
    return { text: '$0.00 (0.00%)', colorClass: 'text-gray-600', isPositive: false };
  }
  
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const sign = includeSign && isPositive && !isNeutral ? '+' : '';
  
  const formattedValue = formatCurrency(value);
  const formattedPercent = percent !== undefined && percent !== null 
    ? `${sign}${percent.toFixed(2)}%` 
    : '';
  
  const text = formattedPercent 
    ? `${sign}${formattedValue} (${formattedPercent})` 
    : `${sign}${formattedValue}`;
  
  const colorClass = isNeutral 
    ? 'text-gray-600' 
    : isPositive 
      ? 'text-green-600' 
      : 'text-red-600';
  
  return { text, colorClass, isPositive, isNeutral };
};

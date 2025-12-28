/**
 * Get traffic light color for volatility
 * Green (low): <20%
 * Yellow (moderate): 20-50%
 * Red (high): >50%
 */
export const getVolatilityColor = (volatilityPercent) => {
  if (volatilityPercent === null || volatilityPercent === undefined) return 'gray';
  if (volatilityPercent < 20) return 'green';
  if (volatilityPercent <= 50) return 'yellow';
  return 'red';
};

/**
 * Get traffic light color for max drawdown
 * Green (minor): > -10%
 * Yellow (moderate): -10% to -30%
 * Red (severe): < -30%
 */
export const getDrawdownColor = (drawdownPercent) => {
  if (drawdownPercent === null || drawdownPercent === undefined) return 'gray';
  if (drawdownPercent > -10) return 'green';
  if (drawdownPercent >= -30) return 'yellow';
  return 'red';
};

/**
 * Get traffic light color for PnL
 * Green: > 0%
 * Red: < 0%
 */
export const getPnLColor = (pnlPercent) => {
  if (pnlPercent === null || pnlPercent === undefined) return 'gray';
  if (pnlPercent > 0) return 'green';
  if (pnlPercent < 0) return 'red';
  return 'gray';
};

/**
 * Get traffic light color for YTD performance vs benchmarks
 * Green: Outperforming BTC
 * Yellow: Between ETH and BTC
 * Red: Underperforming ETH
 */
export const getYTDPerformanceColor = (portfolioYTD, btcYTD, ethYTD) => {
  if (portfolioYTD === null || portfolioYTD === undefined) return 'gray';
  if (btcYTD === null || ethYTD === null) return 'gray';
  
  if (portfolioYTD >= btcYTD) return 'green';
  if (portfolioYTD >= ethYTD) return 'yellow';
  return 'red';
};

/**
 * Format currency with sign
 */
export const formatCurrencyWithSign = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  
  const absValue = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absValue);
  
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
};

/**
 * Format percentage with sign
 */
export const formatPercentWithSign = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) return '0.0%';
  
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

/**
 * Format date range
 */
export const formatDateRange = (fromDate, toDate) => {
  if (!fromDate || !toDate) return '';
  
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const from = new Date(fromDate).toLocaleDateString('en-US', options);
  const to = new Date(toDate).toLocaleDateString('en-US', options);
  
  return `${from} - ${to}`;
};

/**
 * Get risk level label for volatility
 */
export const getVolatilityLabel = (volatilityPercent) => {
  if (volatilityPercent === null || volatilityPercent === undefined) return 'N/A';
  if (volatilityPercent < 20) return 'Low';
  if (volatilityPercent <= 50) return 'Moderate';
  return 'High';
};

/**
 * Get risk level label for drawdown
 */
export const getDrawdownLabel = (drawdownPercent) => {
  if (drawdownPercent === null || drawdownPercent === undefined) return 'N/A';
  if (drawdownPercent > -10) return 'Minor';
  if (drawdownPercent >= -30) return 'Moderate';
  return 'Severe';
};

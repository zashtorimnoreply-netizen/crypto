/**
 * Comprehensive tooltip content library
 * Contains explanations for all metrics, features, and UI elements
 */

export const TOOLTIPS = {
  // Portfolio metrics
  totalPnL: "Your total profit or loss from all trades combined. Calculated as (Current Value - Cost Basis). Positive = profit, Negative = loss.",
  
  totalValue: "The current total value of all assets in your portfolio based on latest market prices.",
  
  volatility: "Measures how much your portfolio value fluctuates day-to-day. Higher volatility = more risk but potentially higher returns. Lower volatility = more stable returns. Calculated as annualized standard deviation of daily returns.",
  
  maxDrawdown: "The largest drop from a peak to a trough in your portfolio value. Shows the worst-case scenario you've experienced. More negative = bigger losses experienced. Helps you understand the maximum loss you might need to withstand.",
  
  ytdReturn: "Your portfolio's percentage return from January 1st to today. Compared against BTC and ETH benchmarks to show relative performance.",
  
  cagr: "Compound Annual Growth Rate - your average annual return if you held the portfolio for the entire period. Higher = better returns over time. This metric smooths out short-term volatility to show long-term performance.",
  
  sharpeRatio: "Measures risk-adjusted returns. Higher is better. Above 1.0 is good, above 2.0 is excellent. Calculated as (Average Return - Risk-Free Rate) / Volatility. Shows how much return you're getting per unit of risk.",
  
  sortinoRatio: "Similar to Sharpe Ratio but only considers downside volatility. Higher is better. Useful for understanding returns relative to harmful volatility.",
  
  totalReturn: "The percentage change in your portfolio value from the start to now, including all gains and losses.",
  
  // DCA metrics
  dcaInvested: "The total amount of money you would have invested with Dollar-Cost Averaging. Includes all regular purchases over the time period.",
  
  dcaFinalValue: "The final portfolio value after completing all DCA purchases at current market prices.",
  
  dcaReturn: "The percentage gain or loss from your DCA strategy compared to the total amount invested.",
  
  dcaVsHodl: "Comparison of DCA (regular purchases) vs. Buy-and-Hold (one-time investment). DCA can reduce timing risk by spreading purchases over time, potentially lowering average cost per unit.",
  
  dcaAmount: "The fixed amount to invest on each purchase date (weekly). E.g., $100 = $100 every week. This creates a consistent investment habit regardless of market conditions.",
  
  dcaPeriod: "The time period to simulate. YTD = Jan 1 to today, 1Y = past year, 3Y = past 3 years, etc. Longer periods better show the smoothing effect of DCA.",
  
  dcaFrequency: "How often to make purchases. Weekly is recommended for most retail investors. Daily provides more smoothing but may have higher fees.",
  
  // Allocation
  allocation: "How your portfolio is divided among different assets. Each slice shows the percentage of total value in that asset. Diversification can help reduce risk.",
  
  assetWeight: "The percentage of your total portfolio value held in this specific asset. Helps you understand concentration risk.",
  
  // Risk indicators
  volatilityRisk: "Risk level based on volatility: Green (low): < 30% | Yellow (medium): 30-50% | Red (high): > 50%. Lower volatility means more predictable returns.",
  
  drawdownRisk: "Risk level based on maximum drawdown: Green (low): > -20% | Yellow (medium): -20% to -40% | Red (high): < -40%. Larger drawdowns require more recovery time.",
  
  riskScore: "Overall risk assessment combining volatility and drawdown metrics. Green = lower risk, Yellow = moderate risk, Red = higher risk.",
  
  // DCA simulator
  dcaSimulator: "Test different Dollar-Cost Averaging strategies by simulating regular purchases over historical periods. See how consistent investing performs vs. lump sum investing.",
  
  // Comparison
  portfolioComparison: "Compare your portfolio performance against preset strategies: 100% BTC, 70% BTC/30% ETH (rebalanced daily), and other benchmarks. Helps evaluate if your strategy outperforms simple alternatives.",
  
  benchmark: "A standard strategy used for comparison. Common benchmarks include 100% BTC (the market leader) or 70/30 BTC/ETH mix (diversified crypto approach).",
  
  // Sharing
  sharePortfolio: "Generate a public link to share your portfolio snapshot. Viewers can see performance data without accessing your full account or sensitive information. The link shows metrics and charts but no personal details.",
  
  publicReport: "A read-only view of your portfolio's performance metrics and charts. Safe to share with others as it doesn't expose trading details or account access.",
  
  // Date ranges
  dateRange: "The time period to analyze. Longer periods provide better insight into long-term trends, while shorter periods show recent performance.",
  
  startDate: "The beginning of the analysis period. All calculations will start from this date forward.",
  
  endDate: "The end of the analysis period. Typically today's date for current analysis.",
  
  // Charts
  equityCurve: "Shows how your portfolio value changed over time. The line going up means profit, going down means loss. Compare against BTC/ETH benchmarks to see relative performance.",
  
  performanceChart: "Visualizes your portfolio's value changes over time, including comparison against market benchmarks.",
  
  // Import/Export
  exportPNG: "Download this chart as a PNG image file. Useful for presentations, reports, or sharing on social media. The image will be high resolution (2x scale) for clarity.",
  
  csvImport: "Upload a CSV file containing your trading history. Format should include: date, symbol, side (BUY/SELL), quantity, price.",
  
  bybitSync: "Connect to your Bybit account to automatically import your trading history. Requires API key and secret (read-only permissions recommended).",
  
  // Positions
  position: "A holding in your portfolio. Shows symbol, quantity, current value, and profit/loss for this specific asset.",
  
  unrealizedPnL: "Paper profit or loss on positions you still hold. Not realized until you sell. Calculated as (Current Price - Average Cost) × Quantity.",
  
  realizedPnL: "Actual profit or loss from completed trades where you've sold the asset. This is locked in and won't change with market prices.",
  
  costBasis: "The average price you paid for this asset, including all purchases. Used to calculate profit/loss.",
  
  // UI elements
  refresh: "Reload data from the server to get the latest portfolio information and prices.",
  
  settings: "Configure your portfolio settings, API connections, and preferences.",
  
  help: "Get help and explanations for features and metrics in the app.",
  
  // Validation messages
  invalidAmount: "Please enter a valid positive number greater than 0.",
  
  invalidDate: "Please enter a valid date in the format YYYY-MM-DD.",
  
  invalidDateRange: "End date must be after start date, and neither can be in the future.",
};

/**
 * Get tooltip text for a specific metric or feature
 * @param {string} key - The tooltip key
 * @returns {string} The tooltip text
 */
export function getTooltip(key) {
  return TOOLTIPS[key] || 'No description available.';
}

/**
 * Check if a tooltip exists for a given key
 * @param {string} key - The tooltip key
 * @returns {boolean} True if tooltip exists
 */
export function hasTooltip(key) {
  return key in TOOLTIPS;
}

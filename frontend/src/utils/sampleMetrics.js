/**
 * Sample metrics data for testing and development
 * This matches the structure returned by /api/portfolios/:portfolio_id/summary
 */

export const sampleMetricsData = {
  success: true,
  portfolio_id: '123e4567-e89b-12d3-a456-426614174000',
  portfolio_name: 'My Portfolio',
  current_state: {
    total_value: 25000.00,
    cost_basis: 19500.00,
    pnl: {
      value: 5500.00,
      percent: 28.21,
    },
    last_updated: new Date().toISOString(),
  },
  key_metrics: {
    volatility_percent: 45.2,
    max_drawdown_percent: -28.5,
    max_drawdown_from_date: '2024-06-15',
    max_drawdown_to_date: '2024-07-20',
    ytd_return_percent: 18.3,
    ytd_btc_return_percent: 42.5,
    ytd_eth_return_percent: 35.2,
    sharpe_ratio: 1.5,
  },
  allocation: [
    {
      symbol: 'BTC',
      holdings: 0.5,
      current_price: 42500.00,
      position_value: 21250.00,
      percent_of_portfolio: 85.0,
      pnl: { value: 4500.00, percent: 26.82 },
    },
    {
      symbol: 'ETH',
      holdings: 1.5,
      current_price: 2500.00,
      position_value: 3750.00,
      percent_of_portfolio: 15.0,
      pnl: { value: 1000.00, percent: 36.36 },
    },
  ],
  stats: {
    total_trades: 150,
    first_trade_date: '2024-01-01T00:00:00Z',
    last_trade_date: '2024-12-28T14:30:00Z',
    symbols: ['BTC', 'ETH'],
    exchanges: ['Bybit', 'Binance'],
  },
};

/**
 * Sample metrics with different scenarios
 */
export const sampleMetricsScenarios = {
  // Profitable portfolio with low risk
  lowRisk: {
    ...sampleMetricsData,
    current_state: {
      ...sampleMetricsData.current_state,
      pnl: { value: 2000.00, percent: 10.26 },
    },
    key_metrics: {
      volatility_percent: 15.0,
      max_drawdown_percent: -5.0,
      max_drawdown_from_date: '2024-06-15',
      max_drawdown_to_date: '2024-06-20',
      ytd_return_percent: 45.0,
      ytd_btc_return_percent: 42.5,
      ytd_eth_return_percent: 35.2,
      sharpe_ratio: 2.5,
    },
  },
  
  // Loss-making portfolio with high risk
  highRisk: {
    ...sampleMetricsData,
    current_state: {
      ...sampleMetricsData.current_state,
      total_value: 17000.00,
      pnl: { value: -2500.00, percent: -12.82 },
    },
    key_metrics: {
      volatility_percent: 65.0,
      max_drawdown_percent: -35.0,
      max_drawdown_from_date: '2024-05-01',
      max_drawdown_to_date: '2024-08-15',
      ytd_return_percent: -5.0,
      ytd_btc_return_percent: 42.5,
      ytd_eth_return_percent: 35.2,
      sharpe_ratio: 0.5,
    },
  },
  
  // Moderate risk portfolio
  moderateRisk: {
    ...sampleMetricsData,
    key_metrics: {
      volatility_percent: 35.0,
      max_drawdown_percent: -20.0,
      max_drawdown_from_date: '2024-06-01',
      max_drawdown_to_date: '2024-07-01',
      ytd_return_percent: 30.0,
      ytd_btc_return_percent: 42.5,
      ytd_eth_return_percent: 35.2,
      sharpe_ratio: 1.2,
    },
  },
  
  // Empty portfolio (no metrics yet)
  empty: {
    success: true,
    portfolio_id: '123e4567-e89b-12d3-a456-426614174000',
    portfolio_name: 'New Portfolio',
    current_state: {
      total_value: 0,
      cost_basis: 0,
      pnl: { value: 0, percent: 0 },
      last_updated: new Date().toISOString(),
    },
    key_metrics: {
      volatility_percent: 0,
      max_drawdown_percent: 0,
      ytd_return_percent: 0,
      ytd_btc_return_percent: 0,
      ytd_eth_return_percent: 0,
      sharpe_ratio: 0,
    },
    allocation: [],
    stats: {
      total_trades: 0,
      symbols: [],
      exchanges: [],
    },
  },
};

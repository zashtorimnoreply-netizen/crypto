# Metrics Display Components

This directory contains components for displaying portfolio performance metrics with risk indicators and traffic light visualization.

## Components

### MetricsCard

A card component that displays a single metric with traffic light indicator.

**Props:**
- `title` (string): Metric name (e.g., "Total PnL")
- `value` (string): Main value to display (e.g., "+$5,000")
- `subValue` (string, optional): Secondary value (e.g., "+25.5% return")
- `description` (string): One-sentence explanation of the metric
- `trafficLightColor` (string): Color indicator - 'green', 'yellow', 'red', or 'gray'
- `tooltip` (string): Detailed explanation shown on hover
- `valueColor` (string, optional): Color for the value text - 'green', 'red', or null
- `loading` (boolean): Show loading skeleton

**Example:**
```jsx
<MetricsCard
  title="Total Profit/Loss"
  value="+$5,000"
  subValue="+25.5% return"
  description="Your total gain or loss from initial investment"
  trafficLightColor="green"
  tooltip="This is your total gain/loss from your initial investment"
  valueColor="green"
/>
```

### MetricsGrid

A responsive grid that displays 4 key metrics cards in a 2x2 layout (desktop) or stacked (mobile).

**Props:**
- `metrics` (object): Portfolio metrics data from API
- `loading` (boolean): Show loading skeletons
- `error` (string, optional): Error message to display

**Data Structure:**
```javascript
{
  current_state: {
    total_value: 25000.00,
    cost_basis: 19500.00,
    pnl: {
      value: 5500.00,
      percent: 28.21
    }
  },
  key_metrics: {
    volatility_percent: 45.2,
    max_drawdown_percent: -28.5,
    max_drawdown_from_date: '2024-06-15',
    max_drawdown_to_date: '2024-07-20',
    ytd_return_percent: 18.3,
    ytd_btc_return_percent: 42.5,
    ytd_eth_return_percent: 35.2
  }
}
```

**Example:**
```jsx
import { useMetrics } from '../../hooks/useMetrics';
import MetricsGrid from './MetricsGrid';

const MyComponent = () => {
  const { metrics, loading, error } = useMetrics(portfolioId);
  
  return (
    <MetricsGrid 
      metrics={metrics} 
      loading={loading} 
      error={error} 
    />
  );
};
```

### RiskIndicators

A card showing risk metrics with traffic light indicators and labels.

**Props:**
- `metrics` (object): Portfolio metrics data (same as MetricsGrid)
- `loading` (boolean): Show loading skeletons

**Example:**
```jsx
<RiskIndicators metrics={metrics} loading={loading} />
```

## Traffic Light System

### Volatility
- **Green (Low)**: < 20%
- **Yellow (Moderate)**: 20% - 50%
- **Red (High)**: > 50%

### Max Drawdown
- **Green (Minor)**: > -10%
- **Yellow (Moderate)**: -10% to -30%
- **Red (Severe)**: < -30%

### PnL
- **Green**: > 0%
- **Red**: < 0%
- **Gray**: 0%

### YTD Performance (vs Benchmarks)
- **Green**: Outperforming BTC
- **Yellow**: Between ETH and BTC
- **Red**: Underperforming ETH

## Hooks

### useMetrics

Custom hook for fetching portfolio metrics data.

**Usage:**
```jsx
import { useMetrics } from '../../hooks/useMetrics';

const { metrics, loading, error, refetch } = useMetrics(portfolioId);
```

**Features:**
- Fetches from `/api/portfolios/:portfolio_id/summary`
- Auto-refreshes every 5 minutes
- Handles loading and error states
- Manual refetch with `refetch()`

## Utility Functions

All utility functions are in `utils/metricsHelpers.js`:

- `getVolatilityColor(volatilityPercent)` - Returns traffic light color
- `getDrawdownColor(drawdownPercent)` - Returns traffic light color
- `getPnLColor(pnlPercent)` - Returns traffic light color
- `getYTDPerformanceColor(portfolioYTD, btcYTD, ethYTD)` - Returns traffic light color
- `formatCurrencyWithSign(value)` - Formats currency with +/- sign
- `formatPercentWithSign(value, decimals)` - Formats percentage with sign
- `formatDateRange(fromDate, toDate)` - Formats date range
- `getVolatilityLabel(volatilityPercent)` - Returns 'Low', 'Moderate', or 'High'
- `getDrawdownLabel(drawdownPercent)` - Returns 'Minor', 'Moderate', or 'Severe'

## Styling

Components use Tailwind CSS with the following key classes:

### Colors
- Traffic Light Green: `bg-[#10B981]`
- Traffic Light Yellow: `bg-[#F59E0B]`
- Traffic Light Red: `bg-[#EF4444]`
- Border: `border-gray-200`
- Background: `bg-white`

### Responsive Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Cards */}
</div>
```

- Mobile (<768px): 1 column, stacked
- Tablet (768-1024px): 2 columns
- Desktop (>1024px): 2x2 grid

## Sample Data

For testing, use the sample data from `utils/sampleMetrics.js`:

```jsx
import { sampleMetricsData, sampleMetricsScenarios } from '../../utils/sampleMetrics';

// Use default sample
<MetricsGrid metrics={sampleMetricsData} />

// Use specific scenario
<MetricsGrid metrics={sampleMetricsScenarios.lowRisk} />
<MetricsGrid metrics={sampleMetricsScenarios.highRisk} />
<MetricsGrid metrics={sampleMetricsScenarios.moderateRisk} />
<MetricsGrid metrics={sampleMetricsScenarios.empty} />
```

## Error Handling

The components handle the following error states:

1. **No Data**: Shows "–" for missing values
2. **API Error**: Displays error message with retry button
3. **Loading**: Shows skeleton loaders
4. **Invalid Data**: Falls back to safe defaults

## Performance

- Components use `React.memo` internally
- Calculations are memoized with `useMemo`
- Auto-refresh is debounced
- Hover states use CSS transitions

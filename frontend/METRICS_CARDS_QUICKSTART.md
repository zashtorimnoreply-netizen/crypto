# Metrics Cards - Quick Start Guide

## Overview

The Metrics Display Cards feature provides a visual dashboard showing key portfolio performance indicators with color-coded risk assessments.

## Quick Usage

### Basic Implementation

```jsx
import { useMetrics } from '../hooks/useMetrics';
import { MetricsGrid, RiskIndicators } from '../components/Metrics';

function MyPortfolioDashboard() {
  const portfolioId = 'your-portfolio-id';
  const { metrics, loading, error, refetch } = useMetrics(portfolioId);

  return (
    <div>
      <h2>Key Performance Indicators</h2>
      <MetricsGrid 
        metrics={metrics} 
        loading={loading} 
        error={error} 
      />
      
      <h2>Risk Indicators</h2>
      <RiskIndicators 
        metrics={metrics} 
        loading={loading} 
      />
    </div>
  );
}
```

### Using Sample Data (for testing)

```jsx
import { MetricsGrid } from '../components/Metrics';
import { sampleMetricsData } from '../utils/sampleMetrics';

function TestPage() {
  return (
    <MetricsGrid metrics={sampleMetricsData} />
  );
}
```

## The 4 Metrics Cards

### 1. Total PnL
- **What**: Your total profit or loss
- **Shows**: Dollar amount and percentage
- **Colors**: Green (profit), Red (loss)

### 2. Volatility
- **What**: How much your portfolio value fluctuates
- **Shows**: Percentage (30-day annualized)
- **Colors**: 
  - Green: < 20% (stable, low risk)
  - Yellow: 20-50% (moderate risk)
  - Red: > 50% (high risk, more volatile)

### 3. Max Drawdown
- **What**: Biggest drop from peak to trough
- **Shows**: Percentage and date range
- **Colors**:
  - Green: > -10% (minor decline)
  - Yellow: -10% to -30% (moderate decline)
  - Red: < -30% (severe decline)

### 4. YTD Return
- **What**: Your return this year
- **Shows**: Your %, BTC %, ETH %
- **Colors**:
  - Green: Beating Bitcoin
  - Yellow: Between Ethereum and Bitcoin
  - Red: Below Ethereum

## Customization

### Individual Card

```jsx
import { MetricsCard } from '../components/Metrics';

<MetricsCard
  title="Custom Metric"
  value="+$1,234"
  subValue="+12.5%"
  description="This is a custom metric"
  trafficLightColor="green"
  tooltip="Detailed explanation here"
  valueColor="green"
/>
```

### Loading State

```jsx
<MetricsGrid metrics={null} loading={true} />
```

### Error State

```jsx
<MetricsGrid 
  metrics={null} 
  loading={false} 
  error="Failed to fetch data" 
/>
```

## API Response Format

The hook expects this data structure from the API:

```json
{
  "current_state": {
    "total_value": 25000.00,
    "cost_basis": 19500.00,
    "pnl": {
      "value": 5500.00,
      "percent": 28.21
    }
  },
  "key_metrics": {
    "volatility_percent": 45.2,
    "max_drawdown_percent": -28.5,
    "max_drawdown_from_date": "2024-06-15",
    "max_drawdown_to_date": "2024-07-20",
    "ytd_return_percent": 18.3,
    "ytd_btc_return_percent": 42.5,
    "ytd_eth_return_percent": 35.2
  }
}
```

## Features

✅ Auto-refreshes every 5 minutes  
✅ Responsive (works on mobile, tablet, desktop)  
✅ Loading skeletons  
✅ Error handling  
✅ Tooltips with detailed explanations  
✅ Color-coded risk indicators  

## Demo

To see all features in action:
1. Start the dev server: `npm run dev`
2. Visit: `http://localhost:5173/demo/metrics`
3. Try different scenarios and states

## Common Patterns

### Refresh on Action

```jsx
const { metrics, loading, refetch } = useMetrics(portfolioId);

const handleNewTrade = async () => {
  await saveTrade();
  refetch(); // Refresh metrics
};
```

### Conditional Rendering

```jsx
{metrics && (
  <MetricsGrid metrics={metrics} loading={loading} />
)}

{!metrics && !loading && (
  <p>No portfolio data available</p>
)}
```

### Multiple Portfolios

```jsx
const portfolios = ['id1', 'id2', 'id3'];

portfolios.map(id => {
  const { metrics } = useMetrics(id);
  return <MetricsGrid key={id} metrics={metrics} />;
});
```

## Styling

The components use Tailwind CSS. Override with custom classes:

```jsx
<div className="custom-wrapper">
  <MetricsGrid metrics={metrics} />
</div>

// In your CSS:
.custom-wrapper .bg-white {
  background-color: #your-color;
}
```

## Troubleshooting

### Metrics showing as N/A
- Check that the API is returning valid data
- Ensure `key_metrics` object is present in the response
- Values should be numbers, not null

### Traffic lights showing gray
- Gray means no data or invalid data
- Check that percentages are valid numbers
- Verify API response structure

### Tooltips not showing on mobile
- Click the info icon (ⓘ) on mobile
- Hover works on desktop only

### Auto-refresh not working
- Check that portfolioId is stable (not changing on every render)
- Look for console errors
- Verify API endpoint is accessible

## Need Help?

- See full documentation: `frontend/src/components/Metrics/README.md`
- Check demo page: `/demo/metrics`
- Review implementation: `METRICS_CARDS_IMPLEMENTATION.md`

# Portfolio Allocation View

## Overview
The Portfolio Allocation feature provides a comprehensive visual breakdown of asset allocation across a portfolio using both pie chart and table representations.

## Components

### AllocationChart (`src/components/Charts/AllocationChart.jsx`)
A donut-style pie chart showing portfolio allocation by asset.

**Features:**
- Donut chart with total portfolio value displayed in center
- Color-coded slices for each asset
- Percentage labels on slices (hidden for slices < 5%)
- Interactive hover tooltips showing symbol, holdings, value, and percentage
- Click on slice to highlight corresponding position in table
- Responsive sizing
- Empty state message when no data

**Props:**
- `data` - Array of allocation objects with symbol, value, percent, holdings
- `totalValue` - Total portfolio value to display in center
- `loading` - Boolean loading state
- `error` - Error message string
- `onRetry` - Callback function for retry button
- `onSliceClick` - Callback function when slice is clicked (receives symbol)
- `highlightedSymbol` - String symbol to highlight

### PositionsList (`src/components/Charts/PositionsList.jsx`)
A detailed table view showing all portfolio positions.

**Features:**
- Sortable columns (symbol, value, percent, PnL)
- Six columns: Symbol, Holdings, Current Price, Position Value, % of Portfolio, PnL
- Color-coded PnL (green for positive, red for negative)
- Alternating row colors for readability
- Highlight row on hover
- Click row to highlight position in pie chart
- Responsive table with horizontal scroll on mobile
- Empty state message when no positions

**Props:**
- `positions` - Array of position objects
- `loading` - Boolean loading state
- `error` - Error message string
- `onRetry` - Callback function for retry button
- `onPositionClick` - Callback function when row is clicked (receives symbol)
- `highlightedSymbol` - String symbol to highlight

## Hook

### useAllocation (`src/hooks/useAllocation.js`)
Custom hook for fetching and managing allocation data.

**Returns:**
- `allocation` - Array of allocation data (simplified for pie chart)
- `positions` - Array of detailed position data (for table)
- `totalValue` - Total portfolio value
- `loading` - Boolean loading state
- `error` - Error message string or null
- `lastUpdated` - ISO timestamp of last data update
- `refetch` - Function to manually refresh data

**Usage:**
```javascript
const { 
  allocation, 
  positions, 
  totalValue,
  loading, 
  error, 
  lastUpdated,
  refetch 
} = useAllocation(portfolioId);
```

## API Endpoints

### GET `/api/portfolios/:portfolio_id/allocation`
Returns simplified allocation data for pie chart.

**Response:**
```json
{
  "success": true,
  "portfolio_id": "uuid",
  "current_value": 25000.00,
  "allocation": [
    {
      "symbol": "BTC",
      "value": 21250.00,
      "percent": 85.0,
      "holdings": 0.5,
      "price": 42500.00
    }
  ],
  "last_updated": "2024-12-28T14:30:00Z"
}
```

### GET `/api/portfolios/:portfolio_id/positions`
Returns detailed position data with PnL calculations.

**Query Parameters:**
- `sort_by` - Field to sort by: "value" (default), "symbol", "percent", "pnl"
- `order` - Sort order: "desc" (default), "asc"

**Response:**
```json
{
  "success": true,
  "portfolio_id": "uuid",
  "total_value": 25000.00,
  "positions": [
    {
      "symbol": "BTC",
      "holdings": 0.5,
      "avg_cost": 40000.00,
      "entry_date": "2024-01-01T00:00:00Z",
      "current_price": 42500.00,
      "position_value": 21250.00,
      "cost_value": 20000.00,
      "pnl": {
        "value": 1250.00,
        "percent": 6.25
      },
      "percent_of_portfolio": 85.0,
      "roi": 6.25,
      "trades_count": 5,
      "exchange_sources": ["Bybit", "Binance"]
    }
  ],
  "summary": {
    "total_positions": 2,
    "winning_positions": 1,
    "losing_positions": 0,
    "total_pnl": 1250.00,
    "total_roi": 5.0
  },
  "last_updated": "2024-12-28T14:30:00Z"
}
```

## Pages

### Dashboard (`src/pages/Dashboard.jsx`)
Shows allocation chart and positions list alongside other portfolio metrics.

### Portfolio (`src/pages/Portfolio.jsx`)
Dedicated allocation view with larger chart and table layout.
- 40% width: AllocationChart
- 60% width: PositionsList
- Left sidebar: Portfolio summary stats
- Interactive highlighting between chart and table

## Data Flow

1. User navigates to Dashboard or Portfolio page
2. `useAllocation` hook fetches data from both `/allocation` and `/positions` endpoints
3. Data is processed and passed to chart and table components
4. User interactions (click on slice/row) update `highlightedSymbol` state
5. Both components highlight the selected asset
6. On trade import, `refetch()` is called to update allocation data

## Formatting

### Currency
- USD: 2 decimal places (e.g., $42,500.00)
- Crypto: 4-8 decimal places based on value (e.g., 0.12345678 BTC)

### Percentages
- Always 1 decimal place (e.g., 85.0%)

### PnL Display
- Format: "+$1,250 (+6.25%)" or "-$500 (-2.5%)"
- Color: Green for positive, red for negative, gray for neutral

### Large Numbers
- Use abbreviations: 1.2M, 150K, 2.5B

## Responsive Behavior

### Desktop (>1024px)
- Side-by-side layout (chart left, table right)
- Full table with all columns visible

### Tablet (768-1024px)
- Stacked layout (chart on top, table below)
- Table with horizontal scroll if needed

### Mobile (<768px)
- Single column layout
- Smaller chart size
- Horizontal scrolling table

## Error Handling

### Empty Portfolio
- Display "No positions yet" message
- Provide link/context about importing data

### API Error
- Display error message with retry button
- Log error details to console
- Maintain last known good data if available

### Missing Price Data
- Use last known price
- Display "as of" timestamp
- Log warning to console

## Future Enhancements (Phase 3.5)

- **Drill-down**: Click position to show complete trade history
- **Rebalancing Suggestions**: Recommend optimal allocation adjustments
- **Asset Class Grouping**: Group by asset class (crypto, stablecoins, etc.)
- **Historical Allocation**: Show allocation changes over time
- **Export**: Download allocation data as CSV/PDF

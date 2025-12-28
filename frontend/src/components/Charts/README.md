# Chart Components

This directory contains chart visualization components for the crypto portfolio application.

## AllocationChart

A donut-style pie chart showing portfolio allocation by asset.

### Usage

```jsx
import AllocationChart from './components/Charts/AllocationChart';

<AllocationChart 
  data={allocation}
  totalValue={totalValue}
  loading={loading}
  error={error}
  onRetry={refetch}
  onSliceClick={(symbol) => console.log('Clicked:', symbol)}
  highlightedSymbol={selectedSymbol}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | Array | Yes | Array of allocation objects with shape: `{ symbol, value, percent, holdings, price }` |
| `totalValue` | Number | No | Total portfolio value to display in center of donut |
| `loading` | Boolean | No | Show loading state |
| `error` | String | No | Error message to display |
| `onRetry` | Function | No | Callback when retry button is clicked |
| `onSliceClick` | Function | No | Callback when a slice is clicked, receives symbol |
| `highlightedSymbol` | String | No | Symbol to highlight in chart |

### Features

- Donut chart with total value in center
- Color-coded slices
- Percentage labels (hidden for < 5% slices)
- Interactive tooltips with holdings and value
- Click to highlight slice
- Hover effects with expansion
- Legend with percentages

## PositionsList

A sortable table displaying detailed position information.

### Usage

```jsx
import PositionsList from './components/Charts/PositionsList';

<PositionsList
  positions={positions}
  loading={loading}
  error={error}
  onRetry={refetch}
  onPositionClick={(symbol) => console.log('Clicked:', symbol)}
  highlightedSymbol={selectedSymbol}
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `positions` | Array | Yes | Array of position objects (see below) |
| `loading` | Boolean | No | Show loading state |
| `error` | String | No | Error message to display |
| `onRetry` | Function | No | Callback when retry button is clicked |
| `onPositionClick` | Function | No | Callback when a row is clicked, receives symbol |
| `highlightedSymbol` | String | No | Symbol to highlight in table |

### Position Object Shape

```javascript
{
  symbol: "BTC",
  holdings: 0.5,
  current_price: 42500.00,
  position_value: 21250.00,
  percent_of_portfolio: 85.0,
  pnl: {
    value: 1250.00,
    percent: 6.25
  }
}
```

### Features

- Sortable columns (click header to sort)
- Six columns: Symbol, Holdings, Price, Value, %, PnL
- Color-coded PnL (green/red/gray)
- Alternating row colors
- Hover highlighting
- Click to select row
- Responsive table
- Smart decimal formatting

## EquityCurveChart

A line chart showing portfolio value over time.

(Existing component - see FRONTEND_SETUP.md for details)

## ComparisonChart

A comparison chart for portfolio performance vs benchmarks.

(Existing component - see FRONTEND_SETUP.md for details)

## Interactions

The AllocationChart and PositionsList components are designed to work together:

```jsx
const [highlightedSymbol, setHighlightedSymbol] = useState(null);

<AllocationChart
  data={allocation}
  onSliceClick={setHighlightedSymbol}
  highlightedSymbol={highlightedSymbol}
/>

<PositionsList
  positions={positions}
  onPositionClick={setHighlightedSymbol}
  highlightedSymbol={highlightedSymbol}
/>
```

When a user clicks a pie slice or table row, both components highlight that asset.

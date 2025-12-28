# Simulations API Documentation

This document describes the DCA Simulator and Preset Portfolios API endpoints.

## Overview

The Simulations API provides two main features:
1. **DCA Simulator** - Compare Dollar-Cost Averaging strategy vs Buy-and-Hold (HODL)
2. **Preset Portfolios** - Analyze performance of pre-configured portfolio allocations

## Table of Contents

- [DCA Simulator](#dca-simulator)
- [Preset Portfolios](#preset-portfolios)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Caching](#caching)

---

## DCA Simulator

### POST `/api/simulations/dca`

Run a Dollar-Cost Averaging simulation comparing DCA strategy against Buy-and-Hold strategy.

#### Request Body

```json
{
  "startDate": "2024-01-01",     // Start date (YYYY-MM-DD)
  "endDate": "2024-12-31",       // End date (YYYY-MM-DD)
  "amount": 100,                 // Purchase amount in USD per interval
  "interval": 7,                 // Purchase interval in days (7 = weekly)
  "asset": "BTC",                // Asset symbol: 'BTC' or 'ETH'
  "pair": "70/30"                // Optional: ratio for BTC/ETH pair
}
```

#### Single Asset Example

```bash
curl -X POST http://localhost:3000/api/simulations/dca \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
  }'
```

#### Asset Pair Example (70% BTC, 30% ETH)

```bash
curl -X POST http://localhost:3000/api/simulations/dca \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 7,
    "asset": "BTC",
    "pair": "70/30"
  }'
```

#### Response

```json
{
  "success": true,
  "asset": "BTC",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  },
  "dca": {
    "frequency": "weekly",
    "amount": 100,
    "totalInvested": 1300,
    "purchaseCount": 13
  },
  "results": {
    "dca": {
      "totalValue": 1486.07,
      "totalInvested": 1300,
      "pnl": {
        "value": 186.07,
        "percent": 14.31
      },
      "maxDrawdown": 5.67,
      "volatility": 237.73,
      "cagr": 71.01
    },
    "hodl": {
      "totalValue": 1692.72,
      "totalInvested": 1300,
      "pnl": {
        "value": 392.72,
        "percent": 30.21
      },
      "maxDrawdown": 7.93,
      "volatility": 30.3,
      "cagr": 188.29
    }
  },
  "dailyData": [
    {
      "date": "2024-01-01",
      "dcaValue": 99.9,
      "dcaHoldings": 0.00232,
      "hodlValue": 99.9,
      "hodlHoldings": 0.00232,
      "invested": 100
    }
    // ... more daily data
  ]
}
```

---

## Preset Portfolios

Pre-configured portfolio allocations for comparing different investment strategies.

### Available Presets

1. **BTC_100** - 100% Bitcoin allocation
2. **BTC_70_ETH_30** - 70% Bitcoin, 30% Ethereum (with daily rebalancing)

### GET `/api/simulations/presets`

Get performance data for all preset portfolios.

#### Query Parameters

- `startDate` (required) - Start date in YYYY-MM-DD format
- `endDate` (required) - End date in YYYY-MM-DD format

#### Example

```bash
curl "http://localhost:3000/api/simulations/presets?startDate=2024-01-01&endDate=2024-06-30"
```

#### Response

```json
{
  "success": true,
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "presets": [
    {
      "preset": "BTC_100",
      "name": "BTC 100%",
      "description": "100% Bitcoin allocation",
      "period": {
        "startDate": "2024-01-01",
        "endDate": "2024-06-30"
      },
      "initialCapital": 10000,
      "results": {
        "totalValue": 11531.3,
        "pnl": {
          "value": 1531.3,
          "percent": 15.31
        },
        "maxDrawdown": 22.81,
        "volatility": 31.42,
        "cagr": 33.08
      },
      "allocation": {
        "BTC": {
          "percent": 100,
          "value": 11531.3,
          "holdings": 0.23456789
        }
      },
      "dailyData": [...]
    },
    {
      "preset": "BTC_70_ETH_30",
      // ... similar structure
    }
  ]
}
```

### GET `/api/simulations/presets/:presetName`

Get performance data for a specific preset portfolio.

#### Path Parameters

- `presetName` - Preset identifier (`BTC_100` or `BTC_70_ETH_30`)

#### Query Parameters

- `startDate` (required) - Start date in YYYY-MM-DD format
- `endDate` (required) - End date in YYYY-MM-DD format

#### Example

```bash
curl "http://localhost:3000/api/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-03-31"
```

#### Response

```json
{
  "success": true,
  "preset": "BTC_100",
  "name": "BTC 100%",
  "description": "100% Bitcoin allocation",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  },
  "initialCapital": 10000,
  "results": {
    "totalValue": 13033.96,
    "pnl": {
      "value": 3033.96,
      "percent": 30.34
    },
    "maxDrawdown": 7.93,
    "volatility": 30.3,
    "cagr": 189.45
  },
  "allocation": {
    "BTC": {
      "percent": 100,
      "value": 13033.96,
      "holdings": 0.23277313
    }
  },
  "dailyData": [
    {
      "date": "2024-01-01",
      "totalValue": 10000,
      "btcValue": 10000,
      "btcHoldings": 0.23277313,
      "btcPrice": 42960.28
    }
    // ... more daily data
  ]
}
```

---

## Data Models

### Metrics Object

All simulations return the following performance metrics:

```typescript
{
  totalValue: number;        // Current portfolio value in USD
  totalInvested?: number;    // Total amount invested (DCA only)
  pnl: {
    value: number;           // Profit/Loss in USD
    percent: number;         // Profit/Loss as percentage
  };
  maxDrawdown: number;       // Maximum drawdown as percentage
  volatility: number;        // Annualized volatility as percentage
  cagr: number;              // Compound Annual Growth Rate as percentage
}
```

### Calculation Details

- **Commission**: 0.1% applied to each purchase
- **DCA Strategy**: Purchases asset(s) at fixed intervals (e.g., weekly)
- **HODL Strategy**: Buys once at the start with total amount that would have been invested via DCA
- **Rebalancing**: BTC_70_ETH_30 preset rebalances daily to maintain 70/30 ratio
- **Max Drawdown**: Largest peak-to-trough decline during the period
- **Volatility**: Annualized standard deviation of daily returns
- **CAGR**: Compound Annual Growth Rate based on starting and ending values

---

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "error": "Missing required fields: startDate, endDate, amount, interval, asset"
}
```

```json
{
  "success": false,
  "error": "Invalid date format. Use YYYY-MM-DD"
}
```

```json
{
  "success": false,
  "error": "Start date must be before end date"
}
```

```json
{
  "success": false,
  "error": "Amount must be a positive number"
}
```

### Not Found Errors (404)

```json
{
  "success": false,
  "error": "No historical price data found for BTC"
}
```

```json
{
  "success": false,
  "error": "Unknown preset: INVALID. Available: BTC_100, BTC_70_ETH_30"
}
```

---

## Caching

Both DCA simulations and preset portfolios are cached in Redis with a 1-hour TTL (Time To Live).

### Cache Keys

- **DCA**: `dca:{asset}:{startDate}:{endDate}:{amount}:{interval}:{pair}`
- **Preset**: `preset:{presetName}:{startDate}:{endDate}`

### Cache Benefits

- Reduces computation time for repeated queries
- Minimizes database load
- Improves API response times
- Automatically expires after 1 hour to ensure fresh data

### Verifying Cache

Check server logs for cache hit/miss messages:
```
DCA Cache HIT: dca:BTC:2024-01-01:2024-03-31:100:7:single
Preset Cache MISS: preset:BTC_100:2024-01-01:2024-06-30
```

---

## Testing

### Seed Test Data

Before testing, seed the database with historical price data:

```bash
node scripts/seed-test-prices.js
```

This creates synthetic price data for BTC and ETH for the year 2024.

### Run Test Suite

```bash
./scripts/test-simulations.sh
```

This script tests all endpoints with various scenarios including error cases.

---

## Implementation Details

### Services

- **dcaSimulatorService.js** - Core DCA calculation logic
- **presetPortfoliosService.js** - Preset portfolio calculation logic

### Controllers

- **simulationsController.js** - Request validation and error handling

### Routes

- **simulations.js** - API endpoint definitions

### Key Features

1. **Historical Price Integration** - Uses existing priceService for data
2. **Flexible Date Ranges** - Support any date range with available price data
3. **Single & Paired Assets** - DCA simulator supports both single assets and pairs
4. **Daily Rebalancing** - BTC/ETH preset maintains allocation through daily rebalancing
5. **Comprehensive Metrics** - Returns volatility, drawdown, CAGR, and more
6. **Efficient Caching** - Redis caching for improved performance
7. **Robust Error Handling** - Clear error messages for all failure cases

---

## Future Enhancements

Potential improvements for future versions:

1. Additional presets (e.g., equal-weight, custom allocations)
2. Support for more assets (SOL, ADA, etc.)
3. Custom rebalancing frequencies (weekly, monthly)
4. Transaction cost analysis
5. Tax-loss harvesting simulation
6. Portfolio optimization suggestions
7. Risk-adjusted return metrics (Sharpe ratio, Sortino ratio)

---

## Support

For questions or issues:
1. Check server logs for detailed error messages
2. Verify price data exists for the requested date range
3. Ensure Redis is running for caching functionality
4. Review validation requirements in error responses

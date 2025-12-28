# Bybit API Integration Guide

## Overview
The Bybit integration allows you to automatically sync your spot trading history from Bybit exchange into your portfolio.

## Prerequisites

### 1. Create Bybit API Key
1. Log in to your Bybit account
2. Go to API Management
3. Create a new API key with **read-only** permissions
4. Enable "Read" permission for "Order" and "Position"
5. Save your API key and secret securely

**Security Note**: Use read-only API keys. The system does not require write permissions.

## API Endpoint

### POST `/api/portfolios/:portfolio_id/sync-bybit`

Sync spot trading history from Bybit exchange.

**Request:**
```bash
curl -X POST http://localhost:3000/api/portfolios/YOUR_PORTFOLIO_ID/sync-bybit \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-bybit-api-key",
    "api_secret": "your-bybit-api-secret"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "fetched_count": 150,
  "inserted_count": 145,
  "skipped_count": 5,
  "errors": [],
  "message": "Synced 150 trades from Bybit. 145 new trades added, 5 duplicates skipped."
}
```

**Error Responses:**

Invalid API credentials (401):
```json
{
  "success": false,
  "error": "Invalid API credentials",
  "details": "Authentication failed. Please verify your API key and secret."
}
```

Portfolio not found (404):
```json
{
  "success": false,
  "error": "Portfolio not found",
  "details": "No portfolio found with ID: xxx"
}
```

Bybit API unavailable (503):
```json
{
  "success": false,
  "error": "Bybit API temporarily unavailable",
  "details": "Unable to connect to Bybit API. Please try again later."
}
```

## Features

### Automatic Pagination
- Fetches all trades from your account history
- Handles Bybit's 100 trades per request limit
- Continues fetching until all trades are retrieved
- Safety limit of 100 iterations (10,000 trades max)

### Duplicate Detection
The system prevents duplicate trades using two methods:
1. **Source ID matching**: Checks if trade with same Bybit trade ID exists
2. **Attribute matching**: Checks timestamp + symbol + side + quantity (0.0001% tolerance)

### Symbol Normalization
Trading pairs are automatically normalized:
- `BTC/USDT` → `BTC`
- `ETH/USDC` → `ETH`
- `SOL/USDT` → `SOL`

Stablecoins are aggregated:
- `USDT`, `USDC`, `DAI` → `USD`

### Rate Limiting & Retry Logic
- Automatic exponential backoff for rate limits
- Retries with delays: 1s, 2s, 4s
- Handles network timeouts gracefully
- Maximum 3 retry attempts per request

### Security
- API credentials are **not stored** in the database
- Credentials are only used during the sync request
- API keys/secrets are **never logged**
- Use read-only API keys for safety

## Usage Examples

### First Time Sync
```bash
# Replace with your portfolio ID and API credentials
curl -X POST http://localhost:3000/api/portfolios/123e4567-e89b-12d3-a456-426614174000/sync-bybit \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_api_key_here",
    "api_secret": "your_api_secret_here"
  }'
```

### Re-sync (Updates Only)
Running the sync again will only add new trades. Existing trades are automatically skipped:
```bash
# Same command - only new trades will be added
curl -X POST http://localhost:3000/api/portfolios/123e4567-e89b-12d3-a456-426614174000/sync-bybit \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_api_key_here",
    "api_secret": "your_api_secret_here"
  }'
```

## Limitations

- **Spot trades only**: Futures and derivatives are not included
- **Max iterations**: 100 iterations (approximately 10,000 trades)
- **Rate limits**: Subject to Bybit API rate limits (handled automatically)
- **Historical data**: Limited to what Bybit API provides (typically last 2 years)

## Troubleshooting

### "Invalid API credentials"
- Verify your API key and secret are correct
- Check that the API key has "Read" permissions
- Ensure the API key is not expired
- Verify the API key is for the correct Bybit environment (mainnet vs testnet)

### "Bybit API temporarily unavailable"
- Check Bybit's status page
- Wait a few minutes and try again
- Verify your internet connection

### "Portfolio not found"
- Verify the portfolio ID in the URL is correct
- Ensure the portfolio exists in your database

### Some trades are missing
- Check Bybit API rate limits
- Verify the trades are spot trades (not futures)
- Check if trades are within Bybit's historical data limit

## Best Practices

1. **Use read-only API keys** - Never use API keys with trading permissions
2. **Regular syncs** - Run sync periodically to keep your portfolio up to date
3. **Monitor errors** - Check the `errors` array in the response for any issues
4. **Verify results** - Check `inserted_count` vs `skipped_count` to verify sync worked as expected

## Database Storage

Synced trades are stored in the `trades` table with:
- `exchange`: Set to `'Bybit'`
- `source_id`: Bybit's trade ID (for duplicate detection)
- All standard trade fields: timestamp, symbol, side, quantity, price, fee

## Next Steps

After syncing trades:
1. View your portfolio performance
2. Export portfolio reports
3. Analyze trading history
4. Set up automated syncs (future feature)

# E2E Test Suite - Crypto Portfolio Visualizer

This directory contains the end-to-end test suite for Phase 6.1 of the Crypto Portfolio Visualizer project.

## Quick Start

```bash
# Install dependencies (includes test dependencies)
npm install

# Set up database
npm run setup:db
npm run migrate:up

# Seed test prices (required for DCA simulations)
npm run seed:prices

# Start the server
npm run dev

# Run E2E tests (in another terminal)
npm run test:e2e

# OR run with bash script
npm run test:e2e:bash
```

## Test Files

| File | Description | Usage |
|------|-------------|-------|
| `run-e2e-tests.js` | Node.js test runner with axios | `npm run test:e2e` |
| `e2e-test.sh` | Bash/cURL based test runner | `npm run test:e2e:bash` |
| `fixtures/test-trades.csv` | Sample CSV with 15 trades | Used by tests |
| `E2E_TEST_REPORT.md` | Test report template | View test results |

## Test Coverage

### 1. CSV Import Flow
- ✅ Create portfolio
- ✅ Upload valid CSV with 15 trades
- ✅ Verify trades imported
- ✅ Check allocation endpoint
- ✅ Reject invalid CSV (missing headers)
- ✅ Atomic transaction handling

### 2. Bybit API Sync Flow
- ✅ Missing credentials rejected (400)
- ✅ Invalid credentials rejected (401/503)
- ✅ Invalid portfolio ID rejected (400/404)
- ✅ Duplicate detection

### 3. Portfolio Metrics Flow
- ✅ Summary endpoint validation
- ✅ Positions endpoint validation
- ✅ Equity curve endpoint validation
- ✅ Invalid UUID rejection

### 4. DCA Simulator Flow
- ✅ BTC DCA simulation
- ✅ ETH DCA simulation
- ✅ Asset pair (70/30) simulation
- ✅ Parameter validation
- ✅ Date range validation
- ✅ Asset validation

### 5. Preset Comparison
- ✅ All presets endpoint
- ✅ BTC 100% preset
- ✅ BTC/ETH 70/30 preset
- ✅ Invalid preset rejection
- ✅ Missing parameters rejection

### 6. Public Report Flow
- ✅ Create report
- ✅ Access public report (no auth)
- ✅ List portfolio reports
- ✅ Delete report
- ✅ Invalid UUID rejection

### 7. Performance Tests
- ✅ DCA simulation < 5s
- ✅ Presets endpoint < 5s
- ✅ Summary endpoint < 5s

### 8. Edge Cases
- ✅ Non-existent portfolio (404)
- ✅ Invalid UUID format (400)
- ✅ Empty portfolio handling
- ✅ Malformed date rejection
- ✅ Negative amount rejection
- ✅ Zero interval rejection

## Running Individual Tests

### Bash Script Options

```bash
# Run all tests
bash tests/e2e-test.sh

# Show help
bash tests/e2e-test.sh --help
```

### Node.js Script

The Node.js script supports the following environment variables:

```bash
# Change API URL
export API_URL=http://localhost:3000
node tests/run-e2e-tests.js
```

## Prerequisites

1. **PostgreSQL** running on localhost:5432
2. **Redis** running on localhost:6379
3. **Database migrations** applied
4. **Test prices** seeded for 2024

### Database Setup

```bash
# Create database and run migrations
npm run setup:db
npm run migrate:up

# Seed test prices
npm run seed:prices
```

## Expected Test Output

```
========================================
  CRYPTO PORTFOLIO VISUALIZER - E2E TESTS
  Phase 6.1: End-to-End Testing
========================================

Health Check
========================================
  ✅ PASS - Server is healthy
  PostgreSQL: connected
  Redis: connected

1. CSV Import Flow Tests
========================================
  ✅ PASS - Create portfolio
  ✅ PASS - CSV upload success
  ✅ PASS - Trades imported count
  ✅ PASS - Allocation endpoint valid
  ✅ PASS - Allocation has data
  ✅ PASS - Missing headers rejected

...

========================================
  TEST SUMMARY
========================================

  Passed: 45
  Failed: 0

✅ All tests passed!
```

## Test Results

After running tests, results are saved to:
- `tests/test-results.json` - JSON format (Node.js runner)
- `tests/E2E_TEST_REPORT.md` - Markdown report template

## Troubleshooting

### "Server is unhealthy"
Make sure the server is running:
```bash
npm run dev
```

### Database connection errors
Check your `.env` file:
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/crypto_portfolio
```

### Redis connection errors
Check Redis is running:
```bash
redis-cli ping
# Should return PONG
```

### Test prices not found
Run the seed script:
```bash
npm run seed:prices
```

## Test Data

The test CSV (`fixtures/test-trades.csv`) contains 15 realistic trades:

| Trade # | Date | Symbol | Side | Qty | Price | Exchange |
|---------|------|--------|------|-----|-------|----------|
| 1 | 2024-01-15 | BTC | BUY | 0.5 | 42,000 | Binance |
| 2 | 2024-01-20 | ETH | BUY | 5 | 2,300 | Kraken |
| 3 | 2024-02-01 | BTC | BUY | 0.25 | 51,000 | Binance |
| ... | ... | ... | ... | ... | ... | ... |
| 15 | 2024-08-01 | BTC | BUY | 0.4 | 64,000 | Binance |

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Run E2E Tests
  run: |
    npm run dev &
    sleep 5
    npm run test:e2e
```

## Performance Benchmarks

| Endpoint | Target | Typical |
|----------|--------|---------|
| /health | < 100ms | ~50ms |
| /portfolios/:id/summary | < 5s | ~200ms |
| /simulations/dca | < 5s | ~500ms |
| /simulations/presets | < 5s | ~300ms |
| /portfolios/:id/allocation | < 5s | ~150ms |

## Notes

- Tests run sequentially to avoid race conditions
- Some tests require the server to be running
- Bybit sync tests require real API credentials
- Performance tests may be slower on first run (cache cold)

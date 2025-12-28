#!/bin/bash

# Test script for DCA Simulator and Preset Portfolios endpoints
# Run this after seeding test price data with: node scripts/seed-test-prices.js

BASE_URL="http://localhost:3000/api"

echo "================================================"
echo "Testing DCA Simulator & Preset Portfolios APIs"
echo "================================================"
echo ""

# Test 1: DCA Simulation - Single Asset (BTC)
echo "Test 1: DCA Simulation - Single Asset (BTC)"
echo "--------------------------------------------"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
  }' | jq '{success, asset, dca, results}'
echo ""

# Test 2: DCA Simulation - Asset Pair (BTC/ETH 70/30)
echo "Test 2: DCA Simulation - Asset Pair (BTC/ETH 70/30)"
echo "---------------------------------------------------"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 7,
    "asset": "BTC",
    "pair": "70/30"
  }' | jq '{success, asset, dca, results}'
echo ""

# Test 3: All Preset Portfolios
echo "Test 3: All Preset Portfolios"
echo "------------------------------"
curl -s "${BASE_URL}/simulations/presets?startDate=2024-01-01&endDate=2024-06-30" \
  | jq '{success, startDate, endDate, presets: [.presets[] | {preset, name, initialCapital, results}]}'
echo ""

# Test 4: Single Preset - BTC 100%
echo "Test 4: Single Preset - BTC 100%"
echo "---------------------------------"
curl -s "${BASE_URL}/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-03-31" \
  | jq '{success, preset, name, period, initialCapital, results, allocation}'
echo ""

# Test 5: Single Preset - BTC/ETH 70/30
echo "Test 5: Single Preset - BTC/ETH 70/30"
echo "--------------------------------------"
curl -s "${BASE_URL}/simulations/presets/BTC_70_ETH_30?startDate=2024-01-01&endDate=2024-03-31" \
  | jq '{success, preset, name, period, initialCapital, results, allocation}'
echo ""

# Test 6: Error Handling - Missing Parameters
echo "Test 6: Error Handling - Missing Parameters"
echo "-------------------------------------------"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "amount": 100,
    "interval": 7
  }' | jq .
echo ""

# Test 7: Error Handling - Invalid Date Range
echo "Test 7: Error Handling - Invalid Date Range"
echo "-------------------------------------------"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-03-31",
    "endDate": "2024-01-01",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
  }' | jq .
echo ""

# Test 8: Error Handling - Invalid Preset
echo "Test 8: Error Handling - Invalid Preset"
echo "----------------------------------------"
curl -s "${BASE_URL}/simulations/presets/INVALID?startDate=2024-01-01&endDate=2024-03-31" \
  | jq .
echo ""

# Test 9: Caching Verification
echo "Test 9: Caching Verification"
echo "----------------------------"
echo "Making same request twice to verify caching..."
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "amount": 50,
    "interval": 7,
    "asset": "BTC"
  }' > /dev/null
echo "First request completed (should cache)"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "amount": 50,
    "interval": 7,
    "asset": "BTC"
  }' > /dev/null
echo "Second request completed (should use cache)"
echo "Check server logs for 'Cache HIT' message"
echo ""

# Test 10: Daily Data Sample
echo "Test 10: Daily Data Sample"
echo "---------------------------"
curl -s -X POST "${BASE_URL}/simulations/dca" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
  }' | jq '{success, dailyDataCount: (.dailyData | length), sampleDays: .dailyData[0:3]}'
echo ""

echo "================================================"
echo "All tests completed!"
echo "================================================"

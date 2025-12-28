#!/bin/bash

# Test script for Bybit sync endpoint
# This is a sample script to test the Bybit API integration

# Configuration
API_BASE_URL="http://localhost:3000"
PORTFOLIO_ID="your-portfolio-id-here"
BYBIT_API_KEY="your-api-key-here"
BYBIT_API_SECRET="your-api-secret-here"

echo "========================================="
echo "Bybit Sync Test Script"
echo "========================================="
echo ""

# Check if server is running
echo "1. Checking if server is running..."
curl -s "${API_BASE_URL}/health" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Server is running"
else
    echo "✗ Server is not running. Please start the server first with 'npm start'"
    exit 1
fi

echo ""
echo "2. Testing Bybit sync endpoint..."
echo "   POST ${API_BASE_URL}/api/portfolios/${PORTFOLIO_ID}/sync-bybit"
echo ""

# Make the API request
response=$(curl -s -X POST "${API_BASE_URL}/api/portfolios/${PORTFOLIO_ID}/sync-bybit" \
    -H "Content-Type: application/json" \
    -d "{
        \"api_key\": \"${BYBIT_API_KEY}\",
        \"api_secret\": \"${BYBIT_API_SECRET}\"
    }")

# Pretty print the response
echo "Response:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"

echo ""
echo "========================================="
echo "Test completed"
echo "========================================="

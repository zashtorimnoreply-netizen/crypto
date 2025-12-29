#!/bin/bash

# End-to-End Test Script for Crypto Portfolio Visualizer
# Tests all critical user flows as specified in Phase 6.1
# 
# Usage: bash tests/e2e-test.sh
# 
# Prerequisites:
# 1. PostgreSQL running with migrations applied
# 2. Redis running for caching
# 3. Test prices seeded: node scripts/seed-test-prices.js
# 4. Server running: npm run dev

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
API_BASE="${API_URL}/api"

# Counters
PASSED=0
FAILED=0

# Logging functions
log_section() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
}

log_test() {
    local name=$1
    local passed=$2
    local details=$3
    
    if [ "$passed" = "true" ]; then
        echo -e "  ${GREEN}✅ PASS${NC} - $name"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ FAIL${NC} - $name"
        if [ -n "$details" ]; then
            echo -e "         ${YELLOW}Details: $details${NC}"
        fi
        ((FAILED++))
    fi
}

log_info() {
    echo -e "  ${BLUE}ℹ $1${NC}"
}

# Helper to make requests
curl_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X "$method" "${API_BASE}${endpoint}"
    fi
}

# Parse JSON response (simple parser for status and specific fields)
get_json_field() {
    local json=$1
    local field=$2
    echo "$json" | grep -o "\"${field}\"[^,}]*" | head -1 | sed 's/.*://' | tr -d '"' | tr -d ' '
}

# Store portfolio ID
PORTFOLIO_ID=""

# ============================================
# HEALTH CHECK
# ============================================
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CRYPTO PORTFOLIO VISUALIZER - E2E TESTS${NC}"
echo -e "${CYAN}  Phase 6.1: End-to-End Testing${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
log_section("Health Check")

HEALTH=$(curl_request "GET" "/health")
HEALTH_STATUS=$(get_json_field "$HEALTH" "status")

if [ "$HEALTH_STATUS" = "ok" ]; then
    log_test "Server is healthy" "true"
    echo "  PostgreSQL: $(get_json_field "$HEALTH" "postgres")"
    echo "  Redis: $(get_json_field "$HEALTH" "redis")"
else
    log_test "Server is healthy" "false" "Status: $HEALTH_STATUS"
    echo ""
    echo -e "${YELLOW}Make sure the server is running: npm run dev${NC}"
    exit 1
fi

# ============================================
# TEST 1: CSV IMPORT FLOW
# ============================================
log_section("1. CSV Import Flow Tests")

# Create portfolio
log_info "Creating test portfolio..."
CREATE_RESP=$(curl_request "POST" "/portfolios" '{"name": "E2E Test Portfolio"}')
CREATE_SUCCESS=$(get_json_field "$CREATE_RESP" "success")

if [ "$CREATE_SUCCESS" = "true" ]; then
    log_test "Create portfolio" "true"
    PORTFOLIO_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Portfolio ID: $PORTFOLIO_ID"
else
    log_test "Create portfolio" "false" "$(get_json_field "$CREATE_RESP" "error")"
    PORTFOLIO_ID=""
fi

if [ -n "$PORTFOLIO_ID" ]; then
    # Upload CSV
    log_info "Uploading test CSV with 15 trades..."
    CSV_RESP=$(curl -s -X POST "${API_BASE}/portfolios/${PORTFOLIO_ID}/import-csv" \
        -H "Content-Type: multipart/form-data" \
        -F "file=@tests/fixtures/test-trades.csv")
    
    CSV_SUCCESS=$(get_json_field "$CSV_RESP" "success")
    IMPORTED=$(get_json_field "$CSV_RESP" "imported")
    ERRORS=$(get_json_field "$CSV_RESP" "errors")
    
    if [ "$CSV_SUCCESS" = "true" ]; then
        log_test "CSV upload success" "true"
    else
        log_test "CSV upload success" "false" "$(get_json_field "$CSV_RESP" "message")"
    fi
    
    if [ -n "$IMPORTED" ] && [ "$IMPORTED" -ge 10 ]; then
        log_test "Trades imported count" "true"
        echo "  Imported: $IMPORTED, Errors: $ERRORS"
    else
        log_test "Trades imported count" "false" "Expected 10+, got $IMPORTED"
    fi
    
    # Check allocation
    log_info "Checking allocation endpoint..."
    ALLOC_RESP=$(curl_request "GET" "/portfolios/${PORTFOLIO_ID}/allocation")
    ALLOC_SUCCESS=$(get_json_field "$ALLOC_RESP" "success")
    
    if [ "$ALLOC_SUCCESS" = "true" ]; then
        log_test "Allocation endpoint valid" "true"
        
        # Count assets in allocation
        ASSETS=$(echo "$ALLOC_RESP" | grep -o '"symbol":"[^"]*"' | wc -l)
        if [ "$ASSETS" -gt 0 ]; then
            log_test "Allocation has data ($ASSETS assets)" "true"
            echo "  Assets: $(echo "$ALLOC_RESP" | grep -o '"symbol":"[^"]*"' | cut -d'"' -f4 | tr '\n' ' ')"
        else
            log_test "Allocation has data" "false" "Empty allocation"
        fi
    else
        log_test "Allocation endpoint valid" "false" "$(get_json_field "$ALLOC_RESP" "error")"
    fi
fi

# Test missing headers
log_info "Testing CSV with missing headers..."
echo "timestamp,symbol,side" > /tmp/missing-headers.csv
MISSING_RESP=$(curl -s -X POST "${API_BASE}/portfolios/${PORTFOLIO_ID}/import-csv" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@/tmp/missing-headers.csv")

if [ "$(get_json_field "$MISSING_RESP" "statusCode" 2>/dev/null)" = "400" ] || \
   [ "$(get_json_field "$MISSING_RESP" "success" 2>/dev/null)" = "false" ]; then
    log_test "Missing headers rejected" "true"
else
    log_test "Missing headers rejected" "false"
fi
rm -f /tmp/missing-headers.csv

# ============================================
# TEST 2: BYBIT SYNC FLOW
# ============================================
log_section("2. Bybit API Sync Flow Tests")

if [ -n "$PORTFOLIO_ID" ]; then
    # Test missing credentials
    log_info "Testing missing credentials..."
    MISSING_CREDS=$(curl_request "POST" "/portfolios/${PORTFOLIO_ID}/sync-bybit" '{}')
    
    if [ "$(get_json_field "$MISSING_CREDS" "statusCode" 2>/dev/null)" = "400" ] || \
       [ "$(get_json_field "$MISSING_CREDS" "success" 2>/dev/null)" = "false" ]; then
        log_test "Missing credentials rejected" "true"
    else
        log_test "Missing credentials rejected" "false"
    fi
    
    # Test invalid credentials
    log_info "Testing invalid credentials..."
    INVALID_CREDS=$(curl_request "POST" "/portfolios/${PORTFOLIO_ID}/sync-bybit" \
        '{"api_key":"invalid","api_secret":"invalid"}')
    
    CREDS_STATUS=$(get_json_field "$INVALID_CREDS" "statusCode" 2>/dev/null)
    if [ "$CREDS_STATUS" = "401" ] || [ "$CREDS_STATUS" = "503" ]; then
        log_test "Invalid credentials rejected" "true"
    else
        log_test "Invalid credentials rejected" "false" "Got status: $CREDS_STATUS"
    fi
    echo "  Response: $(echo "$INVALID_CREDS" | grep -o '"error":"[^"]*"' | head -1)"
fi

# Test invalid portfolio ID
log_info "Testing invalid portfolio ID..."
INVALID_PORT=$(curl_request "POST" "/portfolios/invalid-uuid/sync-bybit" \
    '{"api_key":"test","api_secret":"test"}')

PORT_STATUS=$(get_json_field "$INVALID_PORT" "statusCode" 2>/dev/null)
if [ "$PORT_STATUS" = "400" ] || [ "$PORT_STATUS" = "404" ]; then
    log_test "Invalid portfolio ID rejected" "true"
else
    log_test "Invalid portfolio ID rejected" "false" "Got status: $PORT_STATUS"
fi

# ============================================
# TEST 3: PORTFOLIO METRICS FLOW
# ============================================
log_section("3. Portfolio Metrics Flow Tests")

if [ -n "$PORTFOLIO_ID" ]; then
    # Test summary endpoint
    log_info "Testing summary endpoint..."
    SUMMARY_RESP=$(curl_request "GET" "/portfolios/${PORTFOLIO_ID}/summary")
    SUMMARY_SUCCESS=$(get_json_field "$SUMMARY_RESP" "success")
    
    if [ "$SUMMARY_SUCCESS" = "true" ]; then
        log_test "Summary endpoint valid" "true"
        
        TOTAL_VALUE=$(get_json_field "$SUMMARY_RESP" "total_value")
        PNL_VALUE=$(get_json_field "$SUMMARY_RESP" "value" | head -1)
        PNL_PERCENT=$(get_json_field "$SUMMARY_RESP" "percent" | head -1)
        
        echo "  Total Value: \$$TOTAL_VALUE"
        echo "  PnL: \$$PNL_VALUE ($PNL_PERCENT%)"
        
        if [ -n "$TOTAL_VALUE" ]; then
            log_test "Current state present" "true"
        else
            log_test "Current state present" "false"
        fi
        
        # Check allocation in summary
        ALLOC_COUNT=$(echo "$SUMMARY_RESP" | grep -o '"symbol":"[^"]*"' | wc -l)
        if [ "$ALLOC_COUNT" -gt 0 ]; then
            log_test "Allocation in summary" "true"
        else
            log_test "Allocation in summary" "false"
        fi
    else
        log_test "Summary endpoint valid" "false" "$(get_json_field "$SUMMARY_RESP" "error")"
    fi
    
    # Test positions endpoint
    log_info "Testing positions endpoint..."
    POS_RESP=$(curl_request "GET" "/portfolios/${PORTFOLIO_ID}/positions")
    POS_SUCCESS=$(get_json_field "$POS_RESP" "success")
    
    if [ "$POS_SUCCESS" = "true" ]; then
        log_test "Positions endpoint valid" "true"
    else
        log_test "Positions endpoint valid" "false" "$(get_json_field "$POS_RESP" "error")"
    fi
    
    # Test equity curve endpoint
    log_info "Testing equity curve endpoint..."
    EQUITY_RESP=$(curl_request "GET" "/portfolios/${PORTFOLIO_ID}/equity-curve")
    EQUITY_SUCCESS=$(get_json_field "$EQUITY_RESP" "success")
    
    if [ "$EQUITY_SUCCESS" = "true" ]; then
        log_test "Equity curve endpoint valid" "true"
        
        DATA_POINTS=$(echo "$EQUITY_RESP" | grep -o '"date"' | wc -l)
        echo "  Data points: $DATA_POINTS"
        
        if [ "$DATA_POINTS" -gt 0 ]; then
            log_test "Equity curve has data" "true"
        else
            log_test "Equity curve has data" "false"
        fi
    else
        log_test "Equity curve endpoint valid" "false" "$(get_json_field "$EQUITY_RESP" "error")"
    fi
fi

# Test invalid portfolio ID for metrics
log_info "Testing invalid portfolio ID for metrics..."
INVALID_SUMMARY=$(curl_request "GET" "/portfolios/not-a-uuid/summary")
SUMMARY_STATUS=$(get_json_field "$INVALID_SUMMARY" "statusCode" 2>/dev/null)

if [ "$SUMMARY_STATUS" = "400" ]; then
    log_test "Invalid UUID rejected" "true"
else
    log_test "Invalid UUID rejected" "false" "Got status: $SUMMARY_STATUS"
fi

# ============================================
# TEST 4: DCA SIMULATOR FLOW
# ============================================
log_section("4. DCA Simulator Flow Tests")

# Test valid BTC DCA
log_info "Testing BTC DCA simulation..."
DCA_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
}')

DCA_SUCCESS=$(get_json_field "$DCA_RESP" "success")
if [ "$DCA_SUCCESS" = "true" ]; then
    log_test "DCA simulation valid" "true"
    
    TOTAL_INVESTED=$(echo "$DCA_RESP" | grep -o '"totalInvested"[^,}]*' | cut -d':' -f2)
    PURCHASE_COUNT=$(echo "$DCA_RESP" | grep -o '"purchaseCount"[^,}]*' | cut -d':' -f2)
    
    echo "  Total Invested: \$$TOTAL_INVESTED"
    echo "  Purchases: $PURCHASE_COUNT"
    
    # Check for results
    if echo "$DCA_RESP" | grep -q "dca"; then
        log_test "DCA results present" "true"
    else
        log_test "DCA results present" "false"
    fi
    
    if echo "$DCA_RESP" | grep -q "hodl"; then
        log_test "HODL results present" "true"
    else
        log_test "HODL results present" "false"
    fi
else
    log_test "DCA simulation valid" "false" "$(get_json_field "$DCA_RESP" "error")"
fi

# Test asset pair
log_info "Testing DCA with asset pair (70/30)..."
PAIR_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 7,
    "asset": "BTC",
    "pair": "70/30"
}')

if [ "$(get_json_field "$PAIR_RESP" "success")" = "true" ]; then
    log_test "Asset pair simulation" "true"
else
    log_test "Asset pair simulation" "false" "$(get_json_field "$PAIR_RESP" "error")"
fi

# Test ETH
log_info "Testing ETH DCA simulation..."
ETH_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "amount": 50,
    "interval": 14,
    "asset": "ETH"
}')

if [ "$(get_json_field "$ETH_RESP" "success")" = "true" ]; then
    log_test "ETH DCA simulation" "true"
else
    log_test "ETH DCA simulation" "false" "$(get_json_field "$ETH_RESP" "error")"
fi

# Test missing parameters
log_info "Testing missing parameters..."
MISSING_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "amount": 100
}')

if [ "$(get_json_field "$MISSING_RESP" "statusCode" 2>/dev/null)" = "400" ] || \
   [ "$(get_json_field "$MISSING_RESP" "success" 2>/dev/null)" = "false" ]; then
    log_test "Missing params rejected" "true"
else
    log_test "Missing params rejected" "false"
fi

# Test invalid date range
log_info "Testing invalid date range..."
INVALID_DATE_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-06-30",
    "endDate": "2024-01-01",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
}')

if [ "$(get_json_field "$INVALID_DATE_RESP" "statusCode" 2>/dev/null)" = "400" ]; then
    log_test "Invalid date range rejected" "true"
else
    log_test "Invalid date range rejected" "false"
fi

# Test invalid asset
log_info "Testing invalid asset..."
INVALID_ASSET_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 7,
    "asset": "INVALID"
}')

if [ "$(get_json_field "$INVALID_ASSET_RESP" "statusCode" 2>/dev/null)" = "400" ]; then
    log_test "Invalid asset rejected" "true"
else
    log_test "Invalid asset rejected" "false"
fi

# ============================================
# TEST 5: PRESET COMPARISON FLOW
# ============================================
log_section("5. Preset Portfolio Comparison Tests")

# Test all presets
log_info "Testing all presets endpoint..."
PRESETS_RESP=$(curl_request "GET" "/simulations/presets?startDate=2024-01-01&endDate=2024-06-30")
PRESETS_SUCCESS=$(get_json_field "$PRESETS_RESP" "success")

if [ "$PRESETS_SUCCESS" = "true" ]; then
    log_test "Presets endpoint valid" "true"
    
    PRESET_COUNT=$(echo "$PRESETS_RESP" | grep -o '"preset":"[^"]*"' | wc -l)
    echo "  Presets found: $PRESET_COUNT"
    
    if [ "$PRESET_COUNT" -ge 2 ]; then
        log_test "Multiple presets returned" "true"
    else
        log_test "Multiple presets returned" "false" "Expected 2+, got $PRESET_COUNT"
    fi
else
    log_test "Presets endpoint valid" "false" "$(get_json_field "$PRESETS_RESP" "error")"
fi

# Test BTC 100%
log_info "Testing BTC 100% preset..."
BTC100_RESP=$(curl_request "GET" "/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-03-31")

if [ "$(get_json_field "$BTC100_RESP" "success")" = "true" ]; then
    log_test "BTC 100% preset" "true"
else
    log_test "BTC 100% preset" "false" "$(get_json_field "$BTC100_RESP" "error")"
fi

# Test BTC/ETH 70/30
log_info "Testing BTC/ETH 70/30 preset..."
BTC70ETH30_RESP=$(curl_request "GET" "/simulations/presets/BTC_70_ETH_30?startDate=2024-01-01&endDate=2024-03-31")

if [ "$(get_json_field "$BTC70ETH30_RESP" "success")" = "true" ]; then
    log_test "BTC/ETH 70/30 preset" "true"
else
    log_test "BTC/ETH 70/30 preset" "false" "$(get_json_field "$BTC70ETH30_RESP" "error")"
fi

# Test invalid preset
log_info "Testing invalid preset..."
INVALID_PRESET_RESP=$(curl_request "GET" "/simulations/presets/INVALID?startDate=2024-01-01&endDate=2024-03-31")

if [ "$(get_json_field "$INVALID_PRESET_RESP" "statusCode" 2>/dev/null)" = "404" ]; then
    log_test "Invalid preset rejected" "true"
else
    log_test "Invalid preset rejected" "false"
fi

# Test missing dates
log_info "Testing missing date parameters..."
MISSING_DATES_RESP=$(curl_request "GET" "/simulations/presets")

if [ "$(get_json_field "$MISSING_DATES_RESP" "statusCode" 2>/dev/null)" = "400" ]; then
    log_test "Missing dates rejected" "true"
else
    log_test "Missing dates rejected" "false"
fi

# ============================================
# TEST 6: PUBLIC REPORT FLOW
# ============================================
log_section("6. Public Report & Sharing Flow Tests")

if [ -n "$PORTFOLIO_ID" ]; then
    # Create report
    log_info "Creating public report..."
    CREATE_REPORT_RESP=$(curl_request "POST" "/reports" "{\"portfolioId\":\"${PORTFOLIO_ID}\",\"title\":\"E2E Test Report\"}")
    CREATE_SUCCESS=$(get_json_field "$CREATE_REPORT_RESP" "success")
    
    if [ "$CREATE_SUCCESS" = "true" ]; then
        log_test "Create report success" "true"
        REPORT_UUID=$(echo "$CREATE_REPORT_RESP" | grep -o '"reportUuid":"[^"]*"' | cut -d'"' -f4)
        echo "  Report UUID: $REPORT_UUID"
    else
        log_test "Create report success" "false" "$(get_json_field "$CREATE_REPORT_RESP" "error")"
        REPORT_UUID=""
    fi
    
    # Access public report
    if [ -n "$REPORT_UUID" ]; then
        log_info "Accessing public report..."
        PUBLIC_RESP=$(curl_request "GET" "/reports/public/${REPORT_UUID}")
        PUBLIC_SUCCESS=$(get_json_field "$PUBLIC_RESP" "success")
        
        if [ "$PUBLIC_SUCCESS" = "true" ]; then
            log_test "Public report accessible" "true"
            
            if echo "$PUBLIC_RESP" | grep -q "snapshot"; then
                log_test "Report has snapshot" "true"
            else
                log_test "Report has snapshot" "false"
            fi
        else
            log_test "Public report accessible" "false" "$(get_json_field "$PUBLIC_RESP" "error")"
        fi
        
        # List reports
        log_info "Listing portfolio reports..."
        LIST_RESP=$(curl_request "GET" "/portfolios/${PORTFOLIO_ID}/reports")
        
        if [ "$(get_json_field "$LIST_RESP" "success" 2>/dev/null)" = "true" ] || \
           echo "$LIST_RESP" | grep -q "reports"; then
            log_test "List reports works" "true"
        else
            log_test "List reports works" "false"
        fi
        
        # Delete report
        log_info "Deleting test report..."
        DELETE_RESP=$(curl_request "DELETE" "/reports/${REPORT_UUID}" "{\"portfolioId\":\"${PORTFOLIO_ID}\"}")
        
        if [ "$(get_json_field "$DELETE_RESP" "success" 2>/dev/null)" = "true" ]; then
            log_test "Delete report works" "true"
        else
            log_test "Delete report works" "false"
        fi
    fi
    
    # Test invalid report UUID
    log_info "Testing invalid report UUID..."
    INVALID_REPORT_RESP=$(curl_request "GET" "/reports/public/invalid-uuid")
    REPORT_STATUS=$(get_json_field "$INVALID_REPORT_RESP" "statusCode" 2>/dev/null)
    
    if [ "$REPORT_STATUS" = "400" ] || [ "$REPORT_STATUS" = "404" ]; then
        log_test "Invalid report UUID rejected" "true"
    else
        log_test "Invalid report UUID rejected" "false"
    fi
fi

# ============================================
# TEST 7: PERFORMANCE TESTS
# ============================================
log_section("7. Performance Tests")

# Time DCA simulation
log_info "Testing DCA simulation response time..."
START_TIME=$(date +%s%N)
DCA_PERF_RESP=$(curl_request "POST" "/simulations/dca" '{"startDate":"2024-01-01","endDate":"2024-12-31","amount":100,"interval":7,"asset":"BTC"}')
END_TIME=$(date +%s%N)
DCA_DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

echo "  DCA Response Time: ${DCA_DURATION}ms"
if [ "$DCA_DURATION" -lt 5000 ]; then
    log_test "DCA < 5s" "true"
else
    log_test "DCA < 5s" "false" "${DCA_DURATION}ms exceeded 5s"
fi

# Time presets
log_info "Testing presets endpoint response time..."
START_TIME=$(date +%s%N)
PRESETS_PERF_RESP=$(curl_request "GET" "/simulations/presets?startDate=2024-01-01&endDate=2024-06-30")
END_TIME=$(date +%s%N)
PRESETS_DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

echo "  Presets Response Time: ${PRESETS_DURATION}ms"
if [ "$PRESETS_DURATION" -lt 5000 ]; then
    log_test "Presets < 5s" "true"
else
    log_test "Presets < 5s" "false" "${PRESETS_DURATION}ms exceeded 5s"
fi

# ============================================
# TEST 8: EDGE CASES
# ============================================
log_section("8. Edge Cases & Error Handling")

# Test non-existent portfolio
log_info "Testing non-existent portfolio..."
FAKE_PORTFOLIO="00000000-0000-0000-0000-000000000000"
FAKE_RESP=$(curl_request "GET" "/portfolios/${FAKE_PORTFOLIO}/summary")
FAKE_STATUS=$(get_json_field "$FAKE_RESP" "statusCode" 2>/dev/null)

if [ "$FAKE_STATUS" = "404" ]; then
    log_test "Non-existent portfolio 404" "true"
else
    log_test "Non-existent portfolio 404" "false" "Got status: $FAKE_STATUS"
fi

# Test invalid UUID format
log_info "Testing invalid UUID format..."
INVALID_UUID_RESP=$(curl_request "GET" "/portfolios/not-a-uuid/summary")
UUID_STATUS=$(get_json_field "$INVALID_UUID_RESP" "statusCode" 2>/dev/null)

if [ "$UUID_STATUS" = "400" ]; then
    log_test "Invalid UUID rejected" "true"
else
    log_test "Invalid UUID rejected" "false" "Got status: $UUID_STATUS"
fi

# Test empty portfolio
log_info "Testing empty portfolio creation..."
EMPTY_RESP=$(curl_request "POST" "/portfolios" '{"name":"Empty Portfolio"}')
EMPTY_SUCCESS=$(get_json_field "$EMPTY_RESP" "success")

if [ "$EMPTY_SUCCESS" = "true" ]; then
    log_test "Empty portfolio creation" "true"
    EMPTY_ID=$(echo "$EMPTY_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$EMPTY_ID" ]; then
        EMPTY_SUMMARY=$(curl_request "GET" "/portfolios/${EMPTY_ID}/summary")
        
        if echo "$EMPTY_SUMMARY" | grep -q '"allocation":\[\]'; then
            log_test "Empty portfolio shows empty allocation" "true"
        else
            log_test "Empty portfolio shows empty allocation" "false"
        fi
    fi
else
    log_test "Empty portfolio creation" "false"
fi

# Test malformed dates
log_info "Testing malformed date format..."
MALFORMED_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "01-15-2024",
    "endDate": "06-30-2024",
    "amount": 100,
    "interval": 7,
    "asset": "BTC"
}')

MALFORMED_STATUS=$(get_json_field "$MALFORMED_RESP" "statusCode" 2>/dev/null)
if [ "$MALFORMED_STATUS" = "400" ]; then
    log_test "Malformed date rejected" "true"
else
    log_test "Malformed date rejected" "false"
fi

# Test negative amount
log_info "Testing negative amount..."
NEGATIVE_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": -100,
    "interval": 7,
    "asset": "BTC"
}')

NEGATIVE_STATUS=$(get_json_field "$NEGATIVE_RESP" "statusCode" 2>/dev/null)
if [ "$NEGATIVE_STATUS" = "400" ]; then
    log_test "Negative amount rejected" "true"
else
    log_test "Negative amount rejected" "false"
fi

# Test zero interval
log_info "Testing zero interval..."
ZERO_RESP=$(curl_request "POST" "/simulations/dca" '{
    "startDate": "2024-01-01",
    "endDate": "2024-06-30",
    "amount": 100,
    "interval": 0,
    "asset": "BTC"
}')

ZERO_STATUS=$(get_json_field "$ZERO_RESP" "statusCode" 2>/dev/null)
if [ "$ZERO_STATUS" = "400" ]; then
    log_test "Zero interval rejected" "true"
else
    log_test "Zero interval rejected" "false"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  TEST SUMMARY${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "  ${GREEN}Passed: ${PASSED}${NC}"
echo -e "  ${RED}Failed: ${FAILED}${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    exit 1
fi

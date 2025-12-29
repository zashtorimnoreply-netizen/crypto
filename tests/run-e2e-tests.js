#!/usr/bin/env node

/**
 * Node.js E2E Test Runner with better JSON handling
 * Requires: npm install axios form-data
 * 
 * Usage: node tests/run-e2e-tests.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;
const TIMEOUT = 30000;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

function test(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status} - ${name}`, color);
  if (details && !passed) {
    log(`         Details: ${details}`, 'yellow');
  }
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'blue');
}

// Create axios instance for multipart forms
function createMultipartClient() {
  return axios.create({
    baseURL: API_BASE,
    timeout: TIMEOUT,
    headers: { ...FormData.getHeaders() },
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================
async function runTests() {
  console.log('\n' + '='.repeat(70));
  log('     CRYPTO PORTFOLIO VISUALIZER - E2E TEST SUITE', 'cyan');
  log('     Phase 6.1: End-to-End Testing', 'cyan');
  console.log('='.repeat(70));

  const startTime = Date.now();
  console.log(`\nStarted at: ${new Date().toISOString()}`);
  console.log(`API Base URL: ${API_BASE}`);

  let portfolioId = null;
  let reportUuid = null;

  // ============================================
  // HEALTH CHECK
  // ============================================
  logSection('Health Check');

  try {
    const health = await api.get(`${BASE_URL}/health`);
    if (health.data.status === 'ok') {
      test('Server is healthy', true);
      console.log(`  PostgreSQL: ${health.data.postgres}`);
      console.log(`  Redis: ${health.data.redis}`);
    } else {
      test('Server is healthy', false, `Status: ${health.data.status}`);
      console.log('\n❗ Make sure the server is running: npm run dev');
      process.exit(1);
    }
  } catch (error) {
    test('Server is healthy', false, error.message);
    console.log('\n❗ Make sure the server is running: npm run dev');
    process.exit(1);
  }

  // ============================================
  // TEST 1: CSV IMPORT FLOW
  // ============================================
  logSection('1. CSV Import Flow Tests');

  // Create portfolio
  logInfo('Creating test portfolio...');
  try {
    const create = await api.post('/portfolios', { name: 'E2E Test Portfolio' });
    if (create.data.success) {
      test('Create portfolio', true);
      portfolioId = create.data.portfolio?.id || create.data.id;
      console.log(`  Portfolio ID: ${portfolioId}`);
    } else {
      test('Create portfolio', false, create.data.error);
    }
  } catch (error) {
    test('Create portfolio', false, error.message);
  }

  if (portfolioId) {
    // Upload CSV
    logInfo('Uploading test CSV with 15 trades...');
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(path.join(__dirname, 'fixtures/test-trades.csv')));
      
      const multipartClient = createMultipartClient();
      const csv = await multipartClient.post(`/portfolios/${portfolioId}/import-csv`, form);
      
      if (csv.data.success) {
        test('CSV upload success', true);
      } else {
        test('CSV upload success', false, csv.data.message);
      }
      
      if (csv.data.imported >= 10) {
        test('Trades imported count', true);
        console.log(`  Imported: ${csv.data.imported}, Errors: ${csv.data.errors}`);
      } else {
        test('Trades imported count', false, `Expected 10+, got ${csv.data.imported}`);
      }

      // Check allocation
      logInfo('Checking allocation endpoint...');
      const allocation = await api.get(`/portfolios/${portfolioId}/allocation`);
      
      if (allocation.data.success) {
        test('Allocation endpoint valid', true);
        
        const assets = allocation.data.allocation || [];
        if (assets.length > 0) {
          test('Allocation has data', true);
          console.log(`  Assets: ${assets.map(a => a.symbol).join(', ')}`);
        } else {
          test('Allocation has data', false, 'Empty allocation');
        }
      } else {
        test('Allocation endpoint valid', false, allocation.data.error);
      }
    } catch (error) {
      test('CSV import flow', false, error.message);
    }
  }

  // Test missing headers
  logInfo('Testing CSV with missing headers...');
  try {
    const form = new FormData();
    form.append('file', Buffer.from('timestamp,symbol,side\n2024-01-01T10:00:00Z,BTC'), 'test.csv');
    
    const multipartClient = createMultipartClient();
    const missing = await multipartClient.post(`/portfolios/${portfolioId}/import-csv`, form);
    
    if (missing.data.success === false || missing.status === 400) {
      test('Missing headers rejected', true);
    } else {
      test('Missing headers rejected', false);
    }
  } catch (error) {
    test('Missing headers rejected', true);
  }

  // ============================================
  // TEST 2: BYBIT SYNC FLOW
  // ============================================
  logSection('2. Bybit API Sync Flow Tests');

  if (portfolioId) {
    // Test missing credentials
    logInfo('Testing missing credentials...');
    try {
      const missing = await api.post(`/portfolios/${portfolioId}/sync-bybit`, {});
      test('Missing credentials rejected', false);
    } catch (error) {
      if (error.response?.status === 400) {
        test('Missing credentials rejected', true);
      } else {
        test('Missing credentials rejected', false, `Got ${error.response?.status}`);
      }
    }

    // Test invalid credentials
    logInfo('Testing invalid credentials...');
    try {
      const invalid = await api.post(`/portfolios/${portfolioId}/sync-bybit`, {
        api_key: 'invalid',
        api_secret: 'invalid',
      });
      test('Invalid credentials rejected', false);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 503) {
        test('Invalid credentials rejected', true);
        console.log(`  Response: ${error.response.data?.error || 'Unknown'}`);
      } else {
        test('Invalid credentials rejected', false, `Got ${error.response?.status}`);
      }
    }
  }

  // Test invalid portfolio ID
  logInfo('Testing invalid portfolio ID...');
  try {
    const invalid = await api.post('/portfolios/invalid-uuid/sync-bybit', {
      api_key: 'test',
      api_secret: 'test',
    });
    test('Invalid portfolio ID rejected', false);
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 404) {
      test('Invalid portfolio ID rejected', true);
    } else {
      test('Invalid portfolio ID rejected', false, `Got ${error.response?.status}`);
    }
  }

  // ============================================
  // TEST 3: PORTFOLIO METRICS FLOW
  // ============================================
  logSection('3. Portfolio Metrics Flow Tests');

  if (portfolioId) {
    // Test summary endpoint
    logInfo('Testing summary endpoint...');
    try {
      const summary = await api.get(`/portfolios/${portfolioId}/summary`);
      
      if (summary.data.success) {
        test('Summary endpoint valid', true);
        console.log(`  Total Value: $${summary.data.current_state?.total_value}`);
        console.log(`  PnL: $${summary.data.current_state?.pnl?.value} (${summary.data.current_state?.pnl?.percent}%)`);
        
        if (summary.data.current_state) {
          test('Current state present', true);
        } else {
          test('Current state present', false);
        }
        
        const assets = summary.data.allocation || [];
        if (assets.length > 0) {
          test('Allocation in summary', true);
        } else {
          test('Allocation in summary', false);
        }
      } else {
        test('Summary endpoint valid', false, summary.data.error);
      }
    } catch (error) {
      test('Summary endpoint valid', false, error.message);
    }

    // Test positions endpoint
    logInfo('Testing positions endpoint...');
    try {
      const positions = await api.get(`/portfolios/${portfolioId}/positions`);
      if (positions.data.success) {
        test('Positions endpoint valid', true);
      } else {
        test('Positions endpoint valid', false, positions.data.error);
      }
    } catch (error) {
      test('Positions endpoint valid', false, error.message);
    }

    // Test equity curve endpoint
    logInfo('Testing equity curve endpoint...');
    try {
      const equity = await api.get(`/portfolios/${portfolioId}/equity-curve`);
      
      if (equity.data.success) {
        test('Equity curve endpoint valid', true);
        
        const dataPoints = equity.data.data?.length || 0;
        console.log(`  Data points: ${dataPoints}`);
        
        if (dataPoints > 0) {
          test('Equity curve has data', true);
        } else {
          test('Equity curve has data', false);
        }
      } else {
        test('Equity curve endpoint valid', false, equity.data.error);
      }
    } catch (error) {
      test('Equity curve endpoint valid', false, error.message);
    }
  }

  // Test invalid portfolio ID for metrics
  logInfo('Testing invalid portfolio ID for metrics...');
  try {
    const invalid = await api.get('/portfolios/not-a-uuid/summary');
    test('Invalid UUID rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Invalid UUID rejected', true);
    } else {
      test('Invalid UUID rejected', false, `Got ${error.response?.status}`);
    }
  }

  // ============================================
  // TEST 4: DCA SIMULATOR FLOW
  // ============================================
  logSection('4. DCA Simulator Flow Tests');

  // Test valid BTC DCA
  logInfo('Testing BTC DCA simulation...');
  try {
    const dca = await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      amount: 100,
      interval: 7,
      asset: 'BTC',
    });
    
    if (dca.data.success) {
      test('DCA simulation valid', true);
      console.log(`  Total Invested: $${dca.data.dca?.totalInvested}`);
      console.log(`  Purchases: ${dca.data.dca?.purchaseCount}`);
      
      if (dca.data.results?.dca) {
        test('DCA results present', true);
      } else {
        test('DCA results present', false);
      }
      
      if (dca.data.results?.hodl) {
        test('HODL results present', true);
      } else {
        test('HODL results present', false);
      }
    } else {
      test('DCA simulation valid', false, dca.data.error);
    }
  } catch (error) {
    test('DCA simulation valid', false, error.message);
  }

  // Test asset pair
  logInfo('Testing DCA with asset pair (70/30)...');
  try {
    const pair = await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      amount: 100,
      interval: 7,
      asset: 'BTC',
      pair: '70/30',
    });
    
    if (pair.data.success) {
      test('Asset pair simulation', true);
    } else {
      test('Asset pair simulation', false, pair.data.error);
    }
  } catch (error) {
    test('Asset pair simulation', false, error.message);
  }

  // Test ETH
  logInfo('Testing ETH DCA simulation...');
  try {
    const eth = await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      amount: 50,
      interval: 14,
      asset: 'ETH',
    });
    
    if (eth.data.success) {
      test('ETH DCA simulation', true);
    } else {
      test('ETH DCA simulation', false, eth.data.error);
    }
  } catch (error) {
    test('ETH DCA simulation', false, error.message);
  }

  // Test missing parameters
  logInfo('Testing missing parameters...');
  try {
    const missing = await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      amount: 100,
    });
    test('Missing params rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Missing params rejected', true);
    } else {
      test('Missing params rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test invalid date range
  logInfo('Testing invalid date range...');
  try {
    const invalid = await api.post('/simulations/dca', {
      startDate: '2024-06-30',
      endDate: '2024-01-01',
      amount: 100,
      interval: 7,
      asset: 'BTC',
    });
    test('Invalid date range rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Invalid date range rejected', true);
    } else {
      test('Invalid date range rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test invalid asset
  logInfo('Testing invalid asset...');
  try {
    const invalid = await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      amount: 100,
      interval: 7,
      asset: 'INVALID',
    });
    test('Invalid asset rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Invalid asset rejected', true);
    } else {
      test('Invalid asset rejected', false, `Got ${error.response?.status}`);
    }
  }

  // ============================================
  // TEST 5: PRESET COMPARISON FLOW
  // ============================================
  logSection('5. Preset Portfolio Comparison Tests');

  // Test all presets
  logInfo('Testing all presets endpoint...');
  try {
    const presets = await api.get('/simulations/presets?startDate=2024-01-01&endDate=2024-06-30');
    
    if (presets.data.success) {
      test('Presets endpoint valid', true);
      
      const count = presets.data.presets?.length || 0;
      console.log(`  Presets found: ${count}`);
      
      if (count >= 2) {
        test('Multiple presets returned', true);
      } else {
        test('Multiple presets returned', false, `Expected 2+, got ${count}`);
      }
    } else {
      test('Presets endpoint valid', false, presets.data.error);
    }
  } catch (error) {
    test('Presets endpoint valid', false, error.message);
  }

  // Test BTC 100%
  logInfo('Testing BTC 100% preset...');
  try {
    const btc100 = await api.get('/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-03-31');
    if (btc100.data.success) {
      test('BTC 100% preset', true);
    } else {
      test('BTC 100% preset', false, btc100.data.error);
    }
  } catch (error) {
    test('BTC 100% preset', false, error.message);
  }

  // Test BTC/ETH 70/30
  logInfo('Testing BTC/ETH 70/30 preset...');
  try {
    const btc70 = await api.get('/simulations/presets/BTC_70_ETH_30?startDate=2024-01-01&endDate=2024-03-31');
    if (btc70.data.success) {
      test('BTC/ETH 70/30 preset', true);
    } else {
      test('BTC/ETH 70/30 preset', false, btc70.data.error);
    }
  } catch (error) {
    test('BTC/ETH 70/30 preset', false, error.message);
  }

  // Test invalid preset
  logInfo('Testing invalid preset...');
  try {
    const invalid = await api.get('/simulations/presets/INVALID?startDate=2024-01-01&endDate=2024-03-31');
    test('Invalid preset rejected', false);
  } catch (error) {
    if (error.response?.status === 404) {
      test('Invalid preset rejected', true);
    } else {
      test('Invalid preset rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test missing dates
  logInfo('Testing missing date parameters...');
  try {
    const missing = await api.get('/simulations/presets');
    test('Missing dates rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Missing dates rejected', true);
    } else {
      test('Missing dates rejected', false, `Got ${error.response?.status}`);
    }
  }

  // ============================================
  // TEST 6: PUBLIC REPORT FLOW
  // ============================================
  logSection('6. Public Report & Sharing Flow Tests');

  if (portfolioId) {
    // Create report
    logInfo('Creating public report...');
    try {
      const create = await api.post('/reports', {
        portfolioId,
        title: 'E2E Test Report',
      });
      
      if (create.data.success) {
        test('Create report success', true);
        reportUuid = create.data.report?.reportUuid;
        console.log(`  Report UUID: ${reportUuid}`);
      } else {
        test('Create report success', false, create.data.error);
      }
    } catch (error) {
      test('Create report success', false, error.message);
    }

    // Access public report
    if (reportUuid) {
      logInfo('Accessing public report...');
      try {
        const public = await api.get(`/reports/public/${reportUuid}`);
        
        if (public.data.success) {
          test('Public report accessible', true);
          
          if (public.data.report?.snapshot) {
            test('Report has snapshot', true);
          } else {
            test('Report has snapshot', false);
          }
        } else {
          test('Public report accessible', false, public.data.error);
        }
      } catch (error) {
        test('Public report accessible', false, error.message);
      }

      // List reports
      logInfo('Listing portfolio reports...');
      try {
        const list = await api.get(`/portfolios/${portfolioId}/reports`);
        if (list.data.reports || list.data.success) {
          test('List reports works', true);
        } else {
          test('List reports works', false);
        }
      } catch (error) {
        test('List reports works', false, error.message);
      }

      // Delete report
      logInfo('Deleting test report...');
      try {
        const del = await api.delete(`/reports/${reportUuid}`, { data: { portfolioId } });
        if (del.data.success) {
          test('Delete report works', true);
        } else {
          test('Delete report works', false, del.data.error);
        }
      } catch (error) {
        test('Delete report works', false, error.message);
      }
    }

    // Test invalid report UUID
    logInfo('Testing invalid report UUID...');
    try {
      const invalid = await api.get('/reports/public/invalid-uuid');
      test('Invalid report UUID rejected', false);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        test('Invalid report UUID rejected', true);
      } else {
        test('Invalid report UUID rejected', false, `Got ${error.response?.status}`);
      }
    }
  }

  // ============================================
  // TEST 7: PERFORMANCE TESTS
  // ============================================
  logSection('7. Performance Tests');

  // Time DCA simulation
  logInfo('Testing DCA simulation response time...');
  try {
    const start = Date.now();
    await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      amount: 100,
      interval: 7,
      asset: 'BTC',
    });
    const duration = Date.now() - start;
    
    console.log(`  DCA Response Time: ${duration}ms`);
    if (duration < 5000) {
      test('DCA < 5s', true);
    } else {
      test('DCA < 5s', false, `${duration}ms exceeded 5s`);
    }
  } catch (error) {
    test('DCA < 5s', false, error.message);
  }

  // Time presets
  logInfo('Testing presets endpoint response time...');
  try {
    const start = Date.now();
    await api.get('/simulations/presets?startDate=2024-01-01&endDate=2024-06-30');
    const duration = Date.now() - start;
    
    console.log(`  Presets Response Time: ${duration}ms`);
    if (duration < 5000) {
      test('Presets < 5s', true);
    } else {
      test('Presets < 5s', false, `${duration}ms exceeded 5s`);
    }
  } catch (error) {
    test('Presets < 5s', false, error.message);
  }

  // ============================================
  // TEST 8: EDGE CASES
  // ============================================
  logSection('8. Edge Cases & Error Handling');

  // Test non-existent portfolio
  logInfo('Testing non-existent portfolio...');
  try {
    const fake = '00000000-0000-0000-0000-000000000000';
    const resp = await api.get(`/portfolios/${fake}/summary`);
    test('Non-existent portfolio 404', false);
  } catch (error) {
    if (error.response?.status === 404) {
      test('Non-existent portfolio 404', true);
    } else {
      test('Non-existent portfolio 404', false, `Got ${error.response?.status}`);
    }
  }

  // Test invalid UUID format
  logInfo('Testing invalid UUID format...');
  try {
    await api.get('/portfolios/not-a-uuid/summary');
    test('Invalid UUID rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Invalid UUID rejected', true);
    } else {
      test('Invalid UUID rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test empty portfolio
  logInfo('Testing empty portfolio creation...');
  try {
    const empty = await api.post('/portfolios', { name: 'Empty Portfolio' });
    
    if (empty.data.success) {
      test('Empty portfolio creation', true);
      const emptyId = empty.data.portfolio?.id || empty.data.id;
      
      if (emptyId) {
        const summary = await api.get(`/portfolios/${emptyId}/summary`);
        if (summary.data.allocation?.length === 0) {
          test('Empty portfolio shows empty allocation', true);
        } else {
          test('Empty portfolio shows empty allocation', false);
        }
      }
    } else {
      test('Empty portfolio creation', false);
    }
  } catch (error) {
    test('Empty portfolio creation', false, error.message);
  }

  // Test malformed dates
  logInfo('Testing malformed date format...');
  try {
    await api.post('/simulations/dca', {
      startDate: '01-15-2024',
      endDate: '06-30-2024',
      amount: 100,
      interval: 7,
      asset: 'BTC',
    });
    test('Malformed date rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Malformed date rejected', true);
    } else {
      test('Malformed date rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test negative amount
  logInfo('Testing negative amount...');
  try {
    await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      amount: -100,
      interval: 7,
      asset: 'BTC',
    });
    test('Negative amount rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Negative amount rejected', true);
    } else {
      test('Negative amount rejected', false, `Got ${error.response?.status}`);
    }
  }

  // Test zero interval
  logInfo('Testing zero interval...');
  try {
    await api.post('/simulations/dca', {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      amount: 100,
      interval: 0,
      asset: 'BTC',
    });
    test('Zero interval rejected', false);
  } catch (error) {
    if (error.response?.status === 400) {
      test('Zero interval rejected', true);
    } else {
      test('Zero interval rejected', false, `Got ${error.response?.status}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  const totalTime = Date.now() - startTime;
  logSection('Test Summary');

  console.log('');
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  ${colors.cyan}Total Time: ${(totalTime / 1000).toFixed(2)}s${colors.reset}`);
  console.log('');

  // Save results
  const resultsFile = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalTime,
    summary: { passed: results.passed, failed: results.failed },
    tests: results.tests,
  }, null, 2));
  console.log(`Results saved to: ${resultsFile}`);

  if (results.failed === 0) {
    log('✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('❌ Some tests failed.', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});

/**
 * End-to-End Test Runner for Crypto Portfolio Visualizer
 * Tests all critical user flows as specified in Phase 6.1
 * 
 * Usage: node tests/e2e-runner.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const FormData = require('form-data');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;
const TEST_DATA_DIR = path.join(__dirname, 'fixtures');

// Colors for console output
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

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status} - ${name}`, color);
  if (details && !passed) {
    log(`         Details: ${details}`, 'yellow');
  }
}

// Helper to make HTTP requests
async function request(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Generate test results
const testResults = {
  csvImport: { passed: 0, failed: 0, tests: [] },
  bybitSync: { passed: 0, failed: 0, tests: [] },
  portfolioMetrics: { passed: 0, failed: 0, tests: [] },
  dcaSimulator: { passed: 0, failed: 0, tests: [] },
  presetComparison: { passed: 0, failed: 0, tests: [] },
  publicReport: { passed: 0, failed: 0, tests: [] },
  performance: { passed: 0, failed: 0, tests: [] },
  edgeCases: { passed: 0, failed: 0, tests: [] },
};

// Track time
let startTime;
function measureTime() {
  return Date.now() - startTime;
}

// ============================================
// TEST 1: CSV Import Flow
// ============================================
async function testCsvImport() {
  logSection('1. CSV Import Flow Tests');
  
  let portfolioId = null;
  let csvFilePath = null;

  try {
    // Create a portfolio first
    log('  Creating test portfolio...', 'blue');
    const createRes = await request('POST', `${API_BASE}/portfolios`, {
      name: 'E2E Test Portfolio',
    });
    
    if (createRes.status !== 200 || !createRes.data.success) {
      logTest('Create portfolio', false, 'Failed to create portfolio');
      return;
    }
    
    portfolioId = createRes.data.portfolio?.id || createRes.data.id;
    logTest('Create portfolio', true);
    
    if (!portfolioId) {
      logTest('Create portfolio - get ID', false, 'No portfolio ID returned');
      return;
    }
    console.log(`  Portfolio ID: ${portfolioId}`);

    // Create test CSV file
    const testCsvContent = `timestamp,symbol,side,qty,price,fee,exchange
2024-01-15T10:30:00Z,BTC,BUY,0.5,42000,10,Binance
2024-01-20T14:15:00Z,ETH,BUY,5,2300,5,Kraken
2024-02-01T09:00:00Z,BTC,BUY,0.25,51000,5,Binance
2024-02-15T16:30:00Z,ETH,SELL,2,2600,3,Kraken
2024-03-01T11:00:00Z,SOL,BUY,50,95,2,Raydium
2024-03-15T13:45:00Z,BTC,BUY,0.3,68000,8,Binance
2024-04-01T10:00:00Z,ETH,BUY,3,3200,4,Kraken
2024-04-15T15:30:00Z,SOL,BUY,30,140,3,Raydium
2024-05-01T09:30:00Z,BTC,SELL,0.2,62000,6,Binance
2024-05-15T14:00:00Z,ETH,BUY,4,3500,5,Kraken
2024-06-01T12:00:00Z,SOL,BUY,40,175,4,Raydium
2024-06-15T16:00:00Z,BTC,BUY,0.35,57000,7,Binance
2024-07-01T10:30:00Z,ETH,BUY,2,3400,3,Kraken
2024-07-15T13:00:00Z,SOL,BUY,25,180,2,Raydium
2024-08-01T11:00:00Z,BTC,BUY,0.4,64000,8,Binance`;

    csvFilePath = path.join(TEST_DATA_DIR, 'test-trades.csv');
    fs.writeFileSync(csvFilePath, testCsvContent);
    log('  Created test CSV file with 15 trades', 'blue');

    // Upload CSV
    log('  Uploading CSV file...', 'blue');
    const importResult = await uploadCsv(portfolioId, csvFilePath);
    
    if (importResult.status === 200 && importResult.data.success) {
      logTest('CSV upload success', true);
      testResults.csvImport.passed++;
      testResults.csvImport.tests.push({ name: 'CSV upload success', passed: true });
    } else {
      logTest('CSV upload success', false, importResult.data?.message || 'Upload failed');
      testResults.csvImport.failed++;
      testResults.csvImport.tests.push({ name: 'CSV upload success', passed: false });
    }

    // Verify imports count
    if (importResult.data.imported >= 10) {
      logTest('Trades imported count', true);
      testResults.csvImport.passed++;
    } else {
      logTest('Trades imported count', false, `Expected 10+, got ${importResult.data.imported}`);
      testResults.csvImport.failed++;
    }
    console.log(`  Imported: ${importResult.data.imported}, Errors: ${importResult.data.errors}`);

    // Check allocation endpoint
    log('  Checking allocation endpoint...', 'blue');
    const allocationRes = await request('GET', `${API_BASE}/portfolios/${portfolioId}/allocation`);
    
    if (allocationRes.status === 200 && allocationRes.data.success) {
      logTest('Allocation endpoint returns valid response', true);
      testResults.csvImport.passed++;
      
      if (allocationRes.data.allocation && allocationRes.data.allocation.length > 0) {
        logTest('Allocation has data', true);
        testResults.csvImport.passed++;
        console.log(`  Assets: ${allocationRes.data.allocation.map(a => a.symbol).join(', ')}`);
      } else {
        logTest('Allocation has data', false, 'Empty allocation');
        testResults.csvImport.failed++;
      }
    } else {
      logTest('Allocation endpoint returns valid response', false, allocationRes.data?.error);
      testResults.csvImport.failed++;
    }

    // Test invalid CSV
    log('  Testing invalid CSV handling...', 'blue');
    const invalidCsvPath = path.join(TEST_DATA_DIR, 'invalid-trades.csv');
    fs.writeFileSync(invalidCsvPath, 'timestamp,symbol,side\ninvalid,row,data');
    
    const invalidResult = await uploadCsv(portfolioId, invalidCsvPath);
    
    if (invalidResult.data.errors > 0 || !invalidResult.data.success) {
      logTest('Invalid CSV rejected', true);
      testResults.csvImport.passed++;
    } else {
      logTest('Invalid CSV rejected', false, 'Should have returned errors');
      testResults.csvImport.failed++;
    }

    // Test missing headers
    log('  Testing CSV with missing headers...', 'blue');
    const missingHeadersPath = path.join(TEST_DATA_DIR, 'missing-headers.csv');
    fs.writeFileSync(missingHeadersPath, 'timestamp,symbol\n2024-01-01T10:00:00Z,BTC');
    
    const missingHeadersResult = await uploadCsv(portfolioId, missingHeadersPath);
    
    if (missingHeadersResult.status === 400) {
      logTest('Missing headers rejected', true);
      testResults.csvImport.passed++;
    } else {
      logTest('Missing headers rejected', false, `Got status ${missingHeadersResult.status}`);
      testResults.csvImport.failed++;
    }

    // Cleanup
    if (csvFilePath && fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }
    if (fs.existsSync(invalidCsvPath)) fs.unlinkSync(invalidCsvPath);
    if (fs.existsSync(missingHeadersPath)) fs.unlinkSync(missingHeadersPath);

  } catch (error) {
    logTest('CSV Import Flow', false, error.message);
    testResults.csvImport.failed++;
  }

  return portfolioId;
}

// Helper for CSV upload
async function uploadCsv(portfolioId, filePath) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const url = new URL(`${API_BASE}/portfolios/${portfolioId}/import-csv`, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: form.getHeaders(),
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    form.pipe(req);
  });
}

// ============================================
// TEST 2: Bybit API Sync Flow
// ============================================
async function testBybitSync(portfolioId) {
  logSection('2. Bybit API Sync Flow Tests');
  
  if (!portfolioId) {
    logTest('Bybit tests skipped - no portfolio', false, 'No portfolio ID available');
    return;
  }

  // Test missing credentials
  log('  Testing missing credentials...', 'blue');
  const missingCreds = await request('POST', `${API_BASE}/portfolios/${portfolioId}/sync-bybit`, {});
  
  if (missingCreds.status === 400) {
    logTest('Missing credentials rejected', true);
    testResults.bybitSync.passed++;
  } else {
    logTest('Missing credentials rejected', false, `Got ${missingCreds.status}`);
    testResults.bybitSync.failed++;
  }

  // Test invalid credentials (mock)
  log('  Testing invalid credentials...', 'blue');
  const invalidCreds = await request('POST', `${API_BASE}/portfolios/${portfolioId}/sync-bybit`, {
    api_key: 'invalid_key',
    api_secret: 'invalid_secret',
  });

  // Should return 401 for invalid credentials (or 503 if Bybit API is not available)
  if (invalidCreds.status === 401 || invalidCreds.status === 503) {
    logTest('Invalid credentials rejected', true);
    testResults.bybitSync.passed++;
  } else {
    logTest('Invalid credentials rejected', false, `Got ${invalidCreds.status}`);
    testResults.bybitSync.failed++;
  }
  console.log(`  Response: ${invalidCreds.data?.error || 'Unknown'}`);

  // Test invalid portfolio ID
  log('  Testing invalid portfolio ID...', 'blue');
  const invalidPortfolio = await request('POST', `${API_BASE}/portfolios/invalid-id/sync-bybit`, {
    api_key: 'test',
    api_secret: 'test',
  });

  if (invalidPortfolio.status === 400 || invalidPortfolio.status === 404) {
    logTest('Invalid portfolio ID rejected', true);
    testResults.bybitSync.passed++;
  } else {
    logTest('Invalid portfolio ID rejected', false, `Got ${invalidPortfolio.status}`);
    testResults.bybitSync.failed++;
  }
}

// ============================================
// TEST 3: Portfolio Metrics Flow
// ============================================
async function testPortfolioMetrics(portfolioId) {
  logSection('3. Portfolio Metrics Flow Tests');
  
  if (!portfolioId) {
    logTest('Metrics tests skipped - no portfolio', false, 'No portfolio ID available');
    return;
  }

  // Test summary endpoint
  log('  Testing summary endpoint...', 'blue');
  const summaryRes = await request('GET', `${API_BASE}/portfolios/${portfolioId}/summary`);
  
  if (summaryRes.status === 200 && summaryRes.data.success) {
    logTest('Summary endpoint returns valid response', true);
    testResults.portfolioMetrics.passed++;
  } else {
    logTest('Summary endpoint returns valid response', false, summaryRes.data?.error);
    testResults.portfolioMetrics.failed++;
  }

  // Check response structure
  if (summaryRes.data.current_state) {
    logTest('Current state in response', true);
    testResults.portfolioMetrics.passed++;
    console.log(`  Total Value: $${summaryRes.data.current_state.total_value}`);
    console.log(`  PnL: $${summaryRes.data.current_state.pnl?.value} (${summaryRes.data.current_state.pnl?.percent}%)`);
  } else {
    logTest('Current state in response', false, 'Missing current_state');
    testResults.portfolioMetrics.failed++;
  }

  // Check allocation in summary
  if (summaryRes.data.allocation && Array.isArray(summaryRes.data.allocation)) {
    logTest('Allocation array in response', true);
    testResults.portfolioMetrics.passed++;
  } else {
    logTest('Allocation array in response', false, 'Missing allocation');
    testResults.portfolioMetrics.failed++;
  }

  // Test positions endpoint
  log('  Testing positions endpoint...', 'blue');
  const positionsRes = await request('GET', `${API_BASE}/portfolios/${portfolioId}/positions`);
  
  if (positionsRes.status === 200 && positionsRes.data.success) {
    logTest('Positions endpoint returns valid response', true);
    testResults.portfolioMetrics.passed++;
  } else {
    logTest('Positions endpoint returns valid response', false, positionsRes.data?.error);
    testResults.portfolioMetrics.failed++;
  }

  // Test equity curve endpoint
  log('  Testing equity curve endpoint...', 'blue');
  const equityRes = await request('GET', `${API_BASE}/portfolios/${portfolioId}/equity-curve`);
  
  if (equityRes.status === 200 && equityRes.data.success) {
    logTest('Equity curve endpoint returns valid response', true);
    testResults.portfolioMetrics.passed++;
    
    if (equityRes.data.data && equityRes.data.data.length > 0) {
      logTest('Equity curve has data points', true);
      testResults.portfolioMetrics.passed++;
      console.log(`  Data points: ${equityRes.data.data.length}`);
    }
  } else {
    logTest('Equity curve endpoint returns valid response', false, equityRes.data?.error);
    testResults.portfolioMetrics.failed++;
  }

  // Test invalid portfolio ID
  log('  Testing invalid portfolio ID...', 'blue');
  const invalidRes = await request('GET', `${API_BASE}/portfolios/not-a-uuid/summary`);
  
  if (invalidRes.status === 400) {
    logTest('Invalid portfolio ID rejected', true);
    testResults.portfolioMetrics.passed++;
  } else {
    logTest('Invalid portfolio ID rejected', false, `Got ${invalidRes.status}`);
    testResults.portfolioMetrics.failed++;
  }
}

// ============================================
// TEST 4: DCA Simulator Flow
// ============================================
async function testDcaSimulator() {
  logSection('4. DCA Simulator Flow Tests');

  // Test valid DCA request
  log('  Testing valid DCA simulation...', 'blue');
  const dcaRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    amount: 100,
    interval: 7,
    asset: 'BTC',
  });

  if (dcaRes.status === 200 && dcaRes.data.success) {
    logTest('DCA simulation returns valid response', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('DCA simulation returns valid response', false, dcaRes.data?.error);
    testResults.dcaSimulator.failed++;
    return;
  }

  // Check DCA results structure
  if (dcaRes.data.dca) {
    logTest('DCA results structure valid', true);
    testResults.dcaSimulator.passed++;
    console.log(`  Total Invested: $${dcaRes.data.dca.totalInvested}`);
    console.log(`  Purchases: ${dcaRes.data.dca.purchaseCount}`);
  }

  // Check results
  if (dcaRes.data.results) {
    logTest('Results object present', true);
    testResults.dcaSimulator.passed++;
    
    if (dcaRes.data.results.dca && dcaRes.data.results.hodl) {
      logTest('DCA and HODL comparison present', true);
      testResults.dcaSimulator.passed++;
    }
  }

  // Test asset pair
  log('  Testing DCA with asset pair...', 'blue');
  const pairRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    amount: 100,
    interval: 7,
    asset: 'BTC',
    pair: '70/30',
  });

  if (pairRes.status === 200 && pairRes.data.success) {
    logTest('DCA with asset pair works', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('DCA with asset pair works', false, pairRes.data?.error);
    testResults.dcaSimulator.failed++;
  }

  // Test missing parameters
  log('  Testing missing parameters...', 'blue');
  const missingRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    amount: 100,
    interval: 7,
  });

  if (missingRes.status === 400) {
    logTest('Missing parameters rejected', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('Missing parameters rejected', false, `Got ${missingRes.status}`);
    testResults.dcaSimulator.failed++;
  }

  // Test invalid date range
  log('  Testing invalid date range...', 'blue');
  const invalidDateRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-06-30',
    endDate: '2024-01-01',
    amount: 100,
    interval: 7,
    asset: 'BTC',
  });

  if (invalidDateRes.status === 400) {
    logTest('Invalid date range rejected', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('Invalid date range rejected', false, `Got ${invalidDateRes.status}`);
    testResults.dcaSimulator.failed++;
  }

  // Test invalid asset
  log('  Testing invalid asset...', 'blue');
  const invalidAssetRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    amount: 100,
    interval: 7,
    asset: 'INVALID',
  });

  if (invalidAssetRes.status === 400) {
    logTest('Invalid asset rejected', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('Invalid asset rejected', false, `Got ${invalidAssetRes.status}`);
    testResults.dcaSimulator.failed++;
  }

  // Test ETH asset
  log('  Testing ETH DCA simulation...', 'blue');
  const ethRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    amount: 50,
    interval: 14,
    asset: 'ETH',
  });

  if (ethRes.status === 200 && ethRes.data.success) {
    logTest('ETH DCA simulation works', true);
    testResults.dcaSimulator.passed++;
  } else {
    logTest('ETH DCA simulation works', false, ethRes.data?.error);
    testResults.dcaSimulator.failed++;
  }
}

// ============================================
// TEST 5: Preset Portfolio Comparison
// ============================================
async function testPresetComparison() {
  logSection('5. Preset Portfolio Comparison Tests');

  // Test all presets
  log('  Testing all presets endpoint...', 'blue');
  const presetsRes = await request('GET', `${API_BASE}/simulations/presets?startDate=2024-01-01&endDate=2024-06-30`);

  if (presetsRes.status === 200 && presetsRes.data.success) {
    logTest('Presets endpoint returns valid response', true);
    testResults.presetComparison.passed++;
  } else {
    logTest('Presets endpoint returns valid response', false, presetsRes.data?.error);
    testResults.presetComparison.failed();
    return;
  }

  // Check presets count
  if (presetsRes.data.presets && presetsRes.data.presets.length >= 2) {
    logTest('Multiple presets returned', true);
    testResults.presetComparison.passed++;
    console.log(`  Presets: ${presetsRes.data.presets.map(p => p.preset).join(', ')}`);
  } else {
    logTest('Multiple presets returned', false, `Got ${presetsRes.data.presets?.length || 0}`);
    testResults.presetComparison.failed++;
  }

  // Test single preset - BTC 100%
  log('  Testing BTC 100% preset...', 'blue');
  const btc100Res = await request('GET', `${API_BASE}/simulations/presets/BTC_100?startDate=2024-01-01&endDate=2024-03-31`);

  if (btc100Res.status === 200 && btc100Res.data.success) {
    logTest('BTC 100% preset works', true);
    testResults.presetComparison.passed++;
  } else {
    logTest('BTC 100% preset works', false, btc100Res.data?.error);
    testResults.presetComparison.failed++;
  }

  // Test single preset - BTC/ETH 70/30
  log('  Testing BTC/ETH 70/30 preset...', 'blue');
  const btc70Eth30Res = await request('GET', `${API_BASE}/simulations/presets/BTC_70_ETH_30?startDate=2024-01-01&endDate=2024-03-31`);

  if (btc70Eth30Res.status === 200 && btc70Eth30Res.data.success) {
    logTest('BTC/ETH 70/30 preset works', true);
    testResults.presetComparison.passed++;
  } else {
    logTest('BTC/ETH 70/30 preset works', false, btc70Eth30Res.data?.error);
    testResults.presetComparison.failed++;
  }

  // Test invalid preset
  log('  Testing invalid preset...', 'blue');
  const invalidPresetRes = await request('GET', `${API_BASE}/simulations/presets/INVALID?startDate=2024-01-01&endDate=2024-03-31`);

  if (invalidPresetRes.status === 404) {
    logTest('Invalid preset rejected', true);
    testResults.presetComparison.passed++;
  } else {
    logTest('Invalid preset rejected', false, `Got ${invalidPresetRes.status}`);
    testResults.presetComparison.failed++;
  }

  // Test missing date parameters
  log('  Testing missing date parameters...', 'blue');
  const missingDatesRes = await request('GET', `${API_BASE}/simulations/presets`);

  if (missingDatesRes.status === 400) {
    logTest('Missing dates rejected', true);
    testResults.presetComparison.passed++;
  } else {
    logTest('Missing dates rejected', false, `Got ${missingDatesRes.status}`);
    testResults.presetComparison.failed++;
  }
}

// ============================================
// TEST 6: Public Report Flow
// ============================================
async function testPublicReport(portfolioId) {
  logSection('6. Public Report & Sharing Flow Tests');

  if (!portfolioId) {
    logTest('Report tests skipped - no portfolio', false, 'No portfolio ID available');
    return;
  }

  // Create report
  log('  Creating public report...', 'blue');
  const createRes = await request('POST', `${API_BASE}/reports`, {
    portfolioId: portfolioId,
    title: 'E2E Test Report',
    description: 'Testing public report functionality',
  });

  if (createRes.status === 201 && createRes.data.success) {
    logTest('Create report success', true);
    testResults.publicReport.passed++;
  } else {
    logTest('Create report success', false, createRes.data?.error);
    testResults.publicReport.failed++;
    return;
  }

  const reportUuid = createRes.data.report?.reportUuid;
  console.log(`  Report UUID: ${reportUuid}`);

  // Access public report
  log('  Accessing public report...', 'blue');
  const publicRes = await request('GET', `${API_BASE}/reports/public/${reportUuid}`);

  if (publicRes.status === 200 && publicRes.data.success) {
    logTest('Public report accessible', true);
    testResults.publicReport.passed++;
  } else {
    logTest('Public report accessible', false, publicRes.data?.error);
    testResults.publicReport.failed++;
  }

  // Check report structure
  if (publicRes.data.report?.snapshot) {
    logTest('Report has snapshot data', true);
    testResults.publicReport.passed++;
  } else {
    logTest('Report has snapshot data', false, 'Missing snapshot');
    testResults.publicReport.failed++;
  }

  // Test invalid report UUID
  log('  Testing invalid report UUID...', 'blue');
  const invalidReportRes = await request('GET', `${API_BASE}/reports/public/invalid-uuid`);

  if (invalidReportRes.status === 400 || invalidReportRes.status === 404) {
    logTest('Invalid report UUID rejected', true);
    testResults.publicReport.passed++;
  } else {
    logTest('Invalid report UUID rejected', false, `Got ${invalidReportRes.status}`);
    testResults.publicReport.failed++;
  }

  // List portfolio reports
  log('  Listing portfolio reports...', 'blue');
  const listRes = await request('GET', `${API_BASE}/portfolios/${portfolioId}/reports`);

  if (listRes.status === 200 && listRes.data.reports) {
    logTest('List reports works', true);
    testResults.publicReport.passed++;
  } else {
    logTest('List reports works', false, listRes.data?.error);
    testResults.publicReport.failed++;
  }

  // Delete report
  if (reportUuid) {
    log('  Deleting test report...', 'blue');
    const deleteRes = await request('DELETE', `${API_BASE}/reports/${reportUuid}`, { portfolioId });

    if (deleteRes.status === 200) {
      logTest('Delete report works', true);
      testResults.publicReport.passed++;
    } else {
      logTest('Delete report works', false, deleteRes.data?.error);
      testResults.publicReport.failed++;
    }
  }
}

// ============================================
// TEST 7: Performance & Timing
// ============================================
async function testPerformance(portfolioId) {
  logSection('7. Performance & Timing Tests');

  const timingResults = [];

  // Test response time for portfolio summary
  log('  Measuring summary endpoint response time...', 'blue');
  if (portfolioId) {
    const start = Date.now();
    await request('GET', `${API_BASE}/portfolios/${portfolioId}/summary`);
    const duration = Date.now() - start;
    timingResults.push({ endpoint: 'portfolio/summary', duration });
    console.log(`  Response time: ${duration}ms`);

    if (duration < 5000) {
      logTest('Summary response < 5s', true);
      testResults.performance.passed++;
    } else {
      logTest('Summary response < 5s', false, `${duration}ms exceeded 5s`);
      testResults.performance.failed++;
    }
  }

  // Test DCA simulation response time
  log('  Measuring DCA simulation response time...', 'blue');
  const dcaStart = Date.now();
  await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    amount: 100,
    interval: 7,
    asset: 'BTC',
  });
  const dcaDuration = Date.now() - dcaStart;
  timingResults.push({ endpoint: 'simulations/dca', duration: dcaDuration });
  console.log(`  Response time: ${dcaDuration}ms`);

  if (dcaDuration < 5000) {
    logTest('DCA simulation < 5s', true);
    testResults.performance.passed++;
  } else {
    logTest('DCA simulation < 5s', false, `${dcaDuration}ms exceeded 5s`);
    testResults.performance.failed++;
  }

  // Test presets response time
  log('  Measuring presets endpoint response time...', 'blue');
  const presetsStart = Date.now();
  await request('GET', `${API_BASE}/simulations/presets?startDate=2024-01-01&endDate=2024-06-30`);
  const presetsDuration = Date.now() - presetsStart;
  timingResults.push({ endpoint: 'simulations/presets', duration: presetsDuration });
  console.log(`  Response time: ${presetsDuration}ms`);

  if (presetsDuration < 5000) {
    logTest('Presets endpoint < 5s', true);
    testResults.performance.passed++;
  } else {
    logTest('Presets endpoint < 5s', false, `${presetsDuration}ms exceeded 5s`);
    testResults.performance.failed++;
  }

  return timingResults;
}

// ============================================
// TEST 8: Edge Cases
// ============================================
async function testEdgeCases() {
  logSection('8. Edge Cases & Error Handling Tests');

  // Test non-existent portfolio
  log('  Testing non-existent portfolio...', 'blue');
  const fakePortfolioId = '00000000-0000-0000-0000-000000000000';
  const fakeRes = await request('GET', `${API_BASE}/portfolios/${fakePortfolioId}/summary`);

  if (fakeRes.status === 404) {
    logTest('Non-existent portfolio returns 404', true);
    testResults.edgeCases.passed++;
  } else {
    logTest('Non-existent portfolio returns 404', false, `Got ${fakeRes.status}`);
    testResults.edgeCases.failed++;
  }

  // Test invalid UUID format
  log('  Testing invalid UUID format...', 'blue');
  const invalidUuidRes = await request('GET', `${API_BASE}/portfolios/not-a-uuid/summary`);

  if (invalidUuidRes.status === 400) {
    logTest('Invalid UUID format rejected', true);
    testResults.edgeCases.passed++;
  } else {
    logTest('Invalid UUID format rejected', false, `Got ${invalidUuidRes.status}`);
    testResults.edgeCases.failed++;
  }

  // Test portfolio with no trades
  log('  Testing empty portfolio creation...', 'blue');
  const emptyRes = await request('POST', `${API_BASE}/portfolios`, {
    name: 'Empty Portfolio',
  });

  if (emptyRes.status === 200) {
    logTest('Empty portfolio creation works', true);
    testResults.edgeCases.passed++;
    
    const emptyId = emptyRes.data.portfolio?.id || emptyRes.data.id;
    if (emptyId) {
      const emptySummary = await request('GET', `${API_BASE}/portfolios/${emptyId}/summary`);
      
      if (emptySummary.data.allocation?.length === 0) {
        logTest('Empty portfolio shows empty allocation', true);
        testResults.edgeCases.passed++;
      } else {
        logTest('Empty portfolio shows empty allocation', false);
        testResults.edgeCases.failed++;
      }
    }
  } else {
    logTest('Empty portfolio creation works', false);
    testResults.edgeCases.failed++;
  }

  // Test malformed dates
  log('  Testing malformed date format...', 'blue');
  const malformedDateRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '01-15-2024',
    endDate: '06-30-2024',
    amount: 100,
    interval: 7,
    asset: 'BTC',
  });

  if (malformedDateRes.status === 400) {
    logTest('Malformed date rejected', true);
    testResults.edgeCases.passed++;
  } else {
    logTest('Malformed date rejected', false, `Got ${malformedDateRes.status}`);
    testResults.edgeCases.failed++;
  }

  // Test negative amount
  log('  Testing negative amount...', 'blue');
  const negativeRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    amount: -100,
    interval: 7,
    asset: 'BTC',
  });

  if (negativeRes.status === 400) {
    logTest('Negative amount rejected', true);
    testResults.edgeCases.passed++;
  } else {
    logTest('Negative amount rejected', false, `Got ${negativeRes.status}`);
    testResults.edgeCases.failed++;
  }

  // Test zero interval
  log('  Testing zero interval...', 'blue');
  const zeroIntervalRes = await request('POST', `${API_BASE}/simulations/dca`, {
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    amount: 100,
    interval: 0,
    asset: 'BTC',
  });

  if (zeroIntervalRes.status === 400) {
    logTest('Zero interval rejected', true);
    testResults.edgeCases.passed++;
  } else {
    logTest('Zero interval rejected', false, `Got ${zeroIntervalRes.status}`);
    testResults.edgeCases.failed++;
  }
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  log('     CRYPTO PORTFOLIO VISUALIZER - E2E TEST SUITE', 'cyan');
  log('     Phase 6.1: End-to-End Testing', 'cyan');
  console.log('='.repeat(70));

  startTime = Date.now();
  console.log(`\nStarted at: ${new Date().toISOString()}`);
  console.log(`API Base URL: ${API_BASE}`);

  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Run all test suites
  let portfolioId = null;

  try {
    // Health check
    logSection('Health Check');
    const healthRes = await request('GET', `${BASE_URL}/health`);
    if (healthRes.status === 200) {
      logTest('Server is healthy', true);
    } else {
      logTest('Server is healthy', false, `Status: ${healthRes.status}`);
      console.log('\n❗ Make sure the server is running: npm run dev');
      process.exit(1);
    }

    // Run test suites
    portfolioId = await testCsvImport();
    await testBybitSync(portfolioId);
    await testPortfolioMetrics(portfolioId);
    await testDcaSimulator();
    await testPresetComparison();
    await testPublicReport(portfolioId);
    const timingResults = await testPerformance(portfolioId);
    await testEdgeCases();

    // Summary
    const totalTime = Date.now() - startTime;
    logSection('Test Summary');
    
    const categories = [
      { name: 'CSV Import', results: testResults.csvImport },
      { name: 'Bybit Sync', results: testResults.bybitSync },
      { name: 'Portfolio Metrics', results: testResults.portfolioMetrics },
      { name: 'DCA Simulator', results: testResults.dcaSimulator },
      { name: 'Preset Comparison', results: testResults.presetComparison },
      { name: 'Public Report', results: testResults.publicReport },
      { name: 'Performance', results: testResults.performance },
      { name: 'Edge Cases', results: testResults.edgeCases },
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    for (const cat of categories) {
      const { passed, failed } = cat.results;
      totalPassed += passed;
      totalFailed += failed;
      const color = failed === 0 ? 'green' : 'yellow';
      log(`  ${cat.name}: ${passed} passed, ${failed} failed`, color);
    }

    console.log('\n' + '-'.repeat(70));
    log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`, totalFailed === 0 ? 'green' : 'red');
    log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`, 'cyan');
    console.log('-'.repeat(70));

    // Save results to file
    const resultsFile = path.join(__dirname, 'e2e-test-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalTime,
      summary: { totalPassed, totalFailed },
      categories,
      timingResults,
      results: testResults,
    }, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);

    // Cleanup test data directory
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }

  } catch (error) {
    console.error('\n❗ Test runner error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();

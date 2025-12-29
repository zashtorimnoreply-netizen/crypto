const crypto = require('crypto');
const db = require('../db');
const equityCurveService = require('./equityCurveService');
const priceService = require('./priceService');

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates a UUID string format
 */
function validateUUID(uuid) {
  return UUID_REGEX.test(uuid);
}

/**
 * Generates a cryptographically secure UUID v4
 */
function generateUUID() {
  const bytes = crypto.randomBytes(16);
  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  return bytes.toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

/**
 * Calculate cost basis for all symbols in a portfolio
 */
async function calculateCostBasis(portfolioId) {
  const result = await db.query(
    `SELECT 
      symbol,
      side,
      SUM(quantity) as total_qty,
      SUM(quantity * price) as total_value
     FROM trades 
     WHERE portfolio_id = $1 
     GROUP BY symbol, side`,
    [portfolioId]
  );
  
  const costBasis = {};
  
  for (const row of result.rows) {
    const symbol = row.symbol;
    if (!costBasis[symbol]) {
      costBasis[symbol] = { buyQty: 0, buyValue: 0, sellQty: 0, sellValue: 0 };
    }
    
    if (row.side.toUpperCase() === 'BUY') {
      costBasis[symbol].buyQty = parseFloat(row.total_qty);
      costBasis[symbol].buyValue = parseFloat(row.total_value);
    } else {
      costBasis[symbol].sellQty = parseFloat(row.total_qty);
      costBasis[symbol].sellValue = parseFloat(row.total_value);
    }
  }
  
  // Calculate final values
  for (const symbol in costBasis) {
    const data = costBasis[symbol];
    data.holdings = data.buyQty - data.sellQty;
    data.costBasis = data.buyValue - data.sellValue;
    data.avgCost = data.holdings > 0 ? data.costBasis / data.holdings : 0;
  }
  
  return costBasis;
}

/**
 * Get position details including individual trade info
 */
async function getPositionDetails(portfolioId, symbol) {
  const result = await db.query(
    `SELECT 
       side, 
       quantity, 
       price, 
       timestamp,
       exchange
     FROM trades 
     WHERE portfolio_id = $1 AND symbol = $2
     ORDER BY timestamp ASC`,
    [portfolioId, symbol]
  );
  
  return result.rows.map(row => ({
    side: row.side.toUpperCase(),
    quantity: parseFloat(row.quantity),
    price: parseFloat(row.price),
    timestamp: row.timestamp,
    exchange: row.exchange,
  }));
}

/**
 * Get comprehensive portfolio snapshot data
 */
async function getPortfolioSnapshot(portfolioId) {
  // Get portfolio info
  const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolioId);
  if (!portfolioInfo) {
    throw new Error('Portfolio not found');
  }
  
  // Get equity curve data
  const equityResult = await equityCurveService.calculateEquityCurve(portfolioId);
  
  // Get latest allocation data
  const tradesResult = await db.query(
    `SELECT DISTINCT symbol FROM trades WHERE portfolio_id = $1`,
    [portfolioId]
  );
  const symbols = tradesResult.rows.map(row => row.symbol);
  
  let prices = [];
  if (symbols.length > 0) {
    prices = await priceService.getCurrentPrices(symbols);
  }
  
  const priceMap = {};
  for (const price of prices) {
    priceMap[price.symbol] = price.price;
  }
  
  // Calculate cost basis and positions
  const costBasisData = await calculateCostBasis(portfolioId);
  
  const positions = [];
  let totalValue = 0;
  let totalCostBasis = 0;
  
  // Get trades for stats
  const tradeStatsResult = await db.query(
    `SELECT 
       COUNT(*) as total_trades,
       MIN(timestamp) as first_trade_date,
       MAX(timestamp) as last_trade_date,
       array_agg(DISTINCT symbol) as symbols
     FROM trades 
     WHERE portfolio_id = $1`,
    [portfolioId]
  );
  
  if (equityResult.success && equityResult.data.length > 0) {
    const latestData = equityResult.data[equityResult.data.length - 1];
    const currentHoldings = latestData.breakdown || {};
    
    for (const symbol in currentHoldings) {
      const holdings = currentHoldings[symbol].holdings;
      if (holdings <= 0) continue;
      
      const currentPrice = priceMap[symbol] || currentHoldings[symbol].price || 0;
      const costData = costBasisData[symbol] || { costBasis: 0, avgCost: 0 };
      const positionDetails = await getPositionDetails(portfolioId, symbol);
      
      const positionValue = holdings * currentPrice;
      const costValue = costData.costBasis;
      const pnlValue = positionValue - costValue;
      const pnlPercent = costValue > 0 ? (pnlValue / costValue) * 100 : 0;
      
      totalValue += positionValue;
      totalCostBasis += costValue;
      
      // Get first trade date
      const buyTrades = positionDetails.filter(t => t.side === 'BUY');
      const entryDate = buyTrades.length > 0 ? buyTrades[0].timestamp : null;
      
      // Get unique exchanges
      const exchanges = [...new Set(positionDetails.map(t => t.exchange))];
      
      positions.push({
        symbol,
        holdings: parseFloat(holdings.toFixed(8)),
        avg_cost: parseFloat(costData.avgCost.toFixed(2)),
        entry_date: entryDate,
        current_price: parseFloat(currentPrice.toFixed(2)),
        position_value: parseFloat(positionValue.toFixed(2)),
        cost_value: parseFloat(costValue.toFixed(2)),
        pnl: {
          value: parseFloat(pnlValue.toFixed(2)),
          percent: parseFloat(pnlPercent.toFixed(2)),
        },
        trades_count: positionDetails.length,
        exchange_sources: exchanges.sort(),
        trades: positionDetails.map(trade => ({
          side: trade.side,
          quantity: parseFloat(trade.quantity.toFixed(8)),
          price: parseFloat(trade.price.toFixed(2)),
          timestamp: trade.timestamp,
          exchange: trade.exchange,
        })),
      });
    }
  }
  
  const totalPnl = totalValue - totalCostBasis;
  const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
  
  const row = tradeStatsResult.rows[0];
  
  return {
    portfolio_id: portfolioId,
    portfolio_name: portfolioInfo.name,
    timestamp: new Date().toISOString(),
    equity_curve: equityResult.data.map(point => ({
      date: point.date,
      total_value: parseFloat(point.total_value.toFixed(2)),
      timestamp: point.timestamp,
      breakdown: point.breakdown ? Object.fromEntries(
        Object.entries(point.breakdown).map(([symbol, data]) => [
          symbol,
          {
            holdings: parseFloat(data.holdings.toFixed(8)),
            price: parseFloat((data.price || 0).toFixed(2)),
            value: parseFloat((data.holdings * (data.price || 0)).toFixed(2)),
          }
        ])
      ) : undefined,
    })),
    allocation: positions.map(pos => ({
      symbol: pos.symbol,
      value: pos.position_value,
      percent: totalValue > 0 ? parseFloat(((pos.position_value / totalValue) * 100).toFixed(2)) : 0,
      holdings: pos.holdings,
      price: pos.current_price,
    })).sort((a, b) => b.value - a.value),
    positions: positions,
    metrics: {
      total_value: parseFloat(totalValue.toFixed(2)),
      cost_basis: parseFloat(totalCostBasis.toFixed(2)),
      pnl: {
        value: parseFloat(totalPnl.toFixed(2)),
        percent: parseFloat(totalPnlPercent.toFixed(2)),
      },
    },
    stats: {
      total_trades: parseInt(row.total_trades) || 0,
      first_trade_date: row.first_trade_date,
      last_trade_date: row.last_trade_date,
      symbols: row.symbols ? row.symbols.sort() : [],
      total_positions: positions.length,
      winning_positions: positions.filter(p => p.pnl.value > 0).length,
      losing_positions: positions.filter(p => p.pnl.value < 0).length,
    },
  };
}

/**
 * 1. generateReport(portfolioId, options)
 * Generate new report with unique UUID
 * Fetch current portfolio data (equity curve, allocation, metrics, positions)
 * Store snapshot in portfolio_reports table
 * Return: { reportId, reportUuid, publicUrl }
 */
async function generateReport(portfolioId, options = {}) {
  if (!validateUUID(portfolioId)) {
    const error = new Error('Invalid portfolio ID format');
    error.statusCode = 400;
    throw error;
  }
  
  // Verify portfolio exists
  const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolioId);
  if (!portfolioInfo) {
    const error = new Error('Portfolio not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Generate unique UUID for public access
  const reportUuid = generateUUID();
  
  // Get comprehensive snapshot data
  const snapshotData = await getPortfolioSnapshot(portfolioId);
  
  // Create the report record
  const { rows: [report] } = await db.query(
    `INSERT INTO portfolio_reports 
     (portfolio_id, report_uuid, snapshot_data, title, description, 
      created_by_user_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, report_uuid, created_at`,
    [
      portfolioId,
      reportUuid,
      JSON.stringify(snapshotData),
      options.title || `${portfolioInfo.name} - ${new Date().toLocaleDateString()}`,
      options.description || null,
      options.createdByUserId || null,
      options.expiresAt || null,
    ]
  );
  
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const publicUrl = `${baseUrl}/public/report/${reportUuid}`;
  
  return {
    reportId: report.id,
    reportUuid: report.report_uuid,
    publicUrl,
    createdAt: report.created_at,
  };
}

/**
 * 2. getPublicReport(reportUuid)
 * Fetch report by UUID
 * Increment view_count
 * Update last_viewed_at
 * Return: report snapshot data
 * Error if report not found or expired
 */
async function getPublicReport(reportUuid) {
  if (!validateUUID(reportUuid)) {
    const error = new Error('Invalid report UUID format');
    error.statusCode = 400;
    throw error;
  }
  
  // Fetch report
  const result = await db.query(
    `SELECT id, portfolio_id, report_uuid, snapshot_data, title, description,
            view_count, last_viewed_at, created_at, expires_at, is_public
     FROM portfolio_reports 
     WHERE report_uuid = $1`,
    [reportUuid]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Report not found');
    error.statusCode = 404;
    throw error;
  }
  
  const report = result.rows[0];
  
  // Check if report is public
  if (!report.is_public) {
    const error = new Error('Report is not publicly accessible');
    error.statusCode = 403;
    throw error;
  }
  
  // Check if report has expired
  if (report.expires_at && new Date(report.expires_at) < new Date()) {
    const error = new Error('Report has expired');
    error.statusCode = 410;
    throw error;
  }
  
  // Update view count and last viewed timestamp
  await db.query(
    `UPDATE portfolio_reports 
     SET view_count = view_count + 1, 
         last_viewed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [report.id]
  );
  
  // Parse snapshot data
  const snapshotData = typeof report.snapshot_data === 'string' 
    ? JSON.parse(report.snapshot_data) 
    : report.snapshot_data;
  
  return {
    portfolioName: snapshotData.portfolio_name,
    createdAt: report.created_at,
    snapshot: snapshotData,
    metadata: {
      viewCount: report.view_count + 1, // Already incremented
      lastViewedAt: new Date().toISOString(),
      reportId: report.id,
    },
  };
}

/**
 * 3. getPortfolioReports(portfolioId)
 * List all reports for a portfolio
 * Return: [{ reportId, reportUuid, title, createdAt, viewCount, publicUrl }, ...]
 * Sort by createdAt DESC
 */
async function getPortfolioReports(portfolioId) {
  if (!validateUUID(portfolioId)) {
    const error = new Error('Invalid portfolio ID format');
    error.statusCode = 400;
    throw error;
  }
  
  // Verify portfolio exists
  const portfolioInfo = await equityCurveService.getPortfolioInfo(portfolioId);
  if (!portfolioInfo) {
    const error = new Error('Portfolio not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Fetch all reports for this portfolio
  const result = await db.query(
    `SELECT id, report_uuid, title, created_at, view_count, expires_at
     FROM portfolio_reports 
     WHERE portfolio_id = $1 
     ORDER BY created_at DESC`,
    [portfolioId]
  );
  
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  
  return result.rows.map(row => ({
    reportId: row.id,
    reportUuid: row.report_uuid,
    title: row.title,
    createdAt: row.created_at,
    viewCount: row.view_count,
    publicUrl: `${baseUrl}/public/report/${row.report_uuid}`,
    expiresAt: row.expires_at,
  }));
}

/**
 * 4. deleteReport(reportId, portfolioId)
 * Delete a report
 * Verify ownership (portfolio_id matches)
 * Error if not found
 */
async function deleteReport(reportId, portfolioId) {
  if (!validateUUID(reportId) || (portfolioId && !validateUUID(portfolioId))) {
    const error = new Error('Invalid UUID format');
    error.statusCode = 400;
    throw error;
  }
  
  // Find report
  const result = await db.query(
    `SELECT portfolio_id FROM portfolio_reports WHERE id = $1`,
    [reportId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Report not found');
    error.statusCode = 404;
    throw error;
  }
  
  const report = result.rows[0];
  
  // Verify ownership if portfolioId provided
  if (portfolioId && report.portfolio_id !== portfolioId) {
    const error = new Error('Unauthorized access to report');
    error.statusCode = 403;
    throw error;
  }
  
  // Delete report
  const deleteResult = await db.query(
    `DELETE FROM portfolio_reports WHERE id = $1 RETURNING id`,
    [reportId]
  );
  
  if (deleteResult.rows.length === 0) {
    const error = new Error('Failed to delete report');
    error.statusCode = 500;
    throw error;
  }
  
  return { success: true };
}

/**
 * 5. updateReport(reportId, portfolioId, updates)
 * Update report title, description, or expiration
 * Verify ownership
 * Return updated report
 */
async function updateReport(reportId, portfolioId, updates) {
  if (!validateUUID(reportId) || !validateUUID(portfolioId)) {
    const error = new Error('Invalid UUID format');
    error.statusCode = 400;
    throw error;
  }
  
  // Verify report exists and belongs to portfolio
  const result = await db.query(
    `SELECT id FROM portfolio_reports WHERE id = $1 AND portfolio_id = $2`,
    [reportId, portfolioId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Report not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }
  
  // Build UPDATE query
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }
  
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  
  if (updates.expiresAt !== undefined) {
    fields.push(`expires_at = $${paramIndex++}`);
    values.push(updates.expiresAt);
  }
  
  if (updates.isPublic !== undefined) {
    fields.push(`is_public = $${paramIndex++}`);
    values.push(updates.isPublic);
  }
  
  if (fields.length === 0) {
    const error = new Error('No updates provided');
    error.statusCode = 400;
    throw error;
  }
  
  // Add updated_at trigger will handle the timestamp
  values.push(reportId);
  
  const updateQuery = `
    UPDATE portfolio_reports 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, report_uuid, title, description, created_at, 
              updated_at, view_count, expires_at, is_public
  `;
  
  const updateResult = await db.query(updateQuery, values);
  
  if (updateResult.rows.length === 0) {
    const error = new Error('Failed to update report');
    error.statusCode = 500;
    throw error;
  }
  
  const updatedReport = updateResult.rows[0];
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  
  return {
    reportId: updatedReport.id,
    reportUuid: updatedReport.report_uuid,
    title: updatedReport.title,
    description: updatedReport.description,
    createdAt: updatedReport.created_at,
    updatedAt: updatedReport.updated_at,
    viewCount: updatedReport.view_count,
    expiresAt: updatedReport.expires_at,
    isPublic: updatedReport.is_public,
    publicUrl: `${baseUrl}/public/report/${updatedReport.report_uuid}`,
  };
}

module.exports = {
  generateReport,
  getPublicReport,
  getPortfolioReports,
  deleteReport,
  updateReport,
  validateUUID,
};
const reportingService = require('../services/reportingService');
const equityCurveService = require('../services/equityCurveService');

/**
 * POST /api/reports - Generate new report
 * Auth: Required (JWT or session)
 * Body: { portfolioId, title, description, expiresAt }
 * Returns: { success: true, report: { reportId, reportUuid, publicUrl, createdAt } }
 */
async function createReport(req, res, next) {
  try {
    const { portfolioId, title, description, expiresAt } = req.body;
    
    // Validate required fields
    if (!portfolioId) {
      return res.status(400).json({
        success: false,
        error: 'Portfolio ID is required',
      });
    }
    
    // Generate report
    const report = await reportingService.generateReport(portfolioId, {
      title,
      description,
      expiresAt,
      createdByUserId: req.userId || null, // Will use actual auth when implemented
    });
    
    res.status(201).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    
    // Handle specific error cases
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/reports/public/:reportUuid - View public report (NO AUTH)
 * Path param: reportUuid (UUID string)
 * Query params: ?include_details=true (optional, default true)
 * Returns: { success: true, report: { portfolioName, createdAt, snapshot, metadata } }
 */
async function getPublicReport(req, res, next) {
  try {
    const { reportUuid } = req.params;
    const includeDetails = req.query.include_details !== 'false';
    
    // Get public report (this increments view count)
    const report = await reportingService.getPublicReport(reportUuid);
    
    // Build response
    const response = {
      success: true,
      report: {
        portfolioName: report.portfolioName,
        createdAt: report.createdAt,
        snapshot: includeDetails ? report.snapshot : {
          // Include only basic info if details not requested
          portfolio_id: report.snapshot.portfolio_id,
          portfolio_name: report.snapshot.portfolio_name,
          timestamp: report.snapshot.timestamp,
          equity_curve: report.snapshot.equity_curve,
          allocation: report.snapshot.allocation,
          metrics: report.snapshot.metrics,
        },
        metadata: report.metadata,
      },
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching public report:', error);
    
    // Handle specific error cases
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report UUID format',
      });
    }
    
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: 'This report does not exist or has been deleted',
      });
    }
    
    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: 'This report is not publicly accessible',
      });
    }
    
    if (error.statusCode === 410) {
      return res.status(410).json({
        success: false,
        error: 'This report has expired and is no longer available',
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/portfolios/:portfolioId/reports - List all reports for portfolio
 * Auth: Required
 * Returns: { success: true, reports: [ { reportId, reportUuid, title, createdAt, viewCount, publicUrl }, ... ] }
 */
async function listPortfolioReports(req, res, next) {
  try {
    const { portfolioId } = req.params;
    
    // Validate portfolioId format
    if (!reportingService.validateUUID(portfolioId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio ID format',
      });
    }
    
    // TODO: Verify user has access to this portfolio
    // const hasAccess = await checkPortfolioAccess(req.userId, portfolioId);
    // if (!hasAccess) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Access denied',
    //   });
    // }
    
    const reports = await reportingService.getPortfolioReports(portfolioId);
    
    res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error('Error listing portfolio reports:', error);
    
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

/**
 * DELETE /api/reports/:reportId - Delete a report
 * Auth: Required
 * Path param: reportId (UUID)
 * Returns: { success: true }
 */
async function deleteReport(req, res, next) {
  try {
    const { reportId } = req.params;
    
    // Optional: Get portfolioId from body for additional verification
    const { portfolioId } = req.body;
    
    // TODO: Verify user has access to this report's portfolio
    // const report = await getReport(reportId);
    // const hasAccess = await checkPortfolioAccess(req.userId, report.portfolio_id);
    // if (!hasAccess) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Access denied',
    //   });
    // }
    
    await reportingService.deleteReport(reportId, portfolioId);
    
    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }
    
    next(error);
  }
}

/**
 * GET /api/reports/:reportId - Get report details (authenticated)
 * Auth: Required
 * Verify ownership
 * Returns full report with all snapshot data
 */
async function getReportDetails(req, res, next) {
  try {
    const { reportId } = req.params;
    
    // TODO: Verify user has access to this report
    // const hasAccess = await checkUserReportAccess(req.userId, reportId);
    // if (!hasAccess) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Access denied',
    //   });
    // }
    
    const result = await db.query(
      `SELECT id, portfolio_id, report_uuid, snapshot_data, title, description,
              view_count, last_viewed_at, created_at, updated_at
       FROM portfolio_reports 
       WHERE id = $1`,
      [reportId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found',
      });
    }
    
    const report = result.rows[0];
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
    
    res.json({
      success: true,
      report: {
        reportId: report.id,
        reportUuid: report.report_uuid,
        portfolioId: report.portfolio_id,
        title: report.title,
        description: report.description,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        viewCount: report.view_count,
        lastViewedAt: report.last_viewed_at,
        publicUrl: `${baseUrl}/public/report/${report.report_uuid}`,
        snapshot: typeof report.snapshot_data === 'string' 
          ? JSON.parse(report.snapshot_data) 
          : report.snapshot_data,
      },
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    next(error);
  }
}

module.exports = {
  createReport,
  getPublicReport,
  listPortfolioReports,
  deleteReport,
  getReportDetails,
};
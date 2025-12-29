const express = require('express');
const {
  createReport,
  getPublicReport,
  listPortfolioReports,
  deleteReport,
  getReportDetails,
} = require('../controllers/reportingController');

const router = express.Router();

/**
 * @route POST /api/reports
 * @description Generate a new public report for a portfolio
 * @body {string} portfolioId - Portfolio UUID
 * @body {string} [title] - Optional custom report title
 * @body {string} [description] - Optional report description
 * @body {string} [expiresAt] - Optional expiration date (ISO format)
 * @returns {object} Created report with public URL
 */
router.post('/reports', createReport);

/**
 * @route GET /api/reports/public/:reportUuid
 * @description View a public report (no authentication required)
 * @param {string} reportUuid - Public report UUID
 * @query {string} [include_details] - Include full details (default: true)
 * @returns {object} Report snapshot data
 */
router.get('/reports/public/:reportUuid', getPublicReport);

/**
 * @route GET /api/portfolios/:portfolioId/reports
 * @description List all reports for a portfolio (authentication required)
 * @param {string} portfolioId - Portfolio UUID
 * @returns {object} List of reports for the portfolio
 */
router.get('/portfolios/:portfolioId/reports', listPortfolioReports);

/**
 * @route DELETE /api/reports/:reportId
 * @description Delete a report (authentication required)
 * @param {string} reportId - Report UUID
 * @body {string} [portfolioId] - Optional portfolio ID for verification
 * @returns {object} Success status
 */
router.delete('/reports/:reportId', deleteReport);

/**
 * @route GET /api/reports/:reportId
 * @description Get full report details including snapshot data (authentication required)
 * @param {string} reportId - Report UUID
 * @returns {object} Full report with snapshot data
 */
router.get('/reports/:reportId', getReportDetails);

module.exports = router;
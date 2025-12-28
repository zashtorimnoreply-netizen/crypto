const express = require('express');
const { syncBybitTrades } = require('../controllers/bybitController');

const router = express.Router();

router.post('/portfolios/:portfolio_id/sync-bybit', syncBybitTrades);

module.exports = router;

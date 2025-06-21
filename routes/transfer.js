const express = require('express');
const router = express.Router();
const { transferToTrade, transferToExchange, getTransferHistory, getTradingVolumeStatus } = require('../controllers/transfer');
const { tokenRequired } = require('../middleware/auth');

// Transfer from Exchange to Trade (spot/futures)
router.post('/to-trade', tokenRequired, transferToTrade);

// Transfer from Trade (spot/futures) to Exchange
router.post('/to-exchange', tokenRequired, transferToExchange);

// Get transfer history
router.get('/history', tokenRequired, getTransferHistory);

// Get trading volume status
router.get('/volume-status', tokenRequired, getTradingVolumeStatus);

module.exports = router; 
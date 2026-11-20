const express = require('express');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { getSummaryReport, getNotificationLogs } = require('../controllers/reportController');

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/summary', getSummaryReport);
router.get('/notifications', getNotificationLogs);

module.exports = router;

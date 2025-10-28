const express = require('express');
// Use the same auth middleware as your goals routes
const auth = require('../middleware/auth.middleware'); // Changed from '../middleware/auth'
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

// Get dashboard overview data
router.get('/overview', auth, dashboardController.getOverview.bind(dashboardController));

// Generate AI analysis for dashboard
router.post('/ai/analyze', auth, dashboardController.generateAIAnalysis.bind(dashboardController));

// Get detailed statistics
router.get('/stats', auth, dashboardController.getDetailedStats.bind(dashboardController));

// Get trends and patterns
router.get('/trends', auth, dashboardController.getTrends.bind(dashboardController));

module.exports = router;
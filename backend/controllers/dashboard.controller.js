const dashboardService = require('../services/dashboard.service');

function extractUserId(req) {
  // Support multiple JWT payload shapes: { id }, { userId }, { sub }, or { user: { id } }
  if (!req || !req.user) return null;
  return req.user.id || req.user.userId || req.user.sub || (req.user.user && (req.user.user.id || req.user.user.userId)) || null;
}

class DashboardController {
  
  async getOverview(req, res) {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        console.warn('GET /dashboard/overview - missing user id on req.user:', req.user);
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user id' });
      }
      console.log('GET /dashboard/overview - User:', userId);
      
      const dashboardData = await dashboardService.getDashboardOverview(userId);
      
      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }

  async generateAIAnalysis(req, res) {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        console.warn('POST /dashboard/ai/analyze - missing user id on req.user:', req.user);
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user id' });
      }

      const { goals, moods, medRuns, timestamp } = req.body;
      console.log('POST /dashboard/ai/analyze - User:', userId);
      
      if (!goals || !moods || !medRuns) {
        return res.status(400).json({
          success: false,
          error: 'Missing required data for analysis'
        });
      }
      
      const analysis = await dashboardService.generateAIAnalysis(userId, {
        goals,
        moods,
        medRuns,
        timestamp
      });
      
      console.log('AI analysis completed for user:', userId);
      
      res.json({
        success: true,
        summary: analysis.summary,
        suggestions: analysis.suggestions,
        insights: analysis.insights,
        provider: analysis.provider,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate AI analysis',
        message: error.message,
        summary: 'AI analysis is temporarily unavailable. Your progress data shows consistent engagement across goals, mood tracking, and meditation practices.',
        suggestions: [
          'Continue maintaining your current tracking habits',
          'Consider setting new goals to expand your growth',
          'Review your mood patterns for insights'
        ]
      });
    }
  }

  async getDetailedStats(req, res) {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        console.warn('GET /dashboard/stats - missing user id on req.user:', req.user);
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user id' });
      }
      console.log('GET /dashboard/stats - User:', userId);
      
      const stats = await dashboardService.getDetailedStats(userId);
      
      res.json({
        success: true,
        stats: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
        message: error.message
      });
    }
  }

  async getTrends(req, res) {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        console.warn('GET /dashboard/trends - missing user id on req.user:', req.user);
        return res.status(401).json({ success: false, error: 'Unauthorized: missing user id' });
      }
      const { period = '30d' } = req.query; // 7d, 30d, 90d, 1y
      console.log('GET /dashboard/trends - User:', userId, 'Period:', period);
      
      const trends = await dashboardService.getTrends(userId, period);
      
      res.json({
        success: true,
        trends: trends,
        period: period,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching dashboard trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard trends',
        message: error.message
      });
    }
  }
}

module.exports = new DashboardController();
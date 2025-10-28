const express = require('express');
const geminiService = require('../services/gemini.service');

const router = express.Router();

router.post('/gemini', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    console.log('Testing Gemini with text length:', text.length);
    
    const result = await geminiService.generateSummary(text);
    
    return res.json({
      success: true,
      input: text,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/gemini/status', (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const apiKeyLength = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0;
  
  res.json({
    geminiConfigured: hasApiKey,
    apiKeyLength: hasApiKey ? `${apiKeyLength} characters` : 'Not set',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
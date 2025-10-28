const pool = require('../config/db');
const deepseekService = require('./deepseek.service');
const goalsService = require('./goals.service'); // <--- added

class DashboardService {
  
  async getDashboardOverview(userId) {
    console.log('Getting dashboard overview for user:', userId);
    
    try {
      // Fetch all data in parallel using your existing endpoints/structure
      const [goals, moods, medRuns, journalEntries] = await Promise.all([
        this.getGoals(userId),
        this.getMoods(userId),
        this.getMeditationRuns(userId),
        this.getJournalEntries(userId)
      ]);
      
      return {
        goals: goals || [],
        moods: moods || [],
        medRuns: medRuns || [],
        journalEntries: journalEntries || [],
        stats: this.calculateStats(goals, moods, medRuns, journalEntries),
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error in getDashboardOverview:', error);
      throw error;
    }
  }
  
  async getGoals(userId) {
    try {
      // Reuse existing goals service to avoid duplicate SQL and ensure consistent shape
      const rows = await goalsService.getGoalsByUser(userId);
      if (!Array.isArray(rows)) return [];

      return rows.map(goal => ({
        id: goal.id,
        title: goal.title,
        note: goal.note,
        createdAt: goal.created_at || goal.createdAt,
        created_at: goal.created_at || goal.createdAt,
        dueAt: goal.due_at || goal.dueAt,
        due_at: goal.due_at || goal.dueAt,
        completed: goal.completed === 1 || goal.completed === true,
        completed_at: goal.completed_at || goal.completedAt || null,
        priority: goal.priority || 'medium',
        tags: goal.tags ? (typeof goal.tags === 'string' ? (() => {
          try { return JSON.parse(goal.tags); } catch { return []; }
        })() : goal.tags) : []
      }));
    } catch (error) {
      console.error('Error fetching goals via goals.service:', error);
      return [];
    }
  }
  
  async getMoods(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC LIMIT 50',
        [userId]
      );

      return (rows || []).map(mood => ({
        id: mood.id,
        score: Number(mood.score) || 0,
        date: mood.date,
        note: mood.note
      }));
    } catch (error) {
      console.error('Error fetching moods from database:', error);
      return [];
    }
  }
  
  async getMeditationRuns(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM meditation_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT 50',
        [userId]
      );

      return (rows || []).map(run => ({
        id: run.id,
        sessionTitle: run.session_title || run.sessionTitle || run.title || null,
        session_title: run.session_title || run.sessionTitle || run.title || null,
        startedAt: run.started_at || run.startedAt,
        started_at: run.started_at || run.startedAt,
        endedAt: run.ended_at || run.endedAt,
        ended_at: run.ended_at || run.endedAt,
        actualSeconds: Number(run.actual_seconds || run.actualSeconds || 0),
        actual_seconds: Number(run.actual_seconds || run.actualSeconds || 0),
        completed: run.completed === 1 || run.completed === true,
        completed_at: run.completed_at || run.completedAt || null,
        createdAt: run.created_at || run.createdAt,
        created_at: run.created_at || run.createdAt
      }));
    } catch (error) {
      console.error('Error fetching meditation runs from database:', error);
      return [];
    }
  }
  
  async getJournalEntries(userId) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      
      return rows.map(entry => ({
        id: entry.id,
        mood: entry.mood,
        text: entry.text,
        tags: entry.tags ? (typeof entry.tags === 'string' ? JSON.parse(entry.tags) : entry.tags) : [],
        summary: entry.summary,
        sentiment: entry.sentiment,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      }));
    } catch (error) {
      console.error('Error fetching journal entries from database:', error);
      return [];
    }
  }
  
  calculateStats(goals, moods, medRuns, journalEntries) {
    const totalGoals = goals?.length || 0;
    const completedGoals = goals?.filter(g => g.completed).length || 0;
    const openGoals = totalGoals - completedGoals;
    
    const avgMood = moods?.length > 0 
      ? moods.reduce((sum, m) => sum + m.score, 0) / moods.length 
      : 0;
    
    const totalMedMinutes = medRuns?.reduce((sum, r) => {
      return sum + Math.round((r.actualSeconds || r.actual_seconds || 0) / 60);
    }, 0) || 0;
    
    const totalMedSessions = medRuns?.length || 0;
    
    const journalCount = journalEntries?.length || 0;
    const journalWithSummary = journalEntries?.filter(j => j.summary).length || 0;
    
    // Mood distribution
    const moodCounts = [0, 0, 0, 0, 0]; // 1-5 scores
    moods?.forEach(m => {
      const idx = Math.max(0, Math.min(4, (m.score || 1) - 1));
      moodCounts[idx] += 1;
    });
    
    // Goals by priority
    const goalsByPriority = {
      low: { open: 0, completed: 0 },
      medium: { open: 0, completed: 0 },
      high: { open: 0, completed: 0 }
    };
    
    goals?.forEach(g => {
      const priority = g.priority || 'medium';
      if (g.completed) {
        goalsByPriority[priority].completed += 1;
      } else {
        goalsByPriority[priority].open += 1;
      }
    });
    
    return {
      totalGoals,
      completedGoals,
      openGoals,
      avgMood: Math.round(avgMood * 10) / 10,
      totalMedMinutes,
      totalMedSessions,
      journalCount,
      journalWithSummary,
      moodCounts,
      goalsByPriority,
      completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }
  
  async generateAIAnalysis(userId, data) {
    console.log('Generating AI analysis for user:', userId);
    
    try {
      const { goals, moods, medRuns, journalEntries } = data;
      
      // Create a comprehensive analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(goals, moods, medRuns, journalEntries);
      
      console.log('Sending analysis request to DeepSeek...');
      const result = await deepseekService.generateSummary(analysisPrompt, {
        max_tokens: 400,
        temperature: 0.7
      });
      
      if (result.success && result.summary) {
        // --- normalized parsing: accept object, JSON-string, or plain string + top-level fields ---
        let aiPayload = null;
        if (typeof result.summary === 'object' && result.summary !== null) {
          aiPayload = result.summary;
        } else if (typeof result.summary === 'string') {
          try {
            aiPayload = JSON.parse(result.summary);
          } catch (e) {
            // fallback: treat returned string as the summary and include other top-level fields if present
            aiPayload = {
              summary: result.summary,
              sentiment: result.sentiment || null,
              providerMeta: result.meta || null
            };
          }
        } else {
          // unexpected shape, wrap as summary text
          aiPayload = { summary: String(result.summary) };
        }

        // Parse the AI response to extract summary and suggestions
        const parsed = this.parseAIAnalysis(aiPayload);
        
        return {
          summary: parsed.summary,
          suggestions: parsed.suggestions,
          insights: parsed.insights,
          provider: result.provider || 'deepseek',
          confidence: parsed.confidence || 'medium',
          generatedAt: new Date().toISOString()
        };
      } else {
        throw new Error(result.error || 'AI analysis failed');
      }
      
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Return meaningful fallback analysis
      return this.generateFallbackAnalysis(data);
    }
  }
  
  buildAnalysisPrompt(goals, moods, medRuns, journalEntries) {
    const stats = this.calculateStats(goals, moods, medRuns, journalEntries);
    
    const recentMoods = moods?.slice(0, 7) || [];
    const recentGoals = goals?.slice(0, 5) || [];
    const recentMed = medRuns?.slice(0, 3) || [];
    
    return `Please analyze this user's wellness data and provide insights in this exact JSON format:

{
  "summary": "2-3 sentence overall analysis of their wellness journey and current patterns",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "insights": {
    "mood_trend": "improving/stable/declining",
    "goal_progress": "excellent/good/needs_focus",
    "mindfulness": "consistent/sporadic/beginning"
  }
}

User Data Analysis:
- Goals: ${stats.totalGoals} total, ${stats.completedGoals} completed (${stats.completionRate}% completion rate)
- Priority breakdown: ${stats.goalsByPriority.high.open + stats.goalsByPriority.high.completed} high, ${stats.goalsByPriority.medium.open + stats.goalsByPriority.medium.completed} medium, ${stats.goalsByPriority.low.open + stats.goalsByPriority.low.completed} low priority goals
- Recent goal titles: ${recentGoals.map(g => g.title).join(', ') || 'None'}

- Mood tracking: ${moods?.length || 0} entries, average score ${stats.avgMood}/5
- Recent mood scores: ${recentMoods.map(m => m.score).join(', ') || 'None'}
- Mood distribution: Score 1=${stats.moodCounts[0]}, 2=${stats.moodCounts[1]}, 3=${stats.moodCounts[2]}, 4=${stats.moodCounts[3]}, 5=${stats.moodCounts[4]}

- Meditation: ${stats.totalMedSessions} sessions, ${stats.totalMedMinutes} total minutes
- Recent sessions: ${recentMed.map(m => `${m.sessionTitle || 'Session'} (${Math.round((m.actualSeconds || 0)/60)}min)`).join(', ') || 'None'}

- Journal entries: ${stats.journalCount} total, ${stats.journalWithSummary} with AI summaries

Focus on patterns, progress, and actionable suggestions. Respond with only the JSON:`;
  }
  
  parseAIAnalysis(aiResponse) {
    try {
      // Accept objects (already-parsed) or strings
      let parsed = null;

      if (typeof aiResponse === 'object' && aiResponse !== null) {
        parsed = aiResponse;
      } else if (typeof aiResponse === 'string') {
        // Try direct JSON.parse first (most reliable)
        try {
          parsed = JSON.parse(aiResponse);
        } catch (e) {
          // Clean Markdown code fences then try to find a JSON block
          const cleaned = aiResponse
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No valid JSON found in AI response');
          }
        }
      } else {
        throw new Error('Unsupported AI response type');
      }

      // Now ensure expected fields exist and provide safe defaults
      const defaultSuggestions = [
        'Continue your current tracking habits',
        'Set specific, measurable goals',
        'Maintain regular meditation practice',
        'Review your progress weekly'
      ];

      const summary = parsed.summary || 'Your wellness journey shows consistent engagement across multiple areas.';
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 4)
        : (parsed.suggestions ? [parsed.suggestions].slice(0, 4) : defaultSuggestions);
      const insights = parsed.insights || {
        mood_trend: parsed.sentiment === 'positive' ? 'improving' : parsed.sentiment === 'negative' ? 'declining' : 'stable',
        goal_progress: parsed.completionRate ? (parsed.completionRate > 60 ? 'excellent' : parsed.completionRate > 30 ? 'good' : 'needs_focus') : 'good',
        mindfulness: parsed.mindfulness || 'consistent'
      };

      return {
        summary,
        suggestions,
        insights,
        confidence: parsed.confidence || 'high'
      };
    } catch (error) {
      console.error('Error parsing AI analysis:', error);
      // Fallback to manual extraction
      return this.extractInsightsManually(aiResponse);
    }
  }
  
  extractInsightsManually(text) {
    const lowerText = text.toLowerCase();
    
    // Extract key insights from the text
    let summary = 'Your wellness data shows active engagement across goals, mood tracking, and mindfulness practices.';
    
    if (lowerText.includes('progress') || lowerText.includes('improvement')) {
      summary = 'Your wellness journey demonstrates positive progress and consistent engagement with your goals.';
    } else if (lowerText.includes('challenge') || lowerText.includes('difficult')) {
      summary = 'Your data reveals some challenges, but also shows commitment to tracking and self-improvement.';
    }
    
    const suggestions = [
      'Review your goal completion patterns for insights',
      'Consider increasing meditation frequency if possible',
      'Track mood patterns to identify triggers',
      'Celebrate your progress and maintain consistency'
    ];
    
    return {
      summary,
      suggestions,
      insights: {
        mood_trend: 'stable',
        goal_progress: 'good',
        mindfulness: 'consistent'
      },
      confidence: 'medium'
    };
  }
  
  generateFallbackAnalysis(data) {
    const stats = this.calculateStats(data.goals, data.moods, data.medRuns, data.journalEntries);
    
    let summary = `You've been actively tracking your wellness with ${stats.totalGoals} goals, ${data.moods?.length || 0} mood entries, and ${stats.totalMedSessions} meditation sessions. `;
    
    if (stats.completionRate > 70) {
      summary += 'Your goal completion rate is excellent, showing strong commitment to your objectives.';
    } else if (stats.completionRate > 40) {
      summary += 'You\'re making good progress on your goals with room for continued growth.';
    } else {
      summary += 'Consider reviewing your goals to ensure they\'re achievable and aligned with your priorities.';
    }
    
    const suggestions = [];
    
    if (stats.openGoals > 5) {
      suggestions.push('Focus on completing existing goals before adding new ones');
    }
    
    if (stats.avgMood < 3.5) {
      suggestions.push('Consider mood-boosting activities like exercise or social connection');
    }
    
    if (stats.totalMedSessions < 5) {
      suggestions.push('Try incorporating more regular meditation sessions');
    } else if (stats.totalMedMinutes < 60) {
      suggestions.push('Consider longer meditation sessions for deeper practice');
    }
    
    if (suggestions.length < 3) {
      suggestions.push('Continue your consistent tracking habits');
      suggestions.push('Set weekly review times to assess progress');
      suggestions.push('Celebrate small wins along your wellness journey');
    }
    
    return {
      summary,
      suggestions: suggestions.slice(0, 4),
      insights: {
        mood_trend: stats.avgMood > 3.5 ? 'positive' : stats.avgMood > 2.5 ? 'stable' : 'needs_attention',
        goal_progress: stats.completionRate > 60 ? 'excellent' : stats.completionRate > 30 ? 'good' : 'needs_focus',
        mindfulness: stats.totalMedSessions > 10 ? 'consistent' : stats.totalMedSessions > 3 ? 'developing' : 'beginning'
      },
      provider: 'fallback',
      confidence: 'medium',
      generatedAt: new Date().toISOString()
    };
  }
  
  async getDetailedStats(userId) {
    const overview = await this.getDashboardOverview(userId);
    const stats = overview.stats;
    
    // Add more detailed breakdowns
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    return {
      ...stats,
      periods: {
        last7Days: await this.getStatsForPeriod(userId, last7Days),
        last30Days: await this.getStatsForPeriod(userId, last30Days),
        allTime: stats
      }
    };
  }
  
  async getStatsForPeriod(userId, startDate) {
    try {
      // Normalize dates for MySQL comparisons
      const startDateTime = (startDate instanceof Date)
        ? startDate.toISOString().slice(0, 19).replace('T', ' ')
        : startDate;

      const startDateDay = (startDate instanceof Date)
        ? startDate.toISOString().split('T')[0]
        : startDate;

      const [goalRows] = await pool.query(
        'SELECT * FROM goals WHERE user_id = ? AND created_at >= ?',
        [userId, startDateTime]
      );

      const [moodRows] = await pool.query(
        'SELECT * FROM mood_entries WHERE user_id = ? AND date >= ?',
        [userId, startDateDay]
      );

      const [medRows] = await pool.query(
        'SELECT * FROM meditation_runs WHERE user_id = ? AND started_at >= ?',
        [userId, startDateTime]
      );

      // Ensure we pass arrays of normalized objects to calculateStats
      const normalizedGoals = (goalRows || []).map(g => ({
        ...g,
        completed: g.completed === 1 || g.completed === true,
        priority: g.priority || 'medium',
        tags: g.tags ? (typeof g.tags === 'string' ? (() => {
          try { return JSON.parse(g.tags); } catch { return []; }
        })() : g.tags) : []
      }));

      const normalizedMoods = (moodRows || []).map(m => ({
        ...m,
        score: Number(m.score) || 0
      }));

      const normalizedMeds = (medRows || []).map(r => ({
        ...r,
        actualSeconds: Number(r.actual_seconds || r.actualSeconds || 0),
        completed: r.completed === 1 || r.completed === true
      }));

      return this.calculateStats(normalizedGoals, normalizedMoods, normalizedMeds, []);
    } catch (error) {
      console.error('Error getting period stats:', error);
      return {};
    }
  }
  
  async getTrends(userId, period = '30d') {
    // Implementation for trend analysis over time
    return {
      period,
      message: 'Trend analysis coming soon',
      goalTrends: [],
      moodTrends: [],
      meditationTrends: []
    };
  }
}

module.exports = new DashboardService();
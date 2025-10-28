import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Play, TrendingUp, Brain, Calendar, Sparkles, Zap, BarChart3 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext'; // added

type Goal = {
  id: string | number;
  title: string;
  note?: string;
  createdAt?: string;
  created_at?: string;
  dueAt?: string;
  due_at?: string;
  completed: boolean | number;
  completed_at?: string | null;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
};

type MoodEntry = {
  id: string;
  score: number; // 1..5
  date: string;
  note?: string;
};

type MedRun = {
  id: string | number;
  sessionTitle?: string;
  session_title?: string;
  startedAt?: string;
  started_at?: string;
  endedAt?: string;
  ended_at?: string;
  actualSeconds?: number;
  actual_seconds?: number;
  completed?: boolean | number;
  completed_at?: string | null;
  createdAt?: string;
  created_at?: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

async function apiFetch(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers, credentials: 'include' });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${txt}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// Bright, vibrant colors
const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']; // red to blue spectrum
const PRIORITY_COLORS = {
  high: '#ef4444',    // bright red
  medium: '#f97316',  // bright orange
  low: '#22c55e'      // bright green
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth(); // added

  const [goals, setGoals] = useState<Goal[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [medRuns, setMedRuns] = useState<MedRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [aiResult, setAiResult] = useState<{ summary: string; suggestions?: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log('Loading dashboard data...');

        // Try unified endpoint via authFetch (handles Authorization header)
        let dashboardData: any = null;
        try {
          const res = await authFetch('/api/dashboard/overview');
          if (res.status === 401) { navigate('/login'); return; }
          const txt = await res.text().catch(() => '');
          dashboardData = txt ? JSON.parse(txt) : null;
        } catch (err: any) {
          console.log('Dashboard overview request failed:', err?.message || err);
          dashboardData = null;
        }

        if (dashboardData?.success) {
          const data = dashboardData.data;
          console.log('Dashboard data loaded successfully:', data);
          setGoals(data.goals || []);
          setMoods(data.moods || []);
          setMedRuns(data.medRuns || []);
        } else {
           console.log('Falling back to individual endpoints...');
          // Fallback: call individual endpoints via authFetch
          const fetchGoals = (async () => {
            try {
              const r = await authFetch('/api/goals');
              if (r.status === 401) { navigate('/login'); return { goals: [] }; }
              const t = await r.text().catch(() => '');
              return t ? JSON.parse(t) : { goals: [] };
            } catch { return { goals: [] }; }
          })();

          const fetchMoods = (async () => {
            try {
              const r = await authFetch('/api/mood/entries');
              if (r.status === 401) { navigate('/login'); return { entries: [] }; }
              const t = await r.text().catch(() => '');
              return t ? JSON.parse(t) : { entries: [] };
            } catch { return { entries: [] }; }
          })();

          const fetchMed = (async () => {
            try {
              const r = await authFetch('/api/meditation/runs');
              if (r.status === 401) { navigate('/login'); return { runs: [] }; }
              const t = await r.text().catch(() => '');
              return t ? JSON.parse(t) : { runs: [] };
            } catch { return { runs: [] }; }
          })();

          const [gRes, mRes, medRes] = await Promise.all([fetchGoals, fetchMoods, fetchMed]);

          if (gRes && gRes.goals) { setGoals(gRes.goals); console.log('Goals loaded:', gRes.goals.length); }
          if (mRes && mRes.entries) { setMoods(mRes.entries); console.log('Moods loaded:', mRes.entries.length); }
          if (medRes && medRes.runs) {
            const runs = medRes.runs as MedRun[];
            runs.sort((a, b) => (b.startedAt || b.started_at || '').localeCompare(a.startedAt || a.started_at || ''));
            setMedRuns(runs);
            console.log('Meditation runs loaded:', runs.length);
          }
        }
      } catch (error) {
        console.error('Dashboard loading error:', error);
        showToast('Unable to load dashboard data');
      } finally {
        setLoading(false);
        console.log('Dashboard loading completed');
      }
    })();
  }, [authFetch, navigate]);

  const showToast = (msg: string, t = 3000) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 6);
    setToasts((s) => [...s, { id, msg }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t);
  };

  // stats
  const stats = useMemo(() => {
    const totalGoals = goals.length;
    const openGoals = goals.filter((g) => {
      const isCompleted = g.completed === true || g.completed === 1 || (g.completed_at !== null && g.completed_at !== undefined);
      return !isCompleted;
    }).length;
    const avgMood = moods.length ? moods.reduce((s, m) => s + m.score, 0) / moods.length : 0;
    
    // Handle both field formats for meditation runs
    const totalMedMinutes = medRuns.reduce((s, r) => {
      const seconds = r.actualSeconds || r.actual_seconds || 0;
      return s + Math.round(seconds / 60);
    }, 0);
    
    return { totalGoals, openGoals, avgMood, totalMedMinutes };
  }, [goals, moods, medRuns]);

  // mood series (recent)
  const moodSeries = useMemo(() => moods.slice(-8).map((m) => ({ score: m.score, date: m.date })), [moods]);

  // mood distribution counts (1..5)
  const moodCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    moods.forEach((m) => {
      const idx = Math.max(0, Math.min(4, (m.score || 1) - 1));
      counts[idx] += 1;
    });
    return counts;
  }, [moods]);

  // goals by priority (completed vs open) - Debug and fix
  const goalsByPriority = useMemo(() => {
    console.log('Processing goals for priority stats:', goals);
    
    const priorities = {
      low: { open: 0, completed: 0 },
      medium: { open: 0, completed: 0 },
      high: { open: 0, completed: 0 },
    } as Record<'low'|'medium'|'high', { open: number; completed: number }>;

    goals.forEach((g) => {
      console.log('Processing goal:', g.title, 'priority:', g.priority, 'completed:', g.completed, 'completed_at:', g.completed_at);
      
      const p = (g.priority || 'medium') as 'low' | 'medium' | 'high';
      const isCompleted = g.completed === true || g.completed === 1 || (g.completed_at !== null && g.completed_at !== undefined);
      
      if (isCompleted) {
        priorities[p].completed += 1;
        console.log(`Added to ${p} completed:`, priorities[p].completed);
      } else {
        priorities[p].open += 1;
        console.log(`Added to ${p} open:`, priorities[p].open);
      }
    });
    
    console.log('Final priority stats:', priorities);
    return priorities;
  }, [goals]);

  // Vibrant donut component
  const Donut: React.FC<{ counts: number[]; size?: number; thickness?: number }> = ({ counts, size = 80, thickness = 12 }) => {
    const total = counts.reduce((s, n) => s + n, 0) || 1;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {counts.map((c, i) => {
            const portion = c / total;
            const dash = portion * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const rotation = (offset / circumference) * 360;
            offset += dash;
            return (
              <circle
                key={i}
                r={radius}
                fill="none"
                stroke={MOOD_COLORS[i] || '#64748b'}
                strokeWidth={thickness}
                strokeDasharray={dashArray}
                strokeDashoffset={circumference - dash + 0.0001}
                transform={`rotate(${rotation - 90})`}
                strokeLinecap="round"
              />
            );
          })}
          <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#1e293b" fontWeight="600">
            {total}
          </text>
        </g>
      </svg>
    );
  };

  const analyzeWithAI = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      
      const payload = { 
        goals, 
        moods, 
        medRuns, 
        timestamp: new Date().toISOString() 
      };
      // use authFetch so auth header is sent
      const r = await authFetch('/api/dashboard/ai/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      if (r.status === 401) { navigate('/login'); return; }
      const txt = await r.text().catch(() => '');
      const res = txt ? JSON.parse(txt) : null;
      if (res?.success) {
        setAiResult({ summary: res.summary || 'Analysis completed successfully', suggestions: res.suggestions || [] });
        showToast(`AI insights ready! (${res.provider || 'DeepSeek'})`);
      } else {
        throw new Error(res?.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('AI Analysis Error:', err);
      setAiResult({ 
        summary: 'AI analysis is temporarily unavailable. Your progress data shows consistent engagement across goals, mood tracking, and meditation practices.', 
        suggestions: [
          'Continue maintaining your current tracking habits',
          'Consider setting new goals to expand your growth',
          'Review your mood patterns for insights'
        ]
      });
      showToast('Using fallback analysis');
    } finally {
      setAiLoading(false);
    }
  };

  // med stats helpers - Handle both field formats
  const medTotalMinutes = medRuns.reduce((s, r) => {
    const seconds = r.actualSeconds || r.actual_seconds || 0;
    return s + Math.round(seconds / 60);
  }, 0);
  
  const lastMed = medRuns[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <div className="mb-10">
            <div className="flex items-center justify-center mb-6">
              <div>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
                </div>
                <p className="text-gray-600 text-lg">Track your progress and stay motivated on your wellness journey</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow h-32">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide">Goals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalGoals}</p>
                <p className="text-sm text-gray-600">{stats.openGoals} in progress</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow h-32">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-green-600 text-sm font-semibold uppercase tracking-wide">Average Mood</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgMood ? stats.avgMood.toFixed(1) : '—'}</p>
                <p className="text-sm text-gray-600">{moods.length} entries</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-shadow h-32">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-orange-600 text-sm font-semibold uppercase tracking-wide">Mood Pattern</p>
                <div className="mt-2">
                  <Donut counts={moodCounts} size={60} thickness={8} />
                </div>
              </div>
              <Brain className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-shadow h-32">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Meditation</p>
                <p className="text-2xl font-bold text-gray-900">{medRuns.length}</p>
                <p className="text-sm text-gray-600">{medTotalMinutes} minutes</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </section>

        {/* Main Content - Using Flexbox for alignment */}
        <section className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Mood & Goals */}
          <div className="flex-1 space-y-6">
            {/* Recent Mood Journey (styled like other pages) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-6 h-80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Recent Mood Journey</h2>
                    <p className="text-sm text-gray-500">Latest {moodSeries.length} entries — track your emotional patterns</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{moodSeries.length} entries</div>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-60">
                {moodSeries.length ? (
                  moodSeries.map((m, i) => {
                    const pct = Math.max(8, Math.round((m.score / 5) * 100));
                    const color = MOOD_COLORS[Math.max(0, Math.min(MOOD_COLORS.length - 1, m.score - 1))] || '#64748b';
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-24 text-xs text-gray-600 text-right">{new Date(m.date).toLocaleDateString()}</div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                              title={`Mood score: ${m.score}`}
                            />
                          </div>
                        </div>
                        <div className="w-10 text-right text-sm font-semibold text-gray-800">
                          <span
                            className="inline-block w-8 text-center rounded-full px-1 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            {m.score}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <p>No mood entries yet</p>
                    <p className="text-sm">Start tracking your mood today!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Goals by Priority (styled like other pages) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 p-6 h-64">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Goals by Priority</h2>
                    <p className="text-sm text-gray-500">Progress across your high / medium / low priority goals</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{goals.length} total</div>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-44">
                {goals.length > 0 ? (
                  (['high', 'medium', 'low'] as const).map((p) => {
                    const statsP = goalsByPriority[p];
                    const total = statsP.open + statsP.completed;
                    if (total === 0) return null;
                    const compPct = Math.round((statsP.completed / total) * 100);
                    const color = PRIORITY_COLORS[p];

                    return (
                      <div key={p} className="flex items-center gap-4">
                        <div className="w-20 text-sm font-semibold capitalize">
                          <span
                            className="inline-block px-3 py-1 rounded-full bg-white border text-xs font-medium"
                            style={{ borderColor: color, color }}
                          >
                            {p}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div
                              style={{ width: `${compPct}%`, backgroundColor: color }}
                              className="h-full rounded-full transition-all duration-500"
                              title={`${statsP.completed} completed out of ${total}`}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-sm text-right font-semibold text-gray-700">
                          {statsP.completed}/{total} <span className="text-xs text-gray-500">({compPct}%)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No goals set yet</p>
                    <p className="text-sm">Create your first goal to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - AI Insights & Meditation */}
          <div className="w-full lg:w-96 space-y-6">
            {/* AI Insights - Clean bright design matching dashboard theme */}
            <div className="bg-white rounded-xl shadow-lg p-6 h-80 relative overflow-hidden border-l-4 border-indigo-500">
              {/* Subtle tech pattern background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 left-4 w-2 h-2 bg-indigo-400 rounded-full"></div>
                <div className="absolute top-12 right-8 w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <div className="absolute bottom-16 left-8 w-1 h-1 bg-blue-400 rounded-full"></div>
                <div className="absolute bottom-8 right-4 w-2 h-2 bg-pink-400 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                
                {/* Subtle connecting lines */}
                <svg className="absolute inset-0 w-full h-full">
                  <line x1="16" y1="16" x2="50%" y2="50%" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" />
                  <line x1="80%" y1="48" x2="50%" y2="50%" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.2" />
                  <line x1="32" y1="80%" x2="50%" y2="50%" stroke="#3b82f6" strokeWidth="0.5" opacity="0.2" />
                  <line x1="80%" y1="85%" x2="50%" y2="50%" stroke="#ec4899" strokeWidth="0.5" opacity="0.2" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-gray-900">AI Insights</h2>
                  </div>
                  <button
                    onClick={analyzeWithAI}
                    disabled={aiLoading}
                    className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-sm font-semibold text-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Analyze
                      </>
                    )}
                  </button>
                </div>

                <div className="text-sm leading-relaxed overflow-y-auto max-h-56">
                  {aiLoading ? (
                    <div className="space-y-3">
                      {/* Clean loading animation */}
                      <div className="flex items-center gap-2 text-indigo-600 mb-4">
                        <div className="flex gap-1">
                          <div className="w-1 h-4 bg-indigo-400 animate-pulse rounded"></div>
                          <div className="w-1 h-4 bg-purple-400 animate-pulse delay-75 rounded"></div>
                          <div className="w-1 h-4 bg-blue-400 animate-pulse delay-150 rounded"></div>
                          <div className="w-1 h-4 bg-pink-400 animate-pulse delay-225 rounded"></div>
                        </div>
                        <span className="text-xs font-medium">Analyzing patterns...</span>
                      </div>
                      
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        <div className="space-y-1 mt-4">
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                          <div className="h-2 bg-gray-200 rounded w-3/5"></div>
                        </div>
                      </div>
                    </div>
                  ) : aiResult ? (
                    <>
                      <p className="mb-3 leading-relaxed text-gray-700">{aiResult.summary}</p>
                      {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                        <div>
                          <p className="text-xs mb-2 font-semibold flex items-center gap-1 text-indigo-600 uppercase tracking-wide">
                            <Sparkles className="w-3 h-3" />
                            Suggestions:
                          </p>
                          <ul className="space-y-2">
                            {aiResult.suggestions.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-xs leading-relaxed text-gray-600">{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                      <p className="text-gray-600">Click analyze for personalized insights about your progress!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meditation Card - Updated to match dashboard theme */}
            <div className="bg-white rounded-xl shadow-lg p-6 h-64 relative overflow-hidden border-l-4 border-purple-500">
              {/* Subtle zen-like pattern background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-6 right-6 w-3 h-3 bg-purple-400 rounded-full"></div>
                <div className="absolute bottom-8 left-6 w-2 h-2 bg-indigo-400 rounded-full"></div>
                <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                <div className="absolute bottom-1/3 right-1/4 w-2.5 h-2.5 bg-purple-300 rounded-full"></div>
                
                {/* Gentle wave lines for meditation theme */}
                <svg className="absolute inset-0 w-full h-full">
                  <path d="M0,50 Q25,30 50,50 T100,50" stroke="#8b5cf6" strokeWidth="0.5" opacity="0.15" fill="none" />
                  <path d="M0,80 Q25,60 50,80 T100,80" stroke="#a855f7" strokeWidth="0.5" opacity="0.15" fill="none" />
                </svg>
              </div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-purple-600 text-sm font-semibold uppercase tracking-wide">Mindfulness</p>
                    <p className="text-2xl font-bold text-gray-900">{medRuns.length} sessions</p>
                    <p className="text-sm text-gray-600">{medTotalMinutes} minutes total</p>
                  </div>
                  <button
                    onClick={() => navigate('/meditation')}
                    className="bg-purple-100 hover:bg-purple-200 p-3 rounded-full transition-colors"
                  >
                    <Play className="w-5 h-5 text-purple-600" />
                  </button>
                </div>

                <div className="text-sm">
                  {lastMed ? (
                    <div className="space-y-2 text-gray-700">
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="font-semibold text-purple-900">
                          {lastMed.sessionTitle || lastMed.session_title || 'Recent session'}
                        </p>
                        <p className="text-purple-700 text-xs">
                          {new Date(lastMed.startedAt || lastMed.started_at || '').toLocaleDateString()}
                        </p>
                        <p className="text-purple-600 text-xs">
                          {(lastMed.actualSeconds || lastMed.actual_seconds) 
                            ? Math.round((lastMed.actualSeconds || lastMed.actual_seconds || 0) / 60) + ' minutes' 
                            : 'Duration not recorded'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-purple-700 mb-2">Ready to start your mindfulness journey?</p>
                        <p className="text-purple-600 text-xs">Begin with a guided session today</p>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => navigate('/meditation')} 
                  className="mt-4 text-sm font-semibold text-purple-600 hover:text-purple-800 hover:underline transition-colors"
                >
                  View all sessions →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Toast Notifications */}
        <div aria-live="polite" className="fixed right-6 bottom-6 z-50 flex flex-col gap-3 max-w-[320px]">
          {toasts.map((t) => (
            <div key={t.id} className="w-full px-4 py-3 rounded-lg shadow-lg text-sm bg-white text-gray-800 border-l-4 border-blue-500">
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Edit2, Play, Pause, Download, Plus, Search, Filter, Clock, Timer, Target, Activity, Zap, Calendar } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const formatTime = (seconds: number | string | null | undefined): string => {
  const numSeconds = typeof seconds === 'number' ? seconds : parseInt(String(seconds || 0));
  const safeSeconds = isNaN(numSeconds) ? 0 : Math.max(0, numSeconds);
  
  const m = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const sec = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const formatDuration = (seconds: number | string | null | undefined): string => {
  // Convert to number and handle NaN/invalid values
  const numSeconds = typeof seconds === 'number' ? seconds : parseInt(String(seconds || 0));
  const safeSeconds = isNaN(numSeconds) ? 0 : numSeconds;
  
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
};

const makeId = (prefix = 'c') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type Toast = { id: string; message: string; type?: 'success' | 'error' | 'info' };

const motivationalMessages = [
  "Find peace through mindful meditation",
  "Cultivate inner calm and clarity",
  "Build a sustainable mindfulness practice",
  "Enhance focus through regular meditation",
  "Transform stress into tranquility",
  "Develop emotional balance and awareness"
];

type Session = {
  id: string;
  title: string;
  minutes: number;
  description?: string;
  custom?: boolean;
};

type Run = {
  id: string;
  sessionId?: string | null;
  sessionTitle?: string | null;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  plannedMinutes: number;
  actualSeconds: number;
  completed: boolean;
  note?: string;
};

const Meditation: React.FC = () => {
  const { user, authFetch } = useAuth();
  const userId = user?.id ?? 'anonymous';

  // user-specific keys
  const SESSIONS_KEY = `mindtrack_custom_sessions_v2_user_${userId}`;
  const HISTORY_KEY = `mindtrack_session_history_v1_user_${userId}`;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session | null>(null);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const [editMode, setEditMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<{ id?: string; title: string; minutes: number; description: string }>({
    title: '',
    minutes: 10,
    description: '',
  });

  const [history, setHistory] = useState<Run[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runNote, setRunNote] = useState('');

  const [filter, setFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [toasts, setToasts] = useState<{ id: string; message: string; type?: string }[]>([]);

  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [deleteConfirmRunId, setDeleteConfirmRunId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // load sessions & history (try backend, fallback to local)
  useEffect(() => {
    const loadData = async () => {
      // Wait for auth context to be resolved
      if (!user) {
        console.log('No user authenticated, loading fallback data');
        // Load fallback sessions from localStorage
        try {
          const raw = localStorage.getItem(SESSIONS_KEY);
          if (raw) {
            setSessions(JSON.parse(raw));
          } else {
            // Set default sessions as fallback
            const defaultSessions: Session[] = [
              { id: 'default-1', title: 'Quick Mindfulness', minutes: 5, description: 'Perfect for a quick mental reset', custom: false },
              { id: 'default-2', title: 'Deep Breathing', minutes: 10, description: 'Focus on breath awareness and relaxation', custom: false },
              { id: 'default-3', title: 'Body Scan', minutes: 15, description: 'Progressive relaxation meditation', custom: false },
              { id: 'default-4', title: 'Loving Kindness', minutes: 20, description: 'Cultivate compassion and goodwill', custom: false },
            ];
            setSessions(defaultSessions);
          }
        } catch {
          setSessions([]);
        }
        return;
      }

      console.log('Loading data for authenticated user:', user.id);

      // Load sessions (now requires authentication)
      try {
        console.log('Fetching sessions with user:', user.id);
        const res = await authFetch('/api/meditation/sessions');
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Received sessions:', data);
        
        if (data?.sessions) {
          setSessions(data.sessions);
          try { 
            localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions)); 
          } catch {}
        }
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(SESSIONS_KEY);
          if (raw) {
            setSessions(JSON.parse(raw));
          } else {
            // Set default sessions as fallback
            const defaultSessions: Session[] = [
              { id: 'default-1', title: 'Quick Mindfulness', minutes: 5, description: 'Perfect for a quick mental reset', custom: false },
              { id: 'default-2', title: 'Deep Breathing', minutes: 10, description: 'Focus on breath awareness and relaxation', custom: false },
              { id: 'default-3', title: 'Body Scan', minutes: 15, description: 'Progressive relaxation meditation', custom: false },
              { id: 'default-4', title: 'Loving Kindness', minutes: 20, description: 'Cultivate compassion and goodwill', custom: false },
            ];
            setSessions(defaultSessions);
          }
        } catch {
          setSessions([]);
        }
      }

      // Load meditation history (already requires authentication)
      try {
        console.log('Fetching runs for user:', user.id);
        const resR = await authFetch('/api/meditation/runs');
        
        if (!resR.ok) {
          throw new Error(`HTTP ${resR.status}`);
        }
        
        const dataR = await resR.json();
        console.log('Received runs:', dataR);
        
        if (dataR?.runs) {
          setHistory(dataR.runs);
          try { 
            localStorage.setItem(HISTORY_KEY, JSON.stringify(dataR.runs)); 
          } catch {}
        }
      } catch (error) {
        console.error('Failed to fetch runs:', error);
        try {
          const rawH = localStorage.getItem(HISTORY_KEY);
          if (rawH) setHistory(JSON.parse(rawH));
        } catch {
          setHistory([]);
        }
      }
    };

    loadData();
  }, [user, authFetch]); // Changed from user?.id to user

  // persist sessions & history locally as well
  useEffect(() => {
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
  }, [sessions, userId]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }, [history, userId]);

  // timer tick
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    } else if (running && remaining === 0) {
      setRunning(false);
      saveRun(true);
      showToast('Meditation completed! 🧘‍♀️', 'success');
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, remaining]);

  const startSession = async (s: Session) => {
    setActive(s);
    setRemaining(s.minutes * 60);
    setRunning(true);

    const runId = makeId('r');
    const run: Run = {
      id: runId,
      sessionId: s.id,
      sessionTitle: s.title,
      startedAt: new Date().toISOString(),
      plannedMinutes: s.minutes,
      actualSeconds: 0,
      completed: false,
    };

    // Use authFetch with snake_case payload for backend
    try {
      const payload = {
        id: run.id,
        session_id: run.sessionId,
        session_title: run.sessionTitle,
        started_at: run.startedAt,
        planned_minutes: run.plannedMinutes,
        actual_seconds: run.actualSeconds,
        completed: run.completed ? 1 : 0,
        note: run.note || null,
      };
      const res = await authFetch('/api/meditation/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      const created = text ? JSON.parse(text) : {};
      if (created?.run) {
        setHistory((h) => [created.run, ...h]);
        setCurrentRunId(created.run.id);
      } else {
        setHistory((h) => [run, ...h]);
        setCurrentRunId(run.id);
      }
    } catch {
      setHistory((h) => [run, ...h]);
      setCurrentRunId(run.id);
    }

    setRunNote('');
    showToast(`Started "${s.title}"`, 'info');
  };

  const pause = () => {
    setRunning(false);
    showToast('Meditation paused', 'info');
  };
  const resume = () => {
    setRunning(true);
    showToast('Meditation resumed', 'info');
  };

  const stopSession = () => {
    setRunning(false);
    saveRun(false);
    showToast('Session saved successfully', 'success');
  };

  const saveRun = async (autoCompleted: boolean) => {
    if (!currentRunId) return;
    const now = new Date().toISOString();
    
    const currentRun = history.find(r => r.id === currentRunId);
    if (!currentRun) return;
    
    let actualSeconds: number;
    if (active) {
      const totalPlannedSeconds = active.minutes * 60;
      const elapsedSeconds = totalPlannedSeconds - remaining;
      actualSeconds = Math.max(0, elapsedSeconds);
    } else {
      const started = new Date(currentRun.startedAt).getTime();
      const ended = Date.now();
      actualSeconds = Math.round((ended - started) / 1000);
    }
    
    const updatedRunData: Run = {
      ...currentRun,
      endedAt: now,
      actualSeconds: actualSeconds,
      completed: autoCompleted || remaining === 0,
      note: runNote || currentRun.note,
    };

    setHistory((h) =>
      h.map((r) => (r.id === currentRunId ? updatedRunData : r))
    );

    try {
      const payload = {
        ended_at: updatedRunData.endedAt,
        actual_seconds: updatedRunData.actualSeconds,
        completed: updatedRunData.completed ? 1 : 0,
        note: updatedRunData.note || null,
      };
      
      await authFetch(`/api/meditation/runs/${updatedRunData.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore persist errors
    }

    setCurrentRunId(null);
    setActive(null);
    setRemaining(0);
    setRunNote('');
  };

  // toasts
  const showToast = (message: string, type: Toast['type'] = 'success', timeout = 3000) => {
    const id = makeId('t');
    setToasts((s) => [...s, { id, message, type }]);
    window.setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), timeout);
  };

  // custom sessions management
  const openCreate = () => {
    setForm({ title: '', minutes: 10, description: '' });
    setEditMode('create');
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const openEdit = (s: Session) => {
    setForm({ id: s.id, title: s.title, minutes: s.minutes, description: s.description || '' });
    setEditMode('edit');
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const cancelEdit = () => {
    setEditMode(null);
    setForm({ title: '', minutes: 10, description: '' });
  };

  const saveCustom = async () => {
    const title = form.title.trim();
    if (!title || form.minutes <= 0) {
      showToast('Please provide a valid title and duration', 'error');
      return;
    }
    
    if (editMode === 'edit' && form.id) {
      try {
        const payload = { title, minutes: form.minutes, description: form.description };
        const res = await authFetch(`/api/meditation/sessions/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const text = await res.text().catch(() => '');
        const updated = text ? JSON.parse(text) : {};
        if (updated?.session) {
          setSessions((s) => s.map((x) => (x.id === form.id ? updated.session : x)));
          showToast('Session updated successfully', 'success');
        } else {
          setSessions((s) => s.map((x) => (x.id === form.id ? { ...x, title, minutes: form.minutes, description: form.description } : x)));
          showToast('Session updated', 'success');
        }
      } catch {
        setSessions((s) => s.map((x) => (x.id === form.id ? { ...x, title, minutes: form.minutes, description: form.description } : x)));
        showToast('Session updated (saved locally)', 'success');
      }
    } else {
      const newS: Session = { id: makeId('s'), title, minutes: form.minutes, description: form.description, custom: true };
      try {
        const payload = { id: newS.id, title: newS.title, minutes: newS.minutes, description: newS.description, custom: 1 };
        const res = await authFetch('/api/meditation/sessions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const text = await res.text().catch(() => '');
        const created = text ? JSON.parse(text) : {};
        if (created?.session) {
          setSessions((s) => [created.session, ...s]);
          showToast('Session created successfully', 'success');
        } else {
          setSessions((s) => [newS, ...s]);
          showToast('Session created', 'success');
        }
      } catch {
        setSessions((s) => [newS, ...s]);
        showToast('Session created (saved locally)', 'success');
      }
    }
    setEditMode(null);
    setForm({ title: '', minutes: 10, description: '' });
  };

  const removeCustom = async (id: string) => {
    setDeleteConfirmSessionId(id);
    showToast('Confirm deletion by clicking the delete button again, or cancel below', 'info', 5000);
  };

  const confirmDeleteSession = async (id: string) => {
    // Optimistic remove
    setSessions((s) => s.filter((x) => x.id !== id));
    setDeleteConfirmSessionId(null);

    if (user) {
      try {
        await authFetch(`/api/meditation/sessions/${id}`, { method: 'DELETE' });
        showToast('Session deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete session:', error);
        showToast('Session deleted (removed locally)', 'success');
      }
    } else {
      showToast('Session deleted', 'success');
    }
  };

  const cancelDeleteSession = () => {
    setDeleteConfirmSessionId(null);
    showToast('Session deletion cancelled', 'info');
  };

  const deleteRun = async (id: string) => {
    setDeleteConfirmRunId(id);
    showToast('Confirm deletion by clicking the delete button again, or cancel below', 'info', 5000);
  };

  const confirmDeleteRun = async (id: string) => {
    // Optimistic remove
    setHistory((h) => h.filter((r) => r.id !== id));
    setDeleteConfirmRunId(null);
    
    if (user) {
      try {
        await authFetch(`/api/meditation/runs/${id}`, { method: 'DELETE' });
        showToast('Run deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete run:', error);
        showToast('Run deleted (removed locally)', 'success');
      }
    } else {
      showToast('Run deleted', 'success');
    }
  };

  const cancelDeleteRun = () => {
    setDeleteConfirmRunId(null);
    showToast('Run deletion cancelled', 'info');
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meditation-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('History exported successfully', 'success');
  };

  const clearHistory = () => {
    if (deleteConfirmRunId === 'clear-all') {
      setHistory([]);
      setDeleteConfirmRunId(null);
      showToast('History cleared successfully', 'success');
    } else {
      setDeleteConfirmRunId('clear-all');
      showToast('Click "Clear All" again to confirm clearing all history', 'info', 5000);
    }
  };

  const cancelClearHistory = () => {
    setDeleteConfirmRunId(null);
    showToast('Clear history cancelled', 'info');
  };

  // filtered sessions
  const visibleSessions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let filtered = sessions;
    
    if (q) {
      filtered = filtered.filter((s) => 
        s.title.toLowerCase().includes(q) || 
        (s.description || '').toLowerCase().includes(q)
      );
    }
    
    if (durationFilter !== 'all') {
      filtered = filtered.filter((s) => {
        if (durationFilter === 'short') return s.minutes <= 10;
        if (durationFilter === 'medium') return s.minutes > 10 && s.minutes <= 20;
        if (durationFilter === 'long') return s.minutes > 20;
        return true;
      });
    }
    
    return filtered;
  }, [sessions, filter, durationFilter]);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const totalRuns = history.length;
    const completedRuns = history.filter((r) => r.completed).length;
    const totalMinutes = history.reduce((sum, r) => sum + Math.floor(r.actualSeconds / 60), 0);
    const todayRuns = history.filter(r => 
      new Date(r.startedAt).toDateString() === new Date().toDateString()
    ).length;
    
    return { totalSessions, totalRuns, completedRuns, totalMinutes, todayRuns };
  }, [sessions, history]);

  const getDurationColor = (minutes: number) => {
    if (minutes <= 10) return 'bg-green-100 text-green-800 border-green-200';
    if (minutes <= 20) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-purple-100 text-purple-800 border-purple-200';
  };

  const getDurationIcon = (minutes: number) => {
    if (minutes <= 10) return '⚡';
    if (minutes <= 20) return '🧘';
    return '🌟';
  };

  const getProgressPercentage = (): number => {
    if (!active || !active.minutes) return 0;
    const total = active.minutes * 60;
    if (total <= 0) return 0;
    const elapsed = total - (remaining || 0);
    const percentage = (elapsed / total) * 100;
    return Math.max(0, Math.min(100, Math.round(percentage)));
  };

  const randomMotivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Meditation Studio</h1>
              </div>
              <p className="text-gray-600 text-lg">{randomMotivation}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportHistory}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" /> Export
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" /> New Session
              </button>
            </div>
          </div>
          
          {/* Professional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Target className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Runs</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalRuns}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-green-600">{stats.todayRuns}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats.completedRuns}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Minutes</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalMinutes}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={durationFilter}
                  onChange={(e) => setDurationFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Durations</option>
                  <option value="short">Short (≤10 min)</option>
                  <option value="medium">Medium (11-20 min)</option>
                  <option value="long">Long (&gt;20 min)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Current Session - Prominent when active */}
        {active && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-8 rounded-lg shadow-sm border border-purple-200 mb-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{active.title}</h2>
              <p className="text-gray-600 mb-6">{active.description}</p>
              

              <div className="mb-6">
                <div className="text-6xl font-mono font-bold text-purple-600 mb-4">
                  {formatTime(remaining)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
                  <div 
                    className="h-3 bg-purple-600 rounded-full transition-all duration-1000" 
                    style={{ width: `${getProgressPercentage()}%` }} 
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{getProgressPercentage()}% complete</p>
              </div>
              
              <div className="flex items-center justify-center gap-4 mb-6">
                {!running ? (
                  <button 
                    onClick={resume} 
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Play className="w-5 h-5" /> Resume
                  </button>
                ) : (
                  <button 
                    onClick={pause} 
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <Pause className="w-5 h-5" /> Pause
                  </button>
                )}
                <button 
                  onClick={stopSession} 
                  className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Stop & Save
                </button>
              </div>
              
              <textarea
                value={runNote}
                onChange={(e) => setRunNote(e.target.value)}
                rows={3}
                placeholder="Add notes for this session (optional)..."
                className="w-full max-w-md mx-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          <main>
            {/* Sessions Grid */}
            {visibleSessions.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
                <Timer className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {sessions.length === 0 ? 'No sessions available' : 'No sessions match your filters'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {sessions.length === 0 
                    ? 'Create your first meditation session to get started.'
                    : 'Try adjusting your search or duration filter.'
                  }
                </p>
                {sessions.length === 0 && (
                  <button 
                    onClick={openCreate}
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create First Session
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {visibleSessions.map((s) => (
                  <article key={s.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getDurationIcon(s.minutes)}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getDurationColor(s.minutes)}`}>
                                {s.minutes} min
                              </span>
                            </div>
                          </div>
                          {s.custom && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {s.description && (
                        <p className="text-gray-600 text-sm mb-6 flex-1">{s.description}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-auto">
                        <button 
                          onClick={() => startSession(s)} 
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Play className="w-4 h-4" /> Start
                        </button>
                        <button 
                          onClick={() => openEdit(s)} 
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {s.custom && (
                          <div className="flex items-center">
                            <button 
                              onClick={() => deleteConfirmSessionId === s.id ? confirmDeleteSession(s.id) : removeCustom(s.id)} 
                              className={`p-2 transition-colors rounded-lg ${
                                deleteConfirmSessionId === s.id 
                                  ? 'text-white bg-red-600 hover:bg-red-700' 
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={deleteConfirmSessionId === s.id ? 'Click again to confirm deletion' : 'Delete session'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {deleteConfirmSessionId === s.id && (
                              <button
                                onClick={cancelDeleteSession}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-1"
                                title="Cancel deletion"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>

          <aside className="space-y-6">
            {/* Session Editor */}
            <div ref={formRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editMode === 'edit' ? 'Edit Session' : editMode === 'create' ? 'Create Session' : 'Session Manager'}
                </h2>
                {editMode && (
                  <button 
                    onClick={cancelEdit}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Title *</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Morning Mindfulness"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={form.minutes}
                      onChange={(e) => setForm((f) => ({ ...f, minutes: Math.max(1, Number(e.target.value)) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Duration: {formatDuration((form.minutes || 0) * 60)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                      placeholder="Describe this meditation session..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={cancelEdit} 
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveCustom} 
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {editMode === 'edit' ? 'Update Session' : 'Create Session'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-100 rounded-lg inline-block mb-4">
                    <Timer className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-6">Create and manage your custom meditation sessions.</p>
                  <button 
                    onClick={openCreate} 
                    className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create Session
                  </button>
                </div>
              )}
            </div>

            {/* Recent History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Sessions</h2>
                <span className="text-sm text-gray-500">{history.length} total</span>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No meditation sessions yet.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {history.slice(0, 8).map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{r.sessionTitle || 'Unknown Session'}</h4>
                        <div className="text-xs text-gray-500 mt-1">
                          {(() => {
                            try {
                              const date = new Date(r.startedAt);
                              return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                            } catch {
                              return 'Invalid date';
                            }
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Duration: {formatDuration(r.actualSeconds)}
                          {r.completed && <span className="ml-2 text-green-600">✓ Completed</span>}
                        </div>
                        {r.note && (
                          <p className="text-xs text-gray-600 mt-1 italic">"{r.note}"</p>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        <button
                          onClick={() => deleteConfirmRunId === r.id ? confirmDeleteRun(r.id) : deleteRun(r.id)}
                          className={`p-1 transition-colors rounded ${
                            deleteConfirmRunId === r.id 
                              ? 'text-white bg-red-600 hover:bg-red-700' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={deleteConfirmRunId === r.id ? 'Click again to confirm deletion' : 'Delete run'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {deleteConfirmRunId === r.id && (
                          <button
                            onClick={cancelDeleteRun}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors ml-1"
                            title="Cancel deletion"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center flex-1">
                    <button 
                      onClick={clearHistory}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                        deleteConfirmRunId === 'clear-all'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      {deleteConfirmRunId === 'clear-all' ? 'Confirm Clear All' : 'Clear All'}
                    </button>
                    {deleteConfirmRunId === 'clear-all' && (
                      <button
                        onClick={cancelClearHistory}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-2"
                        title="Cancel clear all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button 
                    onClick={exportHistory} 
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Export
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Toast Messages */}
        <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {toasts.map((t) => (
            <div 
              key={t.id} 
              className={`min-w-[320px] px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
                t.type === 'success' ? 'bg-green-500' : 
                t.type === 'error' ? 'bg-red-500' : 
                'bg-blue-500'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Meditation;
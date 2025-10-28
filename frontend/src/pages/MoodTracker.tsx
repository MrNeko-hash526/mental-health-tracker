import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Trash2, Calendar, BarChart2, Edit2, Download, Save, Clock, Plus, Search, Filter, TrendingUp, Heart, Activity, Target, Zap } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

type MoodEntry = {
  id: string;
  score: number; // 1..5 (valence / mood)
  energy: number; // 1..5 (energy level)
  intensity: number; // 1..5 (mood intensity)
  emoji: string;
  note?: string;
  date: string; // ISO
  tags?: string[];
};

const EMOJIS = ['😔', '😕', '😐', '🙂', '😊'];
const MOOD_LABELS = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
const ENERGY_LABELS = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
const INTENSITY_LABELS = ['Very Calm', 'Calm', 'Moderate', 'Intense', 'Very Intense'];

const formatShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

const startOfDayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

const combineDateTime = (dateStr: string, timeStr: string) => {
  const d = new Date(dateStr);
  const [h = '0', m = '0'] = (timeStr || '').split(':');
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toISOString();
};

const motivationalMessages = [
  "Track your emotional journey with mindful awareness",
  "Understanding your moods leads to better well-being",
  "Every emotion is valid and worth acknowledging",
  "Build emotional intelligence through consistent tracking",
  "Your feelings matter - document them with care",
  "Develop self-awareness through mood monitoring"
];

type Toast = { id: string; message: string; type?: 'success' | 'error' | 'info' };

const MoodTracker: React.FC = () => {
  const { user, authFetch } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const STORAGE_KEY = `mindtrack_moods_v2_user_${userId}`;

  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [score, setScore] = useState<number>(5);
  const [energy, setEnergy] = useState<number>(3);
  const [intensity, setIntensity] = useState<number>(3);
  const [note, setNote] = useState('');
  const [date, setDate] = useState<string>(startOfDayISO().slice(0, 10)); // yyyy-mm-dd
  const [time, setTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [filter, setFilter] = useState<string>('');
  const [moodFilter, setMoodFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // Load entries from backend
  const loadEntries = async () => {
    if (!user) {
      // Load from localStorage for non-authenticated users
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
      return;
    }

    try {
      console.log('Fetching mood entries for user:', user.id);
      const res = await authFetch('/api/mood/entries');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Received mood entries:', data);
      
      if (data?.entries) {
        setEntries(data.entries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
      }
    } catch (err) {
      console.error('Failed to load mood entries:', err);
      // Fallback to localStorage
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setEntries(JSON.parse(raw));
        } catch {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
    }
  };

  // Load entries when component mounts or user changes
  useEffect(() => {
    loadEntries();
  }, [user]);

  // Persist entries to localStorage for offline access
  useEffect(() => {
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); 
    } catch {}
  }, [entries]);

  const showToast = (message: string, type: Toast['type'] = 'success', timeout = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), timeout);
  };

  // Save function — create/update backend and local
  const save = async () => {
    const iso = combineDateTime(date, time);
    const tags = toTags(tagInput);

    if (editingId) {
      const updated: MoodEntry = {
        id: editingId,
        score, energy, intensity, emoji: EMOJIS[score - 1],
        note: note.trim() || undefined, date: iso, tags
      };
      
      // Optimistic update
      setEntries((s) => s.map((e) => (e.id === editingId ? updated : e)));
      
      if (user) {
        try {
          const res = await authFetch(`/api/mood/entries/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify({
              score: updated.score,
              energy: updated.energy,
              intensity: updated.intensity,
              emoji: updated.emoji,
              note: updated.note,
              date: updated.date,
              tags: updated.tags
            })
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const responseData = await res.json();
          if (responseData?.entry) {
            setEntries((s) => s.map((e) => (e.id === editingId ? responseData.entry : e)));
          }
          
          showToast('Mood entry updated successfully', 'success');
        } catch (error) {
          console.error('Failed to update mood entry:', error);
          showToast('Mood entry updated (saved locally)', 'success');
        }
      } else {
        showToast('Mood entry updated (saved locally)', 'success');
      }
    } else {
      const entry: MoodEntry = {
        id: Date.now().toString(),
        score, energy, intensity, emoji: EMOJIS[score - 1],
        note: note.trim() || undefined, date: iso, tags
      };
      
      // Optimistic add
      setEntries((s) => [entry, ...s]);
      
      if (user) {
        try {
          const res = await authFetch('/api/mood/entries', {
            method: 'POST',
            body: JSON.stringify(entry)
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const responseData = await res.json();
          if (responseData?.entry) {
            // Replace placeholder with real entry from server
            setEntries((s) => s.map((e) => (e.id === entry.id ? responseData.entry : e)));
          }
          
          showToast('Mood entry created successfully', 'success');
        } catch (error) {
          console.error('Failed to create mood entry:', error);
          showToast('Mood entry created (saved locally)', 'success');
        }
      } else {
        showToast('Mood entry created (saved locally)', 'success');
      }
    }
    
    resetForm();
  };

  const resetForm = () => {
    setScore(5);
    setEnergy(3);
    setIntensity(3);
    setNote('');
    setDate(startOfDayISO().slice(0, 10));
    const now = new Date();
    setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setEditingId(null);
    setTagInput('');
    setFormOpen(false);
  };

  const toTags = (s: string) =>
    s
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const edit = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setEditingId(id);
    setScore(e.score);
    setEnergy(e.energy ?? 3);
    setIntensity(e.intensity ?? 3);
    setNote(e.note || '');
    const d = new Date(e.date);
    setDate(d.toISOString().slice(0, 10));
    setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setTagInput((e.tags || []).join(', '));
    setFormOpen(true);
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const remove = async (id: string) => {
    setDeleteConfirmId(id);
    showToast('Confirm deletion by clicking the delete button again, or cancel below', 'info', 5000);
  };

  const confirmDelete = async (id: string) => {
    // Optimistic remove
    setEntries((s) => s.filter((e) => e.id !== id));
    setDeleteConfirmId(null);
    
    if (user) {
      try {
        const res = await authFetch(`/api/mood/entries/${id}`, { method: 'DELETE' });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        showToast('Mood entry deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete mood entry:', error);
        showToast('Mood entry deleted (removed locally)', 'success');
      }
    } else {
      showToast('Mood entry deleted', 'success');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
    showToast('Deletion cancelled', 'info');
  };

  // computed stats
  const stats = useMemo(() => {
    const total = entries.length;
    const avg = total ? entries.reduce((s, e) => s + e.score, 0) / total : 0;
    const avgEnergy = total ? entries.reduce((s, e) => s + (e.energy || 0), 0) / total : 0;
    const avgIntensity = total ? entries.reduce((s, e) => s + (e.intensity || 0), 0) / total : 0;
    const todayEntries = entries.filter(e => 
      new Date(e.date).toDateString() === new Date().toDateString()
    ).length;
    return { total, avg, avgEnergy, avgIntensity, todayEntries };
  }, [entries]);

  // weekly (last 7 days)
  const getLastNDays = (n: number) => {
    const days: { label: string; iso: string; dateObj: Date }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), iso: d.toISOString(), dateObj: d });
    }
    return days;
  };

  const weekly = useMemo(() => {
    const days = getLastNDays(7);
    return days.map((d) => {
      const dayEntries = entries.filter((e) => new Date(e.date).toDateString() === d.dateObj.toDateString());
      const avg = dayEntries.length ? dayEntries.reduce((s, x) => s + x.score, 0) / dayEntries.length : 0;
      return { label: d.label, avg, count: dayEntries.length };
    });
  }, [entries]);

  const filtered = entries.filter((e) => {
    const q = filter.trim().toLowerCase();
    const matchesQuery = !q || 
      e.note?.toLowerCase().includes(q) ||
      (e.tags || []).some((t) => t.toLowerCase().includes(q)) ||
      e.emoji.includes(q) ||
      e.score.toString() === q ||
      new Date(e.date).toLocaleDateString().toLowerCase().includes(q) ||
      e.energy?.toString() === q ||
      e.intensity?.toString() === q;
    
    const matchesMood = moodFilter === 'all' || e.score.toString() === moodFilter;
    
    return matchesQuery && matchesMood;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindtrack-moods-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Mood data exported successfully', 'success');
  };

  const exportCSV = () => {
    const rows = [['id', 'date', 'score', 'energy', 'intensity', 'emoji', 'note', 'tags']];
    entries.forEach((e) =>
      rows.push([
        e.id,
        e.date,
        String(e.score),
        String(e.energy ?? ''),
        String(e.intensity ?? ''),
        e.emoji,
        (e.note || '').replace(/\n/g, '\\n'),
        (e.tags || []).join(';'),
      ])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindtrack-moods-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Mood data exported successfully', 'success');
  };

  const getMoodColor = (score: number) => {
    switch (score) {
      case 1: return 'text-red-600 bg-red-50 border-red-200';
      case 2: return 'text-orange-600 bg-orange-50 border-orange-200';
      case 3: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 4: return 'text-green-600 bg-green-50 border-green-200';
      case 5: return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getChartColor = (score: number) => {
    switch (Math.round(score)) {
      case 1: return '#ef4444';
      case 2: return '#f97316';
      case 3: return '#eab308';
      case 4: return '#22c55e';
      case 5: return '#10b981';
      default: return '#6b7280';
    }
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
                <div className="p-2 bg-pink-600 rounded-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Mood Tracker</h1>
              </div>
              <p className="text-gray-600 text-lg">{randomMotivation}</p>
              {!user && (
                <p className="text-amber-600 text-sm mt-2">
                  ⚠️ Not logged in - data will only be saved locally
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" /> JSON
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" /> CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" /> Log Mood
              </button>
            </div>
          </div>
          
          {/* Professional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Entries</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Target className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.todayEntries}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Mood</p>
                  <p className="text-3xl font-bold text-green-600">{stats.avg ? stats.avg.toFixed(1) : '—'}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Heart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Energy</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.avgEnergy ? stats.avgEnergy.toFixed(1) : '—'}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Intensity</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.avgIntensity ? stats.avgIntensity.toFixed(1) : '—'}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
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
                  placeholder="Search moods, notes, and tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={moodFilter}
                  onChange={(e) => setMoodFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="all">All Moods</option>
                  <option value="1">😔 Very Sad</option>
                  <option value="2">😕 Sad</option>
                  <option value="3">😐 Neutral</option>
                  <option value="4">🙂 Happy</option>
                  <option value="5">😊 Very Happy</option>
                </select>
              </div>
              
              <button
                onClick={loadEntries}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">7-Day Mood Trend</h2>
                <p className="text-sm text-gray-600">Average mood score per day</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Overall Average: <span className="font-semibold text-gray-900">{stats.avg ? stats.avg.toFixed(2) : '—'}</span>
            </div>
          </div>

          <div className="flex items-end justify-center gap-4 h-40 px-4">
            {weekly.map((d, index) => {
              const height = d.avg ? Math.max(10, Math.round((d.avg / 5) * 100)) : 10;
              const color = d.avg ? getChartColor(d.avg) : '#e5e7eb';
              const isToday = index === weekly.length - 1;
              
              return (
                <div key={d.label} className="flex flex-col items-center flex-1 max-w-[60px]">
                  <div className="w-full flex items-end justify-center h-32 mb-3">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 min-h-[10px] relative group cursor-pointer"
                      style={{ height: `${height}%`, backgroundColor: color }}
                      title={`${d.label}: ${d.count > 0 ? `${d.avg.toFixed(2)} (${d.count} entries)` : 'No entries'}`}
                    >
                      {d.count > 0 && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {d.avg.toFixed(1)} ({d.count})
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${isToday ? 'text-pink-600' : 'text-gray-500'}`}>
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          <main>
            {/* Entries */}
            {filtered.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {entries.length === 0 ? 'No mood entries yet' : 'No entries match your filters'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {entries.length === 0 
                    ? 'Start tracking your emotions and build emotional awareness.'
                    : 'Try adjusting your search or mood filter to find your entries.'
                  }
                </p>
                {entries.length === 0 && (
                  <button 
                    onClick={openCreate}
                    className="px-6 py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Log Your First Mood
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((e) => (
                  <article key={e.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                          {e.emoji}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getMoodColor(e.score)}`}>
                              {MOOD_LABELS[e.score - 1]}
                            </span>
                            <div className="text-sm text-gray-500">
                              {formatDate(e.date)} at {formatTime(e.date)}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => edit(e.id)}
                              className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                              title="Edit entry"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteConfirmId === e.id ? confirmDelete(e.id) : remove(e.id)}
                              className={`p-2 transition-colors rounded-lg ${
                                deleteConfirmId === e.id 
                                  ? 'text-white bg-red-600 hover:bg-red-700' 
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title={deleteConfirmId === e.id ? 'Click again to confirm deletion' : 'Delete entry'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {deleteConfirmId === e.id && (
                              <button
                                onClick={cancelDelete}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors ml-1"
                                title="Cancel deletion"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {e.note && (
                          <div className="prose prose-gray max-w-none mb-4">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {e.note}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-gray-600">Energy: <span className="font-medium">{e.energy}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-gray-600">Intensity: <span className="font-medium">{e.intensity}</span></span>
                          </div>
                        </div>
                        
                        {e.tags && e.tags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-2">
                              {e.tags.map((t) => (
                                <span key={t} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>

          <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Mood Entry' : formOpen ? 'Log Your Mood' : 'Mood Logger'}
              </h2>
              {formOpen && (
                <button 
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {formOpen ? (
              <div ref={formRef} className="space-y-6">
                {/* Mood Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">How are you feeling?</label>
                  <div className="grid grid-cols-5 gap-2">
                    {EMOJIS.map((emoji, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={value}
                          onClick={() => setScore(value)}
                          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                            score === value 
                              ? 'border-pink-500 bg-pink-50 text-pink-700' 
                              : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50'
                          }`}
                        >
                          <span className="text-2xl mb-1">{emoji}</span>
                          <span className="text-xs font-medium">{value}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Selected: <span className="font-medium">{MOOD_LABELS[score - 1]}</span>
                  </p>
                </div>

                {/* Energy Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Selected: <span className="font-medium">{ENERGY_LABELS[energy - 1]}</span>
                  </p>
                </div>

                {/* Intensity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intensity Level</label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Calm</span>
                    <span>Intense</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Selected: <span className="font-medium">{INTENSITY_LABELS[intensity - 1]}</span>
                  </p>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="What's contributing to this mood? Any specific thoughts or events?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="work, family, exercise, stress (comma separated)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 rounded-lg inline-block mb-4">
                  <Heart className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-6">Ready to log your current mood?</p>
                <button 
                  onClick={openCreate} 
                  className="px-6 py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors"
                >
                  Log Mood
                </button>
              </div>
            )}
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

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ec4899;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default MoodTracker;
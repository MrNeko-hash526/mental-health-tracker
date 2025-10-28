import React, { useEffect, useState, useRef } from 'react';
import { Trash2, Plus, Edit2, Zap, Download, Search, Filter, Calendar, Tag, BookOpen, Heart, Meh, Frown, FileText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

type Sentiment = 'positive' | 'neutral' | 'negative' | null;

type Entry = {
  id: string;
  mood: '😊' | '😐' | '😔';
  text: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  summary?: string;
  sentiment?: Sentiment;
  aiLoading?: boolean;
};

const PAGE_SIZE = 8;

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

const motivationalMessages = [
  "Reflection brings clarity to your thoughts",
  "Every entry is a step towards self-awareness",
  "Your thoughts matter and deserve to be captured",
  "Writing helps process emotions and experiences",
  "Document your journey, one entry at a time",
  "Self-reflection is the foundation of growth"
];

type Toast = { id: string; message: string; type?: 'success' | 'error' | 'info' };

const Journal: React.FC = () => {
  const { user, authFetch } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const STORAGE_KEY = `mindtrack_journal_v2_user_${userId}`;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [openEditor, setOpenEditor] = useState(false);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Entry['mood']>('😊');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<'all' | '😊' | '😐' | '😔'>('all');
  const [tagInput, setTagInput] = useState('');
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const saveTimer = useRef<number | null>(null);
  const draftTimer = useRef<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: Toast['type'] = 'success', timeout = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 5);
    setToasts((s) => [...s, { id, message, type }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), timeout);
  };

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
      console.log('Fetching journal entries for user:', user.id);
      const res = await authFetch('/api/journal/entries');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Received journal entries:', data);
      
      if (data?.entries) {
        setEntries(data.entries);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
      }
    } catch (err) {
      console.error('Failed to load journal entries:', err);
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

  // persist local copy (debounced)
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [entries]);

  const resetEditor = () => {
    setText('');
    setMood('😊');
    setTagInput('');
    setEditingId(null);
    setOpenEditor(false);
  };

  const startNew = () => {
    setEditingId(null);
    setText('');
    setMood('😊');
    setTagInput('');
    setOpenEditor(true);
    
    // Scroll to editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const toTags = (input: string) =>
    input
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  const save = async () => {
    if (!text.trim()) {
      showToast('Please write something before saving', 'error');
      return;
    }
    const tags = toTags(tagInput);
    
    // Optimistic update
    const now = new Date().toISOString();
    
    if (editingId) {
      const updated: Entry = {
        id: editingId,
        mood,
        text: text.trim(),
        tags,
        createdAt: entries.find(e => e.id === editingId)?.createdAt || now,
        updatedAt: now
      };
      setEntries((s) => s.map((e) => (e.id === editingId ? updated : e)));
      
      if (user) {
        try {
          const res = await authFetch(`/api/journal/entries/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify({ text: text.trim(), mood, tags }),
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const data = await res.json();
          if (data?.entry) {
            setEntries((s) => s.map((e) => (e.id === editingId ? data.entry : e)));
          }
          
          showToast('Entry updated successfully', 'success');
        } catch (error) {
          console.error('Failed to update entry:', error);
          showToast('Entry updated (saved locally)', 'success');
        }
      } else {
        showToast('Entry updated (saved locally)', 'success');
      }
    } else {
      const entry: Entry = {
        id: Date.now().toString(),
        mood,
        text: text.trim(),
        createdAt: now,
        updatedAt: now,
        tags,
      };
      setEntries((s) => [entry, ...s]);
      
      if (user) {
        try {
          const res = await authFetch('/api/journal/entries', {
            method: 'POST',
            body: JSON.stringify({ text: text.trim(), mood, tags }),
          });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          
          const data = await res.json();
          if (data?.entry) {
            // Replace placeholder with real entry from server
            setEntries((s) => s.map((e) => (e.id === entry.id ? data.entry : e)));
          }
          
          showToast('Entry created successfully', 'success');
        } catch (error) {
          console.error('Failed to create entry:', error);
          showToast('Entry created (saved locally)', 'success');
        }
      } else {
        showToast('Entry created (saved locally)', 'success');
      }
    }
    
    resetEditor();
  };

  const edit = (e: Entry) => {
    setEditingId(e.id);
    setText(e.text);
    setMood(e.mood);
    setTagInput((e.tags || []).join(', '));
    setOpenEditor(true);
    
    // Scroll to editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  // Deletion confirmation pattern
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
        const res = await authFetch(`/api/journal/entries/${id}`, { method: 'DELETE' });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        showToast('Entry deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete entry:', error);
        showToast('Entry deleted (removed locally)', 'success');
      }
    } else {
      showToast('Entry deleted', 'success');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
    showToast('Deletion cancelled', 'info');
  };

  const generateSummary = async (id: string) => {
    setEntries((s) => s.map((e) => (e.id === id ? { ...e, aiLoading: true } : e)));
    
    if (user) {
      try {
        const res = await authFetch(`/api/journal/entries/${id}/summarize`, {
          method: 'POST',
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json();
        if (data?.entry) {
          setEntries((s) => s.map((e) => (e.id === id ? { ...data.entry, aiLoading: false } : e)));
          showToast('AI summary generated successfully', 'success');
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
        setEntries((s) => s.map((e) => (e.id === id ? { ...e, aiLoading: false } : e)));
        showToast('Failed to generate AI summary', 'error');
      }
    } else {
      setEntries((s) => s.map((e) => (e.id === id ? { ...e, aiLoading: false } : e)));
      showToast('AI features require login', 'info');
    }
  };

  // inline draft autosave while editing (localStorage temp)
  useEffect(() => {
    if (!openEditor) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      const draft = { text, mood, tags: toTags(tagInput) };
      localStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(draft));
    }, 300);
    return () => {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
    };
  }, [text, mood, tagInput, openEditor]);

  // load draft on open new editor
  useEffect(() => {
    if (!openEditor || editingId) return;
    const raw = localStorage.getItem(`${STORAGE_KEY}_draft`);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        setText(d.text || '');
        setMood(d.mood || '😊');
        setTagInput((d.tags || []).join(', '));
      } catch {}
    }
  }, [openEditor, editingId]);

  // search and mood filter
  const filtered = entries.filter((e) => {
    const matchesQuery = e.text.toLowerCase().includes(query.toLowerCase()) ||
      (e.tags || []).some((t) => t.toLowerCase().includes(query.toLowerCase()));
    
    const matchesMood = moodFilter === 'all' || e.mood === moodFilter;
    
    return matchesQuery && matchesMood;
  });

  // pagination
  const paged = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = filtered.length > paged.length;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindtrack-journal-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Journal exported successfully', 'success');
  };

  // Statistics
  const totalEntries = entries.length;
  const todayEntries = entries.filter(e => 
    new Date(e.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const thisWeekEntries = entries.filter(e => {
    const entryDate = new Date(e.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length;
  const averageLength = entries.length > 0 
    ? Math.round(entries.reduce((sum, e) => sum + e.text.length, 0) / entries.length)
    : 0;

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case '😊': return <Heart className="w-5 h-5 text-green-600" />;
      case '😐': return <Meh className="w-5 h-5 text-yellow-600" />;
      case '😔': return <Frown className="w-5 h-5 text-red-600" />;
      default: return <Heart className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: Sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      case 'neutral': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Personal Journal</h1>
              </div>
              <p className="text-gray-600 text-lg">{randomMotivation}</p>
              {!user && (
                <p className="text-amber-600 text-sm mt-2">
                  ⚠️ Not logged in - data will only be saved locally, AI features disabled
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" /> Export
              </button>
              <button
                onClick={startNew}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" /> New Entry
              </button>
            </div>
          </div>
          
          {/* Professional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Entries</p>
                  <p className="text-3xl font-bold text-gray-900">{totalEntries}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-blue-600">{todayEntries}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-3xl font-bold text-green-600">{thisWeekEntries}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Length</p>
                  <p className="text-3xl font-bold text-purple-600">{averageLength}</p>
                  <p className="text-xs text-gray-500">characters</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600" />
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search entries and tags..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={moodFilter}
                  onChange={(e) => setMoodFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Moods</option>
                  <option value="😊">😊 Happy</option>
                  <option value="😐">😐 Neutral</option>
                  <option value="😔">😔 Sad</option>
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

        {/* Editor */}
        {openEditor && (
          <div ref={editorRef} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingId ? 'Edit Entry' : 'New Entry'}
              </h2>
              <button 
                onClick={resetEditor}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">How are you feeling?</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMood('😊')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      mood === '😊' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white hover:border-green-300'
                    }`}
                  >
                    <span className="text-2xl">😊</span>
                    <span className="font-medium">Happy</span>
                  </button>
                  <button
                    onClick={() => setMood('😐')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      mood === '😐' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 bg-white hover:border-yellow-300'
                    }`}
                  >
                    <span className="text-2xl">😐</span>
                    <span className="font-medium">Neutral</span>
                  </button>
                  <button
                    onClick={() => setMood('😔')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      mood === '😔' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white hover:border-red-300'
                    }`}
                  >
                    <span className="text-2xl">😔</span>
                    <span className="font-medium">Sad</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your thoughts</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  placeholder="What's on your mind? Share your thoughts, feelings, experiences..."
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {text.length} characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags (comma separated) - work, personal, thoughts, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {toTags(tagInput).length} tags
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetEditor}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Entries */}
        <div className="space-y-4">
          {paged.length === 0 ? (
            <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
              </h3>
              <p className="text-gray-500 mb-6">
                {entries.length === 0 
                  ? 'Start documenting your thoughts and experiences.'
                  : 'Try adjusting your search or mood filter to find your entries.'
                }
              </p>
              {entries.length === 0 && (
                <button 
                  onClick={startNew}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Write Your First Entry
                </button>
              )}
            </div>
          ) : (
            paged.map((e) => (
              <article key={e.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                      {e.mood}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getMoodIcon(e.mood)}
                        <div className="text-sm text-gray-500">
                          {formatDate(e.createdAt)} at {formatTime(e.createdAt)}
                          {e.updatedAt && e.updatedAt !== e.createdAt && (
                            <span className="ml-2">• Edited {formatTime(e.updatedAt)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => edit(e)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit entry"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => generateSummary(e.id)}
                          disabled={e.aiLoading || !user}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                          title={user ? "Generate AI summary" : "Login required for AI features"}
                        >
                          <Zap className="w-4 h-4" />
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
                    
                    <div className="prose prose-gray max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {e.text}
                      </p>
                    </div>
                    
                    {e.tags && e.tags.length > 0 && (
                      <div className="flex items-center gap-2 mb-4">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <div className="flex flex-wrap gap-2">
                          {e.tags.map((t) => (
                            <span key={t} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {e.summary && (
                      <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-800">AI Summary</span>
                          {e.sentiment && (
                            <span className={`text-xs px-2 py-1 rounded-full border ${getSentimentColor(e.sentiment)}`}>
                              {e.sentiment}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-indigo-700 leading-relaxed">
                          {e.summary}
                        </p>
                      </div>
                    )}

                    {e.aiLoading && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">Generating AI summary...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Load More Entries
            </button>
          </div>
        )}

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

export default Journal;
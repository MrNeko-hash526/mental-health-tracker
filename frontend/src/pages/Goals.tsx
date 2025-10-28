import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Check, Target, Trophy, Star, Calendar, Tag, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type Goal = {
  id: string;
  title: string;
  note?: string;
  createdAt: string; // ISO
  dueAt?: string; // ISO date/time
  completed: boolean;
  completedAt?: string; // ISO
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
};

const GOALS_KEY = 'mindtrack_goals_v1';
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

const makeId = (prefix = 'g') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// useAuth.authFetch attaches Authorization header (Bearer <token>)
// small helper to call backend and return parsed JSON or throw
function buildUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

const motivationalMessages = [
  "Stay focused on your objectives",
  "Consistent progress leads to success",
  "Transform your vision into reality",
  "Excellence is built one goal at a time",
  "Your dedication drives results",
  "Strategic planning meets execution"
];

const Goals: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const formRef = useRef<HTMLDivElement>(null); // Add ref for the form
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title?: string } | null>(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [editing, setEditing] = useState<Goal | null>(null);
  const [form, setForm] = useState({ title: '', note: '', dueAt: '', priority: 'medium', tags: '' });
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // try to load from backend; fallback to localStorage
    (async () => {
      setLoading(true);
      try {
        const res = await authFetch(buildUrl('/api/goals'), { method: 'GET' });
        const data = await (async () => {
          const text = await res.text();
          return text ? JSON.parse(text) : {};
        })();
        if (data && Array.isArray(data.goals)) {
          const mapped: Goal[] = data.goals.map((g: any) => ({
            id: String(g.id),
            title: g.title,
            note: g.note || undefined,
            createdAt: g.created_at || g.createdAt || new Date().toISOString(),
            dueAt: g.due_at || g.dueAt || undefined,
            completed: Boolean(g.completed),
            completedAt: g.completed_at || g.completedAt || undefined,
            priority: g.priority || 'medium',
            tags: Array.isArray(g.tags) ? g.tags : g.tags ? JSON.parse(g.tags) : [],
          }));
          setGoals(mapped);
          localStorage.setItem(GOALS_KEY, JSON.stringify(mapped));
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // if unauthorized, redirect to login
        if (err.message && /unauthorized|401/i.test(err.message)) {
          navigate('/login');
          return;
        }
        // fallback to localStorage
        try {
          const raw = localStorage.getItem(GOALS_KEY);
          if (raw) setGoals(JSON.parse(raw));
        } catch {
          setGoals([]);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }, [goals]);

  const showToast = (msg: string, timeout = 3000) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 5);
    setToasts((s) => [...s, { id, msg }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), timeout);
  };

  const resetForm = () => setForm({ title: '', note: '', dueAt: '', priority: 'medium', tags: '' });

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setFormOpen(true);
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setForm({
      title: g.title,
      note: g.note || '',
      dueAt: g.dueAt ? g.dueAt.split('T')[0] : '',
      priority: g.priority || 'medium',
      tags: (g.tags || []).join(', '),
    });
    setFormOpen(true);
    
    // Scroll to form after a brief delay
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const saveGoal = async () => {
    const title = form.title.trim();
    if (!title) {
      showToast('Please enter a goal title');
      return;
    }
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editing) {
        const payload = {
          title,
          note: form.note.trim() || null,
          due_at: form.dueAt || null,
          priority: form.priority,
          tags,
        };
        const res = await authFetch(buildUrl(`/api/goals/${editing.id}`), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const data = await (async () => {
          const t = await res.text();
          return t ? JSON.parse(t) : {};
        })();
        const g = data.goal;
        setGoals((s) => s.map((x) => (String(x.id) === String(g.id) ? {
          id: String(g.id),
          title: g.title,
          note: g.note || undefined,
          createdAt: g.created_at || x.createdAt,
          dueAt: g.due_at || undefined,
          completed: Boolean(g.completed),
          completedAt: g.completed_at || undefined,
          priority: g.priority || 'medium',
          tags: Array.isArray(g.tags) ? g.tags : g.tags ? JSON.parse(g.tags) : [],
        } : x)));
        showToast('Goal updated successfully');
      } else {
        const payload = {
          title,
          note: form.note.trim() || null,
          due_at: form.dueAt || null,
          priority: form.priority,
          tags,
        };
        const res = await authFetch(buildUrl('/api/goals'), { method: 'POST', body: JSON.stringify(payload) });
        const data = await (async () => {
          const t = await res.text();
          return t ? JSON.parse(t) : {};
        })();
        const g = data.goal;
        const mapped: Goal = {
          id: String(g.id),
          title: g.title,
          note: g.note || undefined,
          createdAt: g.created_at || new Date().toISOString(),
          dueAt: g.due_at || undefined,
          completed: Boolean(g.completed),
          completedAt: g.completed_at || undefined,
          priority: g.priority || 'medium',
          tags: Array.isArray(g.tags) ? g.tags : g.tags ? JSON.parse(g.tags) : [],
        };
        setGoals((s) => [mapped, ...s]);
        showToast('Goal created successfully');
      }
      setEditing(null);
      resetForm();
      setFormOpen(false);
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Save failed'));
    }
  };

  const askAndDelete = async (id: string, title?: string) => {
    // open a toast-style confirmation (store pending delete)
    setPendingDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    try {
      const res = await authFetch(buildUrl(`/api/goals/${id}`), { method: 'DELETE' });
      const text = await res.text();
      // attempt parse (but we don't rely on its shape)
      try { if (text) JSON.parse(text); } catch {}
      setGoals((s) => s.filter((g) => g.id !== id));
      showToast('Goal deleted');
    } catch (err: any) {
      showToast('Error: ' + (err?.message || 'Delete failed'));
    } finally {
      setPendingDelete(null);
    }
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    showToast('Delete cancelled', 1500);
  };

  const toggleComplete = async (id: string) => {
    const current = goals.find((g) => g.id === id);
    if (!current) return;
    
    // Optimistically update UI first
    setGoals((s) =>
      s.map((x) =>
        x.id === id
          ? {
              ...x,
              completed: !current.completed,
              completedAt: !current.completed ? new Date().toISOString() : undefined,
            }
          : x
      )
    );

    try {
      // Format date properly for database
      const completedAt = !current.completed ? new Date().toISOString().split('T')[0] : null;
      
      const payload = { 
        completed: !current.completed, 
        completed_at: completedAt 
      };
      
      const res = await authFetch(buildUrl(`/api/goals/${id}`), { 
        method: 'PUT', 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
      
      const data = await (async () => {
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      })();
      
      // Sync with server response if available
      if (data.goal) {
        const g = data.goal;
        setGoals((s) =>
          s.map((x) =>
            x.id === id
              ? {
                  ...x,
                  id: String(g.id),
                  title: g.title || x.title,
                  note: g.note || x.note,
                  completed: Boolean(g.completed),
                  completedAt: g.completed_at || undefined,
                  priority: g.priority || x.priority || 'medium',
                  tags: Array.isArray(g.tags) ? g.tags : g.tags ? JSON.parse(g.tags) : x.tags || [],
                }
              : x
          )
        );
      }
      
      showToast(!current.completed ? 'Goal marked as completed' : 'Goal reopened');
      
    } catch (err: any) {
      console.error('Toggle complete error:', err);
      
      // Revert optimistic update on error
      setGoals((s) =>
        s.map((x) =>
          x.id === id
            ? {
                ...x,
                completed: current.completed,
                completedAt: current.completedAt,
              }
            : x
        )
      );
      
      showToast('Error: ' + (err.message || 'Update failed'));
    }
  };

  const visible = useMemo(() => {
    let filtered = goals;
    
    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(g => !g.completed);
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(g => g.completed);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(g => g.priority === priorityFilter);
    }
    
    // Text search
    const q = filter.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.note || '').toLowerCase().includes(q) ||
          (g.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    
    return filtered;
  }, [goals, filter, statusFilter, priorityFilter]);

  const progress = useMemo(() => {
    if (!goals.length) return 0;
    const done = goals.filter((g) => g.completed).length;
    return Math.round((done / goals.length) * 100);
  }, [goals]);

  const completedCount = goals.filter((g) => g.completed).length;
  const activeCount = goals.length - completedCount;
  const randomMotivation = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Professional Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Goal Management</h1>
              </div>
              <p className="text-gray-600 text-lg">{randomMotivation}</p>
            </div>
            <button 
              onClick={openCreate} 
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" /> New Goal
            </button>
          </div>
          
          {/* Professional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Goals</p>
                  <p className="text-3xl font-bold text-gray-900">{goals.length}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Target className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-blue-600">{activeCount}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-indigo-600">{progress}%</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
              <span className="text-sm font-medium text-gray-600">{progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }} 
              />
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
                  placeholder="Search goals..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          <main>
            {loading ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Loading goals...</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {goals.length === 0 ? 'No goals created yet' : 'No goals match your filters'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {goals.length === 0 
                    ? 'Create your first goal to get started with tracking your objectives.'
                    : 'Try adjusting your search criteria or filters to find your goals.'
                  }
                </p>
                {goals.length === 0 && (
                  <button 
                    onClick={openCreate}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create First Goal
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visible.map((g) => (
                  <article 
                    key={g.id} 
                    className={`bg-white p-6 rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                      g.completed ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleComplete(g.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          g.completed 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        {g.completed && <Check className="w-4 h-4" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <h3 className={`text-lg font-semibold ${g.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {g.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getPriorityIcon(g.priority || 'medium')}</span>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getPriorityColor(g.priority || 'medium')}`}>
                                {g.priority || 'medium'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <button 
                              onClick={() => openEdit(g)} 
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit goal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => askAndDelete(g.id, g.title)} 
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete goal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {g.note && (
                          <p className={`text-gray-600 mb-4 ${g.completed ? 'line-through' : ''}`}>
                            {g.note}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created {formatDate(g.createdAt)}</span>
                          </div>
                          {g.dueAt && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span className={new Date(g.dueAt) < new Date() && !g.completed ? 'text-red-600 font-medium' : ''}>
                                Due {formatDate(g.dueAt)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {g.tags && g.tags.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-gray-400" />
                            <div className="flex flex-wrap gap-2">
                              {g.tags.map((t) => (
                                <span key={t} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}

                {/* Pagination controls could go here if needed */}
              </div>
            )}
          </main>

          <aside ref={formRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editing ? 'Edit Goal' : 'Create Goal'}
              </h2>
              {formOpen && (
                <button 
                  onClick={() => { setFormOpen(false); setEditing(null); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {formOpen ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input 
                    value={form.title} 
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Enter goal title" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={form.note} 
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} 
                    rows={3} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="Add details about this goal..." 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input 
                    type="date" 
                    value={form.dueAt} 
                    onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select 
                    value={form.priority} 
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input 
                    value={form.tags} 
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="personal, work, health" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setEditing(null); resetForm(); setFormOpen(false); }} 
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveGoal} 
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editing ? 'Update Goal' : 'Create Goal'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 rounded-lg inline-block mb-4">
                  <Target className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-6">Ready to create a new goal?</p>
                <button 
                  onClick={openCreate} 
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </button>
              </div>
            )}
          </aside>
        </div>

        {/* Toast Messages / Pending delete confirmation */}
        <div aria-live="polite" className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {pendingDelete && (
            <div className="min-w-[340px] px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm flex items-start justify-between gap-3">
              <div className="flex-1 pr-3">
                <div className="font-medium text-gray-800">Confirm deletion</div>
                <div className="text-gray-600 text-sm mt-1">
                  Delete "{pendingDelete.title || 'this goal'}"? This action cannot be undone.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelDelete}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {toasts.map((t) => (
            <div
              key={t.id}
              className="min-w-[320px] px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm slide-in-right"
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Goals;
import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Trash2, RefreshCw, User, Mail, FileText, Camera, Activity, Clock, Heart, Target, Save, Edit2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ProfileData = {
  name?: string;
  email?: string;
  bio?: string;
  avatarDataUrl?: string;
};

type Run = {
  id: string;
  sessionId?: string;
  sessionTitle?: string;
  startedAt: string;
  endedAt?: string;
  plannedMinutes?: number;
  actualSeconds?: number;
  completed?: boolean;
  note?: string;
};

type MoodEntry = {
  id: string;
  score: number;
  emoji?: string;
  note?: string;
  date: string;
};

const PROFILE_KEY = 'mindtrack_profile_v1';
const HISTORY_KEY = 'mindtrack_session_history_v1';
const MOODS_KEY = 'mindtrack_moods_v2';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

const formatTime = (s = 0) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const motivationalMessages = [
  "Manage your wellness profile and track your journey",
  "Your personal space for mindfulness and growth", 
  "Keep your profile updated and monitor your progress",
  "Customize your experience and view your achievements",
  "Your wellness data, organized and accessible"
];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileData>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type?: 'success' | 'error' | 'info' }[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile(JSON.parse(p));
    } catch {}
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setRuns(JSON.parse(h));
    } catch {}
    try {
      const m = localStorage.getItem(MOODS_KEY);
      if (m) setMoods(JSON.parse(m));
    } catch {}

    // attempt to fetch authoritative profile + activity
    (async () => {
      try {
        setLoading(true);
        // profile endpoints to try
        const profileEndpoints = ['/api/auth/profile', '/api/auth/me', '/api/user'];
        for (const ep of profileEndpoints) {
          try {
            const res = await apiFetch(ep);
            const candidate = res?.profile || res?.user || res;
            if (candidate && (candidate.email || candidate.name)) {
              const merged = {
                name: candidate.name || profile.name,
                email: candidate.email || profile.email,
                bio: candidate.bio || profile.bio,
                avatarDataUrl: candidate.avatarDataUrl || profile.avatarDataUrl
              };
              setProfile(merged);
              localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
              break;
            }
          } catch {
            // try next
          }
        }

        // fetch runs & moods if backend available
        try {
          const r = await apiFetch('/api/meditation/runs');
          if (r?.runs) {
            setRuns(r.runs);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(r.runs));
          }
        } catch {}
        try {
          const m = await apiFetch('/api/mood/entries');
          if (m?.entries) {
            setMoods(m.entries);
            localStorage.setItem(MOODS_KEY, JSON.stringify(m.entries));
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success', t = 3000) => {
    const id = String(Date.now());
    setToasts((s) => [...s, { id, msg, type }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), t);
  };

  const saveProfile = async (next: ProfileData) => {
    const merged = { ...profile, ...next };
    setProfile(merged);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    // best-effort persist to backend (non-blocking)
    try {
      await apiFetch('/api/user/profile', { method: 'PUT', body: JSON.stringify(merged) });
      showToast('Profile saved successfully', 'success');
    } catch {
      showToast('Profile saved locally', 'info');
    }
    setEditMode(false);
  };

  const handleAvatarPick = (file?: File) => {
    const f = file;
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      saveProfile({ avatarDataUrl: url });
    };
    reader.readAsDataURL(f);
  };

  const triggerAvatar = () => fileRef.current?.click();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const clearAllData = () => {
    if (!confirm('Clear profile, runs and moods? This cannot be undone.')) {
      showToast('Clear cancelled', 'info');
      return;
    }
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(MOODS_KEY);
    setProfile({});
    setRuns([]);
    setMoods([]);
    showToast('All data cleared', 'success');
  };

  const refreshActivity = async () => {
    setLoading(true);
    try {
      try {
        const r = await apiFetch('/api/meditation/runs');
        if (r?.runs) {
          setRuns(r.runs);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(r.runs));
        }
      } catch {}
      try {
        const m = await apiFetch('/api/mood/entries');
        if (m?.entries) {
          setMoods(m.entries);
          localStorage.setItem(MOODS_KEY, JSON.stringify(m.entries));
        }
      } catch {}
      showToast('Activity refreshed successfully', 'success');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      profile,
      runs,
      moods,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindtrack-profile-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  };

  // display only first and second name (or local part of email)
  const nameParts = (profile.name || '').trim().split(/\s+/).filter(Boolean);
  let displayName = '';
  if (nameParts.length === 0) {
    const local = (profile.email || '').split('@')[0] || 'User';
    displayName = local.replace(/[._]/g, ' ');
  } else {
    displayName = nameParts.slice(0, 2).join(' ');
  }

  const totalMinutes = runs.reduce((s, r) => s + Math.round((r.actualSeconds || 0) / 60), 0);
  const completedRuns = runs.filter((r) => r.completed).length;
  const avgMood = moods.length ? moods.reduce((s, m) => s + (m.score || 0), 0) / moods.length : 0;
  const lastRun = runs[0];
  const lastMood = moods[0];

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
                  <User className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>
              </div>
              <p className="text-gray-600 text-lg">{randomMotivation}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" /> Export Data
              </button>
              <button
                onClick={refreshActivity}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-3xl font-bold text-gray-900">{runs.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedRuns}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Minutes</p>
                  <p className="text-3xl font-bold text-purple-600">{totalMinutes}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Mood</p>
                  <p className="text-3xl font-bold text-pink-600">{avgMood ? avgMood.toFixed(1) : '—'}</p>
                </div>
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px,1fr] gap-8">
          {/* Profile Card */}
          <aside className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div
                  className="w-32 h-32 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-4xl font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors mx-auto mb-4"
                  onClick={triggerAvatar}
                  title="Change avatar"
                >
                  {profile.avatarDataUrl ? (
                    <img src={profile.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <button
                  onClick={triggerAvatar}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{displayName}</h2>
              <p className="text-gray-600 text-sm mb-4">{profile.email || 'No email set'}</p>
              
              {profile.bio && (
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg mb-4">
                  {profile.bio}
                </div>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Session</span>
                <span className="text-sm font-medium text-gray-900">
                  {lastRun ? new Date(lastRun.startedAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Mood</span>
                <span className="text-sm font-medium text-gray-900">
                  {lastMood ? new Date(lastMood.date).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {runs.length > 0 ? new Date(runs[runs.length - 1].startedAt).toLocaleDateString() : 'Recently'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setEditMode(!editMode)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {editMode ? 'Cancel Edit' : 'Edit Profile'}
              </button>
              
              <button
                onClick={clearAllData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>

            <input 
              ref={fileRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleAvatarPick(e.target.files?.[0])} 
            />
          </aside>

          <main className="space-y-8">
            {/* Profile Editor */}
            {editMode && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Edit2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
                    <p className="text-sm text-gray-600">Update your personal information</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Full Name
                      </label>
                      <input
                        value={profile.name || ''}
                        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="w-4 h-4 inline mr-1" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profile.email || ''}
                        onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Bio
                    </label>
                    <textarea
                      value={profile.bio || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="Tell us a bit about yourself and your wellness journey..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveProfile(profile)}
                      className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                  <p className="text-sm text-gray-600">Your latest meditation sessions and mood entries</p>
                </div>
              </div>

              {runs.length === 0 && moods.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity Yet</h3>
                  <p className="text-gray-500">Start your wellness journey by logging your first session or mood entry.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {[...runs.slice(0, 10), ...moods.slice(0, 10)]
                    .sort((a, b) => {
                      const dateB = 'startedAt' in b ? b.startedAt : b.date;
                      const dateA = 'startedAt' in a ? a.startedAt : a.date;
                      return new Date(dateB).getTime() - new Date(dateA).getTime();
                    })
                    .slice(0, 15)
                    .map((item) => {
                      const isRun = 'sessionTitle' in item;
                      const date = isRun
                        ? new Date((item as Run).startedAt)
                        : new Date((item as MoodEntry).date);
                      const mood = !isRun ? (item as MoodEntry) : undefined;
                      
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className={`p-2 rounded-lg ${isRun ? 'bg-purple-100' : 'bg-pink-100'}`}>
                            {isRun ? (
                              <Clock className={`w-5 h-5 ${isRun ? 'text-purple-600' : 'text-pink-600'}`} />
                            ) : (
                              <Heart className={`w-5 h-5 ${isRun ? 'text-purple-600' : 'text-pink-600'}`} />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                                {isRun ? ((item as Run).sessionTitle || 'Meditation Session') : `${mood?.emoji || '😊'} Mood Entry`}
                              </div>
                            <div className="text-sm text-gray-600">
                              {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {isRun && (item as Run).actualSeconds && (
                              <div className="text-sm text-gray-700">Duration: {formatTime((item as Run).actualSeconds)}</div>
                            )}
                            {!isRun && mood?.note && (
                              <div className="text-sm text-gray-700 truncate">{mood.note}</div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            {isRun ? (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                (item as Run).completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {(item as Run).completed ? 'Completed' : 'Stopped'}
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-gray-900">Score: {mood?.score}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </main>
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
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
import React, { createContext, useContext, useEffect, useState } from 'react';

type User = any;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// default to your backend in dev to avoid requests going to Vite server
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [user, token]);

  function buildUrl(path: RequestInfo) {
    if (typeof path !== 'string') return path;
    if (/^https?:\/\//.test(path)) return path;
    const base = API_BASE.replace(/\/$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  }

  async function login(email: string, password: string) {
    const url = buildUrl('/api/auth/login');
    console.log('🔐 Attempting login to:', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    let payload: any = {};
    try { payload = await res.json(); } catch { payload = {}; }

    console.log('🔐 Login response:', res.status, payload);

    if (!res.ok) {
      const msg = payload?.message || `Login failed (${res.status})`;
      throw new Error(msg);
    }

    if (payload.token) setToken(payload.token);
    if (payload.user) setUser(payload.user);
    console.log('🔐 Auth state after login - token:', !!payload.token, 'user:', !!payload.user);
    return payload.user;
  }

  function logout() {
    setUser(null);
    setToken(null);
  }

  async function authFetch(input: RequestInfo, init: RequestInit = {}) {
    const urlOrReq = buildUrl(input);
    const headers = new Headers(init.headers ?? {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    console.log('🌐 authFetch:', (init.method || 'GET'), typeof urlOrReq === 'string' ? urlOrReq : 'Request', 'hasToken:', !!token);
    // only set Content-Type when there is a body (reduces preflight requests)
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(urlOrReq as RequestInfo, { ...init, headers, credentials: 'include' });
    console.log('🌐 Response:', res.status, typeof urlOrReq === 'string' ? urlOrReq : 'Request');

    // optional: auto-logout on 401
    if (res.status === 401) {
      console.warn('🚫 Got 401, clearing auth state');
      setUser(null);
      setToken(null);
    }

    return res;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
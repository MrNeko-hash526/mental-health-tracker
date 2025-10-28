import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginVideo from '../assets/login.mp4';
import { useAuth } from '../auth/AuthContext'; // <--- added

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // <--- use auth context to update provider state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerificationLink(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill out all fields.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // prefer explicit backend in dev to avoid Vite proxy issues
      const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
      const url = API_BASE ? `${API_BASE}/api/auth/register` : '/api/auth/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include'
      });

      let payload: any = {};
      let rawText = '';
      try { payload = await res.json(); } catch (jsonErr) { rawText = await res.text().catch(() => ''); }

      if (!res.ok) {
        const serverMsg = payload?.message || rawText || `Registration failed (${res.status})`;
        setError(serverMsg);
        setLoading(false);
        return;
      }

      // If register returned token and user, update auth provider by logging in (preferred)
      try {
        // call login to set AuthProvider state (it will set token/user)
        await login(email, password);
      } catch (loginErr) {
        // fallback: persist to localStorage so a full reload would pick it up
        if (payload.token) localStorage.setItem('token', payload.token);
        if (payload.user) localStorage.setItem('user', JSON.stringify(payload.user));
      }

      // If verification required, show link (existing behavior)
      if (payload.user && (payload.user.is_verified === 0 || payload.user.is_verified === '0')) {
        setVerificationLink(payload.verificationLink || null);
        setError('Registration successful — please verify your email.');
        setLoading(false);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('signup fetch error:', err);
      setError(err?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // make the whole layout exactly the viewport height and hide page-level scroll
    <div className="min-h-screen flex flex-col md:flex-row h-screen overflow-hidden">
      {/* left: form (40%) */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-6 bg-white text-black md:h-screen overflow-auto">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-4">Create an account</h1>
          <p className="text-sm text-gray-700 mb-6 font-medium leading-relaxed">
            Create a private profile to track moods, capture thoughts, and build healthier habits.
          </p>

          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
          {verificationLink && (
            <div className="mb-4 text-sm text-blue-600 break-words">
              Dev verification link: <a className="underline" href={verificationLink}>{verificationLink}</a>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-black text-white hover:bg-black/90 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">
              Sign in
            </button>
          </div>
        </div>
      </div>

      {/* right: media area (60%) */}
      <div className="w-full md:w-3/5 md:h-screen">
        <div className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden">
          <video
            src={loginVideo}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default Signup;
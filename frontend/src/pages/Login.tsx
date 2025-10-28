import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import loginVideo from '../assets/login.mp4';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const loc = useLocation();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const user = await login(email, password);
      const from = (loc.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (ex: any) {
      setErr(ex?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* left: form (40%) */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-6 bg-white text-black">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
          <p className="text-sm text-gray-600 mb-6">
            Secure, private mood tracking — sign in to continue. New here? Create an account in seconds.
          </p>

          {err && <div className="mb-4 text-sm text-red-600">{err}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" />
                Remember me
              </label>
              <button
                type="button"
                className="text-blue-600 hover:underline"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot?
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-black text-white hover:bg-black/90 disabled:opacity-60"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-blue-600 hover:underline">
              Create one
            </button>
          </div>
        </div>
      </div>

      {/* right: video area (60%) */}
      <div className="w-full md:w-3/5 h-56 md:h-auto">
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
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

export default Login;
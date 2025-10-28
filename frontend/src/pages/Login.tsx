import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginVideo from '../assets/login.mp4';
import { useAuth } from '../auth/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row h-screen overflow-hidden">
      {/* left: form (40%) */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-6 bg-white text-black md:h-screen overflow-auto">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-4">Sign in to your account</h1>
          <p className="text-sm text-gray-700 mb-6">
            Welcome back — enter your details to continue tracking your wellness.
          </p>

          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
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

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-black text-white hover:bg-black/90 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            New here?{' '}
            <button onClick={() => navigate('/signup')} className="text-blue-600 hover:underline">
              Create an account
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

export default Login;
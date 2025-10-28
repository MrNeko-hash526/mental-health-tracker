import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Brain,
  Home,
  Smile,
  FileText,
  Feather,
  Target,
  BarChart2,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Sidebar: React.FC = () => {
  const year = new Date().getFullYear();

  const location = useLocation();
  const navigate = useNavigate();

  // helper to mark active route (exact or prefix)
  const isActive = (path: string) => {
    const cur = location.pathname || '/';
    if (path === '/dashboard' && (cur === '/' || cur === '/dashboard')) return true;
    return cur === path || cur.startsWith(path + '/');
  };

  const { logout } = useAuth();

  const handleLogout = () => {
    // close mobile sidebar first
    if (window.innerWidth < 768) setOpen(0);
    // call context logout which clears state and navigates to /login
    logout();
  };

  // 0 = closed, 1 = open
  const [open, setOpen] = useState<number>(() => {
    try {
      const v = localStorage.getItem('sidebar_open');
      return v !== null ? Number(v) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const onState = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      setOpen(Number(detail));
    };
    window.addEventListener('sidebarState', onState);
    return () => window.removeEventListener('sidebarState', onState);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sidebar_open', String(open)); } catch {}
  }, [open]);

  // helper class names — tweak widths/transforms to match your CSS/tailwind
  const containerClass =
    open === 1
      ? 'translate-x-0 w-56 md:w-56'
      : '-translate-x-full md:translate-x-0 md:w-20';

  return (
    <>
      {/* mobile overlay when sidebar is open */}
      {open === 1 && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(0)}
          aria-hidden
        />
      )}

      <aside
        data-sidebar
        // mobile: off-canvas when closed, slide-in when open
        // md+: always visible; width toggles between collapsed (icons-only) and expanded
        className={`${containerClass} fixed top-16 left-0 h-[calc(100vh-4rem)] transition-transform duration-200 ease-in-out bg-white`}
        aria-hidden={open === 0 && window.innerWidth < 768}
      >
        {/* mobile header (close button) */}
        <div className="flex items-center justify-between md:hidden mb-2 px-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold no-underline text-black">
            <Brain className="w-6 h-6" />
            <span>MindTrack</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(0)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* desktop brand (hidden when collapsed) */}
        <div className="hidden md:flex items-center gap-3 text-2xl font-bold no-underline px-3 py-2 text-black">
          <Brain className="w-6 h-6" aria-hidden="true" />
          {open === 1 && <span>MindTrack</span>}
        </div>

        {/* nav */}
        <nav aria-label="Main" className="flex-1">
          <ul className="flex flex-col gap-2 mt-2">
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/dashboard') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <Home className="w-5 h-5" />
                {open === 1 && <span>Dashboard</span>}
              </Link>
            </li>

            <li>
              <Link
                to="/mood-tracker"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/mood-tracker') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <Smile className="w-5 h-5" />
                {open === 1 && <span>Mood Tracker</span>}
              </Link>
            </li>

            <li>
              <Link
                to="/journal"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/journal') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <FileText className="w-5 h-5" />
                {open === 1 && <span>Journal</span>}
              </Link>
            </li>

            <li>
              <Link
                to="/meditation"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/meditation') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <Feather className="w-5 h-5" />
                {open === 1 && <span>Meditation</span>}
              </Link>
            </li>

            <li>
              <Link
                to="/goals"
                title="Goals"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/goals') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <Target className="w-5 h-5" />
                {open === 1 && <span>Goals</span>}
              </Link>
            </li>

            <li>
              <Link
                to="/profile"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive('/profile') ? 'bg-black text-white' : ''}`}
                onClick={() => (window.innerWidth < 768 ? setOpen(0) : undefined)}
              >
                <User className="w-5 h-5" />
                {open === 1 && <span>Profile</span>}
              </Link>
            </li>
          </ul>
        </nav>

        {/* logout */}
        <div className="mt-4 px-3">
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) setOpen(0);
              handleLogout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            <LogOut className="w-5 h-5" />
            {open === 1 && <span>Logout</span>}
          </button>
        </div>

        {/* footer */}
        <div className="text-sm text-black/80 mt-auto px-3 py-3">
          {open === 1 ? (
            <>
              <div className="mb-2">© {year} MindTrack</div>
            </>
          ) : (
            <div className="text-center text-xs">© {year}</div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
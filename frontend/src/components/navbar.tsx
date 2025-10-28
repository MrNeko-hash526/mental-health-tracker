import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, Brain } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const PAGES: { label: string; path: string }[] = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Mood Tracker', path: 'mood-tracker' },
  { label: 'Journal', path: 'journal' },
  { label: 'Meditation', path: 'meditation' },
  { label: 'Resources', path: 'resources' },
  { label: 'Progress', path: 'progress' },
  { label: 'Profile', path: 'profile' },
];

const Navbar: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [openSuggestions, setOpenSuggestions] = useState<boolean>(false);
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLFormElement | null>(null);

  // use auth context for sign-in / logout
  const { user, logout } = useAuth();

  useEffect(() => {
    const onSidebarState = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setSidebarOpen(Boolean(detail));
    };
    window.addEventListener('sidebarState', onSidebarState);
    return () => window.removeEventListener('sidebarState', onSidebarState);
  }, []);

  // auth user is provided by AuthContext; no localStorage sync necessary

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(ev.target as Node)) setOpenSuggestions(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  // if user presses enter, try to resolve the query to a page first,
  // otherwise fall back to the search results page
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    const qNorm = q.toLowerCase().replace(/^\//, '');

    // priority: exact label/path match -> startsWith -> includes
    const findMatch = (check: (p: { label: string; path: string }) => boolean) =>
      PAGES.find((p) => check(p));

    let page =
      findMatch((p) => p.label.toLowerCase() === qNorm || p.path.toLowerCase() === qNorm) ||
      findMatch(
        (p) => p.label.toLowerCase().startsWith(qNorm) || p.path.toLowerCase().startsWith(qNorm)
      ) ||
      findMatch((p) => p.label.toLowerCase().includes(qNorm) || p.path.toLowerCase().includes(qNorm));

    if (page) {
      setQuery('');
      setOpenSuggestions(false);
      navigate(`/${page.path}`);
      return;
    }

    // fallback to generic search page
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // close sidebar when clicking anywhere outside navbar or sidebar
  useEffect(() => {
    const onGlobalClick = (ev: MouseEvent) => {
      try {
        const isOpen = localStorage.getItem('sidebar_open') === '1';
        if (!isOpen) return;
        const target = ev.target as Element | null;
        if (!target) return;
        // don't close when clicking inside navbar or the sidebar element
        if (target.closest('nav') || target.closest('[data-sidebar]')) return;
        localStorage.setItem('sidebar_open', '0');
        window.dispatchEvent(new CustomEvent('sidebarState', { detail: 0 }));
      } catch {
        // ignore
      }
    };
    // capture phase makes sure clicks are caught before stopPropagation from children
    document.addEventListener('click', onGlobalClick, true);
    return () => document.removeEventListener('click', onGlobalClick, true);
  }, []);

  const handleLogout = () => {
    // close the sidebar on small screens
    try {
      const cur = localStorage.getItem('sidebar_open') === '1' ? 1 : 0;
      if (cur === 1 && window.innerWidth < 768) localStorage.setItem('sidebar_open', '0');
    } catch {}
    // call context logout (navigates to /login)
    logout();
  };

  const filtered = query.trim()
    ? PAGES.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.path.toLowerCase().includes(query.toLowerCase().replace(/^\//, ''))
      )
    : [];

  return (
    <nav className="sticky top-0 z-50 bg-white shadow overflow-visible">
      <div className="max-w-7xl mx-auto flex items-center gap-6 md:gap-8 px-4 md:px-8 h-16 py-2 text-black">
        <button
          type="button"
          onClick={(e) => {
            // stop the click from reaching the global handler which would immediately close it
            e.stopPropagation();
            // toggle persisted state and notify listeners
            const cur = localStorage.getItem('sidebar_open') === '1' ? 1 : 0;
            const next = cur === 1 ? 0 : 1;
            try { localStorage.setItem('sidebar_open', String(next)); } catch {}
            window.dispatchEvent(new CustomEvent('sidebarState', { detail: next }));
          }}
          aria-label="Toggle sidebar"
          className="p-3 rounded-md text-black hover:bg-gray-100 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-3 md:gap-4 no-underline shrink-0 text-black">
          <Brain className="w-6 h-6" />
          <span className={sidebarOpen ? 'hidden' : 'hidden sm:inline text-lg md:text-xl font-semibold'}>
            MindTrack
          </span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1 max-w-2xl mx-4 md:mx-6" ref={wrapRef}>
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-black/60">
              <Search className="w-4 h-4" />
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenSuggestions(true);
              }}
              onFocus={() => setOpenSuggestions(true)}
              placeholder="Search pages (type a page name and press Enter)"
              className="w-full rounded-lg bg-gray-100 placeholder-gray-500 text-black py-2.5 pl-12 pr-5 focus:outline-none focus:ring-2 focus:ring-black/10"
              aria-label="Search"
            />

            {openSuggestions && filtered.length > 0 && (
              <ul className="absolute mt-2 left-0 right-0 bg-white border rounded-md shadow-lg max-h-60 overflow-auto z-50">
                {filtered.map((p) => (
                  <li
                    key={p.path}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setQuery('');
                      setOpenSuggestions(false);
                      navigate(`/${p.path}`);
                    }}
                  >
                    <div className="font-medium text-black">{p.label}</div>
                  </li>
                ))}
              </ul>
            )}

            {openSuggestions && query.trim() && filtered.length === 0 && (
              <div className="absolute mt-2 left-0 right-0 bg-white border rounded-md shadow-lg px-4 py-3 text-sm text-gray-500 z-50">
                No results
              </div>
            )}
          </div>
        </form>

        <div className="ml-4 md:ml-6 flex items-center gap-3 md:gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700">{user.name || user.email}</div>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:underline px-2 py-1 rounded"
                type="button"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
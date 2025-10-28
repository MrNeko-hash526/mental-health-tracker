import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import Sidebar from '../sidebar/Sidebar';
import { useEffect } from 'react';

const Layout: React.FC = () => {
  useEffect(() => {
    // ensure sidebar persisted default is closed
    try {
      if (localStorage.getItem('sidebar_open') === null) localStorage.setItem('sidebar_open', '0');
    } catch {}
    window.dispatchEvent(new CustomEvent('sidebarState', { detail: Number(localStorage.getItem('sidebar_open') || 0) }));
  }, []);

  return (
    <div className="overflow-x-hidden min-h-screen flex flex-col">
      {/* Skip link for keyboard users */}
      <a href="#main" className="sr-only focus:not-sr-only p-2">
        Skip to content
      </a>

      {/* Navbar (full width, sticky) */}
      <header className="w-full">
        <Navbar />
      </header>

      {/* Main area: sidebar + page content */}
      <div id="main" className="flex-1 w-full">
        {/* remove top padding and horizontal page padding so sidebar sits flush under navbar */}
        <div className="max-w-7xl mx-auto px-0 py-0 md:px-0">
          {/* remove gap between sidebar and page */}
          <div className="flex">
            {/* Sidebar: attached under navbar on md+ and slide-over on mobile */}
            <Sidebar />

            {/* Page content */}
            <main className="flex-1 min-h-[calc(100vh-4rem)] md:ml-20">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {/*<Footer />*/}
    </div>
  );
};

export default Layout;
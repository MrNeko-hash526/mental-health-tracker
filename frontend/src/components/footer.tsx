import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Heart, Github, Twitter, Mail, BookOpen } from 'lucide-react';

const Footer: React.FC = () => {
  const year: number = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-purple-600 to-purple-700 text-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 py-4 md:py-6 flex flex-col md:flex-row justify-between items-center gap-4 min-w-0">
        {/* Brand */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 text-white no-underline shrink-0">
            <Brain className="w-2 h-2" aria-hidden="true" />
            <span className="text-sm font-semibold">MindTrack</span>
          </Link>
          <p className="text-xs text-white/90 md:ml-2">Built with care for your mental wellbeing</p>
        </div>

        {/* Useful links */}
        <nav className="flex flex-wrap justify-center gap-3" aria-label="Footer navigation">
          <Link to="/dashboard" className="text-xs hover:underline">Dashboard</Link>
          <Link to="/mood-tracker" className="text-xs hover:underline">Mood Tracker</Link>
          <Link to="/journal" className="text-xs hover:underline">Journal</Link>
          <Link to="/resources" className="text-xs hover:underline">Resources</Link>
          <Link to="/privacy" className="text-xs hover:underline">Privacy</Link>
        </nav>

        {/* Social / Contact */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/your-repo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="p-1 rounded hover:bg-white/10"
          >
            <Github className="w-4 h-4" />
          </a>
          <a
            href="https://twitter.com/your-handle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            className="p-1 rounded hover:bg-white/10"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="mailto:hello@mindtrack.example"
            aria-label="Email"
            className="p-1 rounded hover:bg-white/10"
          >
            <Mail className="w-4 h-4" />
          </a>
          <Link to="/docs" className="p-1 rounded hover:bg-white/10" aria-label="Documentation">
            <BookOpen className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-2 text-center text-xs text-white/80 flex flex-col md:flex-row items-center justify-between gap-2 min-w-0">
          <span>© {year} MindTrack. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Made with
            <Heart className="w-3 h-3 text-pink-300" aria-hidden="true" />
            for wellbeing
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
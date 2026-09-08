import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AmbientBackground from './AmbientBackground';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import { Menu } from 'lucide-react';

export default function AppShell() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    function load() {
      api
        .getMe(token)
        .then((data) => {
          if (!cancelled && data?.stats) setStats(data.stats);
        })
        .catch(() => {});
    }

    load();
    window.addEventListener('studydeck:stats-changed', load);
    return () => {
      cancelled = true;
      window.removeEventListener('studydeck:stats-changed', load);
    };
  }, [token]);

  return (
    <div className="relative h-screen flex bg-ink text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-200 overflow-hidden font-[var(--font-display)]">
      <AmbientBackground />

      <Sidebar
        stats={stats}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="relative flex-1 flex flex-col h-screen overflow-hidden md:pl-16">
        {/* Mobile top bar with hamburger menu */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-paper border-b border-slate-200 dark:border-[#20232a] z-20 shrink-0 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-white/5 cursor-pointer transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">StudyDeck</span>
          <div className="w-8" />
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

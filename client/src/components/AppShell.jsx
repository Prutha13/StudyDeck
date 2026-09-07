import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import AmbientBackground from './AmbientBackground';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function AppShell() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);

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
    <div className="relative min-h-screen flex bg-ink text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-200 overflow-hidden font-[var(--font-display)]">
      <AmbientBackground />
      <Sidebar stats={stats} />
      <main className="relative z-10 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

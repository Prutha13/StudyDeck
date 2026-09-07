import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  LogOut,
  BookOpen,
  LayoutDashboard,
  Sparkles,
  SunMedium,
  Moon,
  Flame,
  CheckCircle2,
  Files,
  Network,
  Brain,
  AlertTriangle,
  CreditCard,
  Crown,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { path: '/dashboard', label: 'Your documents', icon: LayoutDashboard },
  { path: '/knowledge-map', label: 'Knowledge Map', icon: Network },
  { path: '/daily-review', label: 'Daily Review', icon: Brain },
  { path: '/mistake-book', label: 'Mistake Book', icon: AlertTriangle },
  { path: '/fix-weakness', label: 'Fix Weakness', icon: Flame },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings/billing', label: 'Subscription', icon: CreditCard }
];

/**
 * Sidebar
 * Solid-panel primary navigation (flat dark surface + amber accents,
 * matching the studydeck-ai-workspace design reference). Fixed width,
 * full height.
 *
 * `stats` — optional { documents, completedSessions, streak } to populate
 * the quick-stats mini card. Falls back to placeholders when omitted.
 */
export default function Sidebar({ stats }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const quickStats = {
    documents: stats?.documents ?? '—',
    completedSessions: stats?.completedSessions ?? '—',
    streak: stats?.streak ?? '—'
  };

  const initials = (user?.email || 'U')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className="relative z-10 w-64 shrink-0 flex flex-col justify-between h-screen sticky top-0
        bg-paper border-r border-slate-200 dark:border-[#20232a] shadow-xl py-7 px-5 transition-colors duration-200"
    >
      <div>
        {/* Brand header */}
        <div className="flex items-center justify-between mb-9 px-1">
          <div
            onClick={() => navigate('/dashboard')}
            className="group cursor-pointer flex items-center gap-3"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow duration-300">
              <div className="w-full h-full bg-ink rounded-[11px] flex items-center justify-center">
                <BookOpen size={19} className="text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-paper border border-slate-200 dark:border-white/10 flex items-center justify-center">
                <Sparkles size={9} className="text-amber-500 dark:text-amber-400 animate-pulse" />
              </span>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block">StudyDeck</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 block -mt-0.5">
                AI Workspace
              </span>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Moon size={15} /> : <SunMedium size={15} />}
          </button>
        </div>

        {/* Navigation with sliding active indicator */}
        <nav className="flex flex-col gap-1.5 mb-7">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 text-sm py-2.5 px-3.5 rounded-lg font-medium cursor-pointer transition-colors duration-200 ${
                  isActive
                    ? 'text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-lg bg-amber-500/15 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  </motion.div>
                )}
                <Icon size={17} className="relative z-10" />
                <span className="relative z-10">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Quick stats */}
        <div className="rounded-xl bg-slate-100/90 dark:bg-[#131418] border border-slate-200/80 dark:border-[#23262e] shadow-inner px-4 py-3.5">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-medium mb-2.5">Quick stats</div>
          <StatRow icon={Files} label="Documents" value={quickStats.documents} />
          <StatRow icon={CheckCircle2} label="Sessions done" value={quickStats.completedSessions} />
          <StatRow icon={Flame} label="Weekly streak" value={quickStats.streak} last />
        </div>
      </div>

      {/* Footer: CTA + profile */}
      <div className="flex flex-col gap-4">
        <button
          onClick={() => navigate('/dashboard?new=1')}
          className="relative overflow-hidden flex items-center justify-center gap-2 text-sm py-2.5 px-4 rounded-lg cursor-pointer font-semibold tracking-tight text-slate-950 active:scale-[0.98] transition-transform
            bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-[length:200%_100%] hover:bg-[position:100%_0]
            shadow-lg shadow-amber-500/25 border border-white/30"
          style={{ transition: 'background-position 0.6s ease, transform 0.15s ease' }}
        >
          <Plus size={17} strokeWidth={2.5} /> New Document
        </button>

        <div className="border-t border-slate-200 dark:border-white/10 pt-4">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-100/90 dark:bg-[#131418] border border-slate-200/80 dark:border-[#23262e] hover:border-amber-500/40 px-3 py-2.5 mb-3 cursor-pointer transition-colors"
            title="View Profile"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#1e2026] border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <span className="text-xs text-slate-800 dark:text-slate-300 font-medium truncate">{user?.fullName || user?.email}</span>
            </div>
            {user?.subscription?.isPremium || user?.subscription?.plan === 'premium' ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[9px] font-extrabold uppercase shrink-0">
                PRO ✨
              </span>
            ) : (
              <NavLink
                to="/pricing"
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-extrabold uppercase shrink-0 hover:scale-105 transition-transform"
              >
                UPGRADE
              </NavLink>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer px-1"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function StatRow({ icon: Icon, label, value, last }) {
  return (
    <div className={`flex items-center justify-between text-xs ${last ? '' : 'mb-2'}`}>
      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <Icon size={12} className="text-amber-500 dark:text-amber-400/80" />
        {label}
      </span>
      <span className="font-semibold text-slate-900 dark:text-slate-200">{value}</span>
    </div>
  );
}
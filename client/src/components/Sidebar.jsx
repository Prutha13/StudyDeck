import { useState } from 'react';
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
  User,
  X
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

export default function Sidebar({ stats, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isHovered || mobileOpen;

  const quickStats = {
    documents: stats?.documents ?? '—',
    completedSessions: stats?.completedSessions ?? '—',
    streak: stats?.streak ?? '—'
  };

  const initials = (user?.email || 'U')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const handleNavClick = (path) => {
    navigate(path);
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Semi-transparent Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Fixed Sidebar Container */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed top-0 left-0 z-50 h-screen bg-paper border-r border-slate-200 dark:border-[#20232a]
          flex flex-col justify-between py-6 transition-all duration-300 ease-in-out select-none shrink-0 overflow-hidden
          ${mobileOpen ? 'translate-x-0 w-64 px-4 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${isHovered ? 'md:w-64 shadow-2xl' : 'md:w-16 shadow-xl'}
        `}
      >
        <div className="w-full">
          {/* Brand header */}
          <div className={`flex items-center mb-8 min-h-[40px] w-full ${isExpanded ? 'justify-between px-4' : 'justify-center px-0'}`}>
            <div
              onClick={() => handleNavClick('/dashboard')}
              className={`group cursor-pointer flex items-center ${isExpanded ? 'gap-3 overflow-hidden' : 'justify-center w-full'}`}
              title="StudyDeck"
            >
              <div className="relative w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow duration-300">
                <div className="w-full h-full bg-ink rounded-[11px] flex items-center justify-center">
                  <BookOpen size={19} className="text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-paper border border-slate-200 dark:border-white/10 flex items-center justify-center">
                  <Sparkles size={9} className="text-amber-500 dark:text-amber-400 animate-pulse" />
                </span>
              </div>
              <div className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 w-auto translate-x-0 ml-3' : 'opacity-0 w-0 -translate-x-2 pointer-events-none hidden md:block'}`}>
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-none">StudyDeck</span>
                <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 block mt-0.5">
                  AI Workspace
                </span>
              </div>
            </div>

            {/* Theme toggle & Mobile close button */}
            {isExpanded && (
              <div className="flex items-center shrink-0 ml-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  title="Toggle theme"
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? <Moon size={15} /> : <SunMedium size={15} />}
                </button>

                {mobileOpen && (
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/5 cursor-pointer ml-1"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className={`flex flex-col gap-1.5 mb-6 w-full ${isExpanded ? 'px-3' : 'px-2'}`}>
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavClick(item.path)}
                  title={item.label}
                  className={`relative flex items-center text-sm py-2.5 rounded-lg font-medium cursor-pointer transition-colors duration-200 w-full ${
                    isExpanded ? 'px-3.5 gap-3 justify-start' : 'px-0 justify-center'
                  } ${
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
                  <Icon size={18} className="relative z-10 shrink-0" />
                  <span
                    className={`relative z-10 transition-all duration-200 whitespace-nowrap overflow-hidden ${
                      isExpanded
                        ? 'opacity-100 w-auto translate-x-0'
                        : 'opacity-0 w-0 -translate-x-2 pointer-events-none hidden md:inline'
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick stats */}
          {isExpanded ? (
            <div className="mx-3 rounded-xl bg-slate-100/90 dark:bg-[#131418] border border-slate-200/80 dark:border-[#23262e] shadow-inner px-4 py-3.5 transition-all duration-200">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-medium mb-2.5">Quick stats</div>
              <StatRow icon={Files} label="Documents" value={quickStats.documents} />
              <StatRow icon={CheckCircle2} label="Sessions done" value={quickStats.completedSessions} />
              <StatRow icon={Flame} label="Weekly streak" value={quickStats.streak} last />
            </div>
          ) : (
            <div className="hidden md:flex flex-col gap-2 items-center justify-center py-2 px-1 mx-2 rounded-xl bg-slate-100/50 dark:bg-[#131418]/60 border border-slate-200/50 dark:border-[#23262e]/50">
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold" title={`Documents: ${quickStats.documents}`}>
                <Files size={13} className="text-amber-500 mb-0.5 shrink-0" />
                <span>{quickStats.documents}</span>
              </div>
              <div className="flex flex-col items-center justify-center text-[10px] text-slate-500 dark:text-slate-400 font-semibold" title={`Streak: ${quickStats.streak}`}>
                <Flame size={13} className="text-amber-500 mb-0.5 shrink-0" />
                <span>{quickStats.streak}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: CTA + profile */}
        <div className={`flex flex-col gap-3 w-full ${isExpanded ? 'px-3' : 'px-2'}`}>
          <button
            type="button"
            onClick={() => handleNavClick('/dashboard?new=1')}
            title="New Document"
            className={`relative overflow-hidden flex items-center justify-center rounded-lg cursor-pointer font-semibold tracking-tight text-slate-950 active:scale-[0.98] transition-all duration-200
              bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 bg-[length:200%_100%] hover:bg-[position:100%_0]
              shadow-lg shadow-amber-500/25 border border-white/30 ${
                isExpanded ? 'py-2.5 px-4 gap-2 w-full' : 'py-2.5 px-0 w-10 h-10 mx-auto'
              }`}
          >
            <Plus size={18} strokeWidth={2.5} className="shrink-0" />
            <span
              className={`transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 pointer-events-none hidden md:inline'
              }`}
            >
              New Document
            </span>
          </button>

          <div className="border-t border-slate-200 dark:border-white/10 pt-3 w-full">
            {isExpanded ? (
              <>
                <div
                  onClick={() => handleNavClick('/profile')}
                  className="flex items-center justify-between gap-2.5 rounded-xl bg-slate-100/90 dark:bg-[#131418] border border-slate-200/80 dark:border-[#23262e] hover:border-amber-500/40 px-3 py-2.5 mb-2.5 cursor-pointer transition-colors"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mobileOpen) setMobileOpen(false);
                      }}
                      className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-extrabold uppercase shrink-0 hover:scale-105 transition-transform"
                    >
                      UPGRADE
                    </NavLink>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer px-1 w-full"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <div className="hidden md:flex flex-col gap-2.5 items-center justify-center w-full">
                <div
                  onClick={() => handleNavClick('/profile')}
                  className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#1e2026] border border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center cursor-pointer hover:border-amber-500 shrink-0 mx-auto"
                  title={user?.email || 'Profile'}
                >
                  {initials}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Sign out"
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center mx-auto"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
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
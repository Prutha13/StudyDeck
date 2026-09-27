import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home, ArrowLeft, SearchX } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('404 Page Not Found');

  return (
    <div className="relative min-h-screen bg-ink flex items-center justify-center px-6 overflow-hidden font-[var(--font-display)] selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full bg-[#f59e0b]/15 blur-[130px] animate-orb-amber" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-[#6366f1]/15 blur-[140px] animate-orb-indigo" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent p-[1px] border border-amber-500/30 shadow-2xl shadow-amber-500/20 mb-6">
          <div className="w-full h-full bg-[#080b11] rounded-[23px] flex items-center justify-center">
            <SearchX size={36} className="text-amber-400" />
          </div>
        </div>

        <h1 className="font-serif font-bold text-6xl text-white mb-2 tracking-tight">404</h1>
        <h2 className="font-bold text-xl text-white mb-3 tracking-tight">Page Not Found</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
          The page you are looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/20"
          >
            <Home size={16} /> Go to Dashboard
          </Link>
          <Link
            to="/"
            className="btn-glass w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-semibold py-3 px-6 rounded-xl"
          >
            <ArrowLeft size={16} /> Return Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

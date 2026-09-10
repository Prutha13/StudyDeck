import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      if (err.status === 403) {
        setNeedsVerification(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-ink flex items-center justify-center px-6 overflow-hidden font-[var(--font-display)] selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-200">
      {/* Ambient Background Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-20 w-[550px] h-[550px] rounded-full bg-[#f59e0b]/20 blur-[130px] animate-orb-amber" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-[#6366f1]/20 blur-[140px] animate-orb-indigo" />
        <div className="absolute -bottom-32 left-1/3 w-[500px] h-[500px] rounded-full bg-[#06b6d4]/18 blur-[120px] animate-orb-cyan" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/25 mb-4">
            <div className="w-full h-full bg-[#080b11] rounded-[15px] flex items-center justify-center">
              <BookOpen size={24} className="text-amber-400" />
            </div>
          </div>
          <h1 className="font-bold text-3xl text-white tracking-tight flex items-center justify-center gap-2">
            StudyDeck <Sparkles size={16} className="text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1.5">Transform lecture notes into instant summaries & study decks.</p>
        </div>

        {/* Glass Card Container */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <h2 className="font-bold text-xl text-white mb-6 tracking-tight">Sign In</h2>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 mb-5">
              <p>{error}</p>
              {needsVerification && (
                <Link
                  to={`/verify-otp?email=${encodeURIComponent(email)}`}
                  className="inline-block mt-2 text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2"
                >
                  Verify your email now &rarr;
                </Link>
              )}
            </div>
          )}

          <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm mb-5 focus:outline-none"
            placeholder="you@example.com"
          />

          <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm mb-7 focus:outline-none"
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full text-sm font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-xs text-slate-400 mt-6 text-center font-medium">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2">
              Create one
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
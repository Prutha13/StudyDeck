import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Mail, KeyRound, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Sync initialEmail if query param changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const data = await api.verifyOtp(email, cleanOtp);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError('');
    setSuccessMsg('');
    setResending(true);

    try {
      await api.sendOtp(email);
      setSuccessMsg('A fresh 6-digit verification code has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      if (err.retryAfter) {
        setCooldown(err.retryAfter);
      }
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#080b11] flex items-center justify-center px-6 overflow-hidden font-[var(--font-display)] selection:bg-amber-500/30 selection:text-amber-200">
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
          <p className="text-slate-400 text-xs mt-1.5">Verify your email address to continue.</p>
        </div>

        {/* Glass Card Container */}
        <form onSubmit={handleVerify} className="glass-panel rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="flex items-center gap-2.5 mb-2">
            <KeyRound size={20} className="text-amber-400" />
            <h2 className="font-bold text-xl text-white tracking-tight">Enter Verification Code</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            We sent a 6-digit code to <span className="text-amber-300 font-medium">{email || 'your email'}</span>. The code expires in 10 minutes.
          </p>

          {error && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!initialEmail && (
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-300 mb-2">6-Digit Code</label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="glass-input w-full rounded-xl py-3 text-center text-2xl font-mono tracking-[0.5em] font-semibold text-amber-300 placeholder:tracking-normal placeholder:text-slate-600 focus:outline-none"
              placeholder="••••••"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-gold w-full text-sm font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying…' : 'Verify & Continue'}
            <ArrowRight size={16} />
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 mt-6 pt-5 border-t border-white/5">
            <span>Didn&apos;t receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center font-medium">
            <Link to="/login" className="text-slate-400 hover:text-slate-200 underline underline-offset-2">
              Back to Sign in
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function VerifyOtp() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (otp.trim().length !== 6) {
      setError('Enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.verifyOtp(email, otp.trim());
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
      setSuccessMsg('New code sent to your email.');
      setCooldown(60);
    } catch (err) {
      if (err.retryAfter) setCooldown(err.retryAfter);
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-paper rounded-2xl p-8 border-l-4 border-highlight shadow-xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <KeyRound size={20} className="text-highlight" />
          <h1 className="font-[Fraunces] font-semibold text-2xl">Verify your email</h1>
        </div>
        <p className="text-sm text-neutral-500 mb-6">
          We sent a 6-digit code to{' '}
          <span className="text-highlight font-medium">{email || 'your email'}</span>.
          It expires in 10 minutes.
        </p>

        {error && (
          <div className="text-sm border-l-4 border-rust bg-rust/10 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 text-sm border-l-4 border-teal bg-teal/10 rounded-lg px-4 py-3 mb-4">
            <CheckCircle2 size={15} /> {successMsg}
          </div>
        )}

        {!initialEmail && (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                defaultValue={email}
                className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-highlight"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <input
            type="text"
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
            className="w-full rounded-lg border py-3 text-center text-2xl font-mono tracking-[0.5em] mb-6 focus:outline-none focus:ring-2 focus:ring-highlight"
            placeholder="••••••"
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-highlight text-ink font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying…' : 'Verify & continue'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-neutral-500 mt-6 pt-4 border-t">
          <span>Didn't get it?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="flex items-center gap-1.5 text-highlight font-semibold disabled:opacity-40"
          >
            <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
        <p className="text-xs text-center mt-4">
          <Link to="/login" className="underline">Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  RotateCw,
  Crown,
  LayoutDashboard,
  Flame,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function PaymentSuccess() {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  async function checkStatus() {
    if (!token) return;
    setChecking(true);
    try {
      const sub = await api.getSubscriptionStatus(token);
      if (sub.isPremium || sub.plan === 'premium' || sub.plan === 'pro') {
        if (refreshUser) await refreshUser();
        setConfirmed(true);
        setChecking(false);
        return true;
      }
    } catch (err) {
      console.warn('Checking subscription status failed:', err);
    }
    return false;
  }

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    let attempts = 0;

    async function pollVerification() {
      const isUpgraded = await checkStatus();
      if (isUpgraded || !isMounted) return;

      attempts++;
      if (attempts < 10 && isMounted) {
        setRetryCount(attempts);
        setTimeout(pollVerification, 2000);
      } else if (isMounted) {
        // Polling finished without webhook confirmation
        setChecking(false);
      }
    }

    pollVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-r from-amber-500/20 via-emerald-500/15 to-cyan-500/20 blur-[130px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel max-w-lg w-full rounded-3xl p-8 sm:p-10 border border-amber-500/30 text-center relative z-10 shadow-2xl shadow-amber-500/10"
      >
        {checking ? (
          <div className="py-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-400">
              <RotateCw size={32} className="animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Activating your subscription…</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We received your payment and are waiting for the Stripe webhook to confirm your Pro membership.
            </p>
            <div className="mt-6 text-[11px] text-amber-400/80 font-mono">
              Verifying Stripe webhook activation (attempt {retryCount + 1}/10)…
            </div>
          </div>
        ) : confirmed ? (
          <div>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 via-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-6 text-amber-400 shadow-xl shadow-amber-500/20">
              <Crown size={38} className="text-amber-400 animate-bounce" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold mb-4">
              <CheckCircle2 size={13} /> Payment Confirmed by Webhook
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
              Welcome to <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">StudyDeck Pro!</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8 max-w-md mx-auto">
              Your account has been upgraded via the verified Stripe webhook. You now have unlimited document uploads, 5-step weakness remediation, deep AI misconception diagnosis, and priority AI learning tools.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-gold py-3 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
              >
                <LayoutDashboard size={15} /> Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/fix-weakness')}
                className="btn-glass py-3 px-6 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer text-amber-300 hover:text-white"
              >
                <Flame size={15} className="text-amber-400" /> Start Weakness Repair
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-400">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Payment Processing</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Your payment was completed on Stripe. We are still awaiting the webhook confirmation to activate your Pro benefits.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => checkStatus()}
                className="btn-gold py-3 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCw size={14} /> Refresh Status
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-glass py-3 px-6 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard size={14} /> Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

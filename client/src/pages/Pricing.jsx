import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Flame,
  Network,
  Brain,
  RotateCw,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function Pricing() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [interval, setInterval] = useState('monthly'); // 'monthly' | 'yearly'
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (token) {
      api.getSubscriptionStatus(token)
        .then((data) => setSubscription(data))
        .catch((err) => console.warn('Could not load subscription state:', err));
    }
  }, [token]);

  const isPremium = subscription?.isPremium || user?.subscription?.isPremium;

  async function handleUpgrade() {
    if (!token) {
      navigate('/login?redirect=/pricing');
      return;
    }

    if (isPremium) {
      navigate('/settings/billing');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await api.createCheckoutSession(token, interval);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize Stripe checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 px-6 sm:px-10 py-16 relative overflow-hidden selection:bg-amber-500 selection:text-black">
      {/* Ambient background glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-cyan-500/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-5 shadow-lg shadow-amber-500/10"
          >
            <Crown size={14} className="text-amber-400" />
            StudyDeck Membership
          </motion.div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Master Every Subject with Your{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              AI Learning Coach
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Upgrade to StudyDeck Pro for unlimited document uploads, continuous adaptive learning, deep mistake diagnosis, and 5-step weakness repair.
          </p>

          {/* Billing Interval Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="glass-panel p-1 rounded-xl flex items-center border border-white/10 shadow-xl">
              <button
                type="button"
                onClick={() => setInterval('monthly')}
                className={`px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  interval === 'monthly'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setInterval('yearly')}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  interval === 'yearly'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Yearly Billing</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  Save 17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* Free Starter Card */}
          <div className="glass-panel rounded-3xl p-8 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Free Starter</span>
                {subscription?.plan === 'free' && !isPremium && (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-extrabold text-white">₹0</span>
                <span className="text-xs text-slate-400">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Essential AI study tools to organize notes, generate summaries, and test recall.
              </p>

              <div className="space-y-3.5 mb-8 border-t border-white/10 pt-6">
                <FeatureItem text="5 document uploads per month" />
                <FeatureItem text="AI executive summaries & key actions" />
                <FeatureItem text="Interactive 3D flashcards" />
                <FeatureItem text="Practice quizzes (up to 5 questions)" />
                <FeatureItem text="Knowledge Map visualization" />
                <FeatureItem text="Basic Mistake Book recording" />
                <FeatureItem text="Daily Spaced Review queue" />
              </div>
            </div>

            <button
              onClick={() => navigate(token ? '/dashboard' : '/register')}
              className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              {token ? 'Continue Free' : 'Get Started Free'}
            </button>
          </div>

          {/* Pro Premium Card (Featured) */}
          <div className="glass-panel rounded-3xl p-8 border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-white/[0.03] to-transparent flex flex-col justify-between relative shadow-2xl shadow-amber-500/10">
            <div className="absolute -top-3.5 right-8 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-black font-extrabold text-[10px] tracking-widest uppercase shadow-lg shadow-amber-500/30">
              Most Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" /> StudyDeck Pro
                </span>
                {isPremium && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                    Active Member
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl sm:text-5xl font-black text-white">
                  ₹{interval === 'yearly' ? '4,999' : '499'}
                </span>
                <span className="text-xs text-slate-300">
                  /{interval === 'yearly' ? 'year' : 'month'}
                </span>
                {interval === 'yearly' && (
                  <span className="text-[11px] text-amber-300/80 font-medium ml-1">
                    (₹416/mo)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mb-6">
                Your dedicated AI Personal Learning Coach with unlimited uploads, weakness remediation, and priority models.
              </p>

              <div className="space-y-3.5 mb-8 border-t border-amber-500/20 pt-6">
                <FeatureItem text="Unlimited document uploads (up to 500/mo)" highlight />
                <FeatureItem text="🔥 Fix My Weakness 5-step deep repair engine" highlight />
                <FeatureItem text="Deep AI Misconception Diagnosis on wrong answers" highlight />
                <FeatureItem text="Comprehensive quizzes (up to 20 questions)" />
                <FeatureItem text="Continuous Adaptive Learning Quiz Engine" />
                <FeatureItem text="Interactive AI Tutor Q&A with high throughput" />
                <FeatureItem text="Exportable PDF study reports" />
                <FeatureItem text="Priority AI processing & new feature access" />
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl btn-gold text-[#080b11] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-transform"
            >
              {loading ? (
                <>
                  <RotateCw size={15} className="animate-spin text-[#080b11]" />
                  Opening Stripe Checkout…
                </>
              ) : isPremium ? (
                <>
                  Manage Billing <ArrowRight size={15} />
                </>
              ) : (
                <>
                  Upgrade to Pro <Sparkles size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features Comparison / Guarantee */}
        <div className="mt-16 text-center border-t border-white/10 pt-10">
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Secure 256-bit Stripe encrypted checkout. Cancel anytime with one click in your billing portal.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text, highlight = false }) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          highlight
            ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        }`}
      >
        <Check size={10} strokeWidth={3} />
      </div>
      <span className={highlight ? 'text-white font-medium' : 'text-slate-300'}>{text}</span>
    </div>
  );
}


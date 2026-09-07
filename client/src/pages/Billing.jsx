import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crown,
  CreditCard,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  FileText,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function Billing() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!token) return;
    loadSubscription();
  }, [token]);

  async function loadSubscription() {
    setLoading(true);
    try {
      const data = await api.getSubscriptionStatus(token);
      setSubData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.createPortalSession(token);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No billing portal URL received.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not access billing portal. If you are on the Free plan, please upgrade to manage billing.');
      setPortalLoading(false);
    }
  }

  const isPremium = subData?.isPremium;
  const planName = isPremium ? 'StudyDeck Pro' : 'Free Starter';
  const docsUsed = subData?.usage?.documentsThisMonth || 0;
  const docsLimit = subData?.limits?.maxDocumentsMonth || 5;
  const docsPercent = Math.min(100, Math.round((docsUsed / docsLimit) * 100));

  const renewalDate = subData?.currentPeriodEnd
    ? new Date(subData.currentPeriodEnd).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={20} className="text-amber-400" />
            <h1 className="font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              Subscription & Billing
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your StudyDeck membership, billing history, payment methods, and usage limits.
          </p>
        </div>

        {isPremium && subData?.hasStripeCustomer && (
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="btn-glass text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            {portalLoading ? (
              <RotateCw size={14} className="animate-spin text-amber-400" />
            ) : (
              <ExternalLink size={14} className="text-slate-400" />
            )}
            Manage Billing in Stripe
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-44 glass-panel rounded-2xl animate-pulse bg-white/5" />
          <div className="h-44 glass-panel rounded-2xl animate-pulse bg-white/5" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Subscription Card */}
          <div
            className={`glass-panel rounded-3xl p-6 sm:p-8 border relative overflow-hidden shadow-2xl ${
              isPremium
                ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-white/[0.02] to-transparent'
                : 'border-white/10'
            }`}
          >
            {/* Ambient inner glow for pro */}
            {isPremium && (
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                    isPremium
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-black shadow-amber-500/20'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <Crown size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">{planName}</h2>
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isPremium
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {subData?.status === 'active' ? 'Active' : subData?.status || 'Free'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isPremium
                      ? `Billed ${subData?.billingInterval || 'monthly'} via Stripe encrypted gateway.`
                      : 'Basic study material organization and practice quizzes.'}
                  </p>
                </div>
              </div>

              {!isPremium ? (
                <Link
                  to="/pricing"
                  className="btn-gold py-2.5 px-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 self-start sm:self-auto"
                >
                  <Sparkles size={14} /> Upgrade to Pro
                </Link>
              ) : (
                <div className="text-right self-start sm:self-auto">
                  <div className="text-xs font-semibold text-slate-400">
                    {subData?.cancelAtPeriodEnd ? 'Expires On' : 'Renews On'}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5 justify-end">
                    <Calendar size={13} className="text-amber-400" />
                    {renewalDate || '—'}
                  </div>
                </div>
              )}
            </div>

            {/* Cancel at period end notice */}
            {subData?.cancelAtPeriodEnd && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-6 flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-bold">Pending Cancellation:</span> Your subscription is scheduled to end on {renewalDate}. You retain full Pro access until that date. You can re-activate anytime in the billing portal.
                </div>
              </div>
            )}

            {/* Usage Meter */}
            <div className="border-t border-white/10 pt-6">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText size={13} className="text-amber-400" />
                  Monthly Document Uploads
                </span>
                <span className="text-white font-semibold">
                  {docsUsed} / {isPremium ? 'Unlimited (500)' : docsLimit}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    docsPercent >= 90
                      ? 'bg-rose-500'
                      : docsPercent >= 70
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, isPremium ? (docsUsed / 500) * 100 : docsPercent)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Usage resets automatically on the 1st of each month.
              </p>
            </div>
          </div>

          {/* Membership Benefits Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-400" />
              {isPremium ? 'Your Pro Privileges' : 'Unlock Pro Features'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <BenefitItem
                title="5-Step Weakness Repair"
                description="Deep learning remediation with misconception fixes and targeted question ladders."
                active={isPremium}
              />
              <BenefitItem
                title="AI Misconception Diagnosis"
                description="Live detection of root conceptual traps whenever you make a mistake."
                active={isPremium}
              />
              <BenefitItem
                title="Adaptive Learning Engine"
                description="Dynamic quiz generation tailored continuously to your zero and weak mastery concepts."
                active={isPremium}
              />
              <BenefitItem
                title="Unlimited Uploads & Quizzes"
                description="Upload up to 500 documents per month with comprehensive 20-question quizzes."
                active={isPremium}
              />
            </div>

            {!isPremium && (
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold text-sm block">Ready to master your subjects?</span>
                  <span className="text-xs text-slate-400">Plans start at just ₹416/month (billed yearly).</span>
                </div>
                <Link
                  to="/pricing"
                  className="btn-gold text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  View Plans <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BenefitItem({ title, description, active }) {
  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        active
          ? 'glass-card border-amber-500/20 bg-amber-500/5'
          : 'bg-white/[0.02] border-white/5 text-slate-400'
      }`}
    >
      <div className="flex items-center gap-2 font-bold text-white mb-1">
        <CheckCircle2
          size={14}
          className={active ? 'text-amber-400' : 'text-slate-500'}
        />
        {title}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}


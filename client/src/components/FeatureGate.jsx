import { Link } from 'react-router-dom';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Reusable FeatureGate component to restrict pro-only features in the UI.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected content rendered if user meets plan
 * @param {string} [props.requiredPlan='pro'] - Tier needed ('pro' or 'free')
 * @param {string} [props.featureName='This feature'] - Name of the feature being gated
 * @param {string} [props.description] - Description shown on the upgrade prompt
 * @param {React.ReactNode} [props.fallback] - Custom fallback override if specified
 * @param {'card'|'inline'|'banner'} [props.mode='card'] - Display format for the prompt
 */
export default function FeatureGate({
  children,
  requiredPlan = 'pro',
  featureName = 'This feature',
  description,
  fallback = null,
  mode = 'card'
}) {
  const { user } = useAuth();

  const isPro = Boolean(
    user?.plan === 'pro' ||
    user?.plan === 'premium' ||
    user?.subscription?.plan === 'premium' ||
    user?.subscription?.plan === 'pro' ||
    user?.subscription?.isPremium
  );

  const hasAccess = requiredPlan === 'free' || isPro;

  if (hasAccess) {
    return children;
  }

  // If a custom fallback was provided, use it
  if (fallback) {
    return fallback;
  }

  const defaultDesc =
    description ||
    `${featureName} is exclusive to StudyDeck Pro members. Upgrade your plan to unlock unlimited learning power.`;

  if (mode === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
        <Sparkles size={13} className="text-amber-400 shrink-0" />
        <span>Pro required</span>
        <Link
          to="/pricing"
          className="ml-1 text-[11px] font-bold underline hover:text-amber-200"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (mode === 'banner') {
    return (
      <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-indigo-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <Crown size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {featureName} <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">PRO</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">{defaultDesc}</p>
          </div>
        </div>
        <Link
          to="/pricing"
          className="btn-gold py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <Sparkles size={13} /> Upgrade to Pro
        </Link>
      </div>
    );
  }

  // Default 'card' mode
  return (
    <div className="glass-panel rounded-3xl p-8 sm:p-10 border border-amber-500/30 text-center max-w-md mx-auto my-8 relative overflow-hidden shadow-2xl shadow-amber-500/10">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 text-amber-400 shadow-lg shadow-amber-500/15">
        <Crown size={30} className="text-amber-400" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-3">
        <Sparkles size={12} /> StudyDeck Pro Feature
      </span>

      <h3 className="text-xl font-bold text-white tracking-tight mb-2">
        {featureName}
      </h3>

      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
        {defaultDesc}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/pricing"
          className="btn-gold w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
        >
          <Sparkles size={14} /> Upgrade to Pro <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}


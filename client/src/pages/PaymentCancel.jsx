import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RotateCw, Crown, ShieldAlert } from 'lucide-react';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 blur-[130px] pointer-events-none rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel max-w-md w-full rounded-3xl p-8 sm:p-10 border border-white/10 text-center relative z-10 shadow-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6 text-rose-400">
          <XCircle size={32} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Checkout Canceled</h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8 max-w-sm mx-auto">
          Your payment was not completed and your card was not charged. You can continue using your Free account or upgrade whenever you’re ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/pricing')}
            className="btn-gold py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
          >
            <Crown size={14} /> Review Plans
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-glass py-3 px-5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer text-slate-300 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}


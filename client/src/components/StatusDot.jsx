import { Clock, XCircle } from 'lucide-react';

// Solid-panel pill badge — matches the design reference's status chips.
// Same {status} prop contract as before, so callers (DocumentDetail.jsx,
// Landing.jsx) didn't need any changes.
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    classes: 'bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
    icon: null
  },
  processing: {
    label: 'Processing',
    classes: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-500/30',
    dot: null,
    icon: Clock
  },
  done: {
    label: 'Done',
    classes: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30',
    dot: 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]',
    icon: null
  },
  failed: {
    label: 'Failed',
    classes: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30',
    dot: null,
    icon: XCircle
  }
};

export default function StatusDot({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${config.classes}`}
    >
      {Icon ? (
        <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      ) : (
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}
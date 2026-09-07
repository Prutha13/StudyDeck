import { motion } from 'framer-motion';
import { FileText, FileType, NotebookText, HelpCircle, Layers, ChevronRight, Trash2, BookOpen, Clock, XCircle, Network, AlertTriangle } from 'lucide-react';

const FORMAT_CONFIG = {
  pdf: { label: 'PDF', icon: FileText },
  docx: { label: 'DOCX', icon: FileType },
  txt: { label: 'TXT', icon: NotebookText },
  pasted: { label: 'Pasted', icon: NotebookText }
};

// Pill-shaped status badge — solid dark chip + colored dot, matching the
// design reference's DocumentCard.tsx instead of our old inline StatusDot.
const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    classes: 'bg-slate-900/60 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
    icon: null
  },
  processing: {
    label: 'Processing',
    classes: 'bg-amber-950/40 text-amber-400 border-amber-500/30',
    dot: null,
    icon: Clock
  },
  done: {
    label: 'Done',
    classes: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
    icon: null
  },
  failed: {
    label: 'Failed',
    classes: 'bg-rose-950/40 text-rose-400 border-rose-500/30',
    dot: null,
    icon: XCircle
  }
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${config.classes}`}
    >
      {Icon ? (
        <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
      ) : (
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

/**
 * GlassDocumentCard
 * Flat-panel list row for a study document — solid dark surface + amber
 * accents, matching the studydeck-ai-workspace design reference. Keeps the
 * same props contract (doc, onOpen, onStudy, onQuiz, onDelete) as before so
 * Dashboard.jsx didn't need to change how it calls this component.
 */
export default function GlassDocumentCard({ doc, onOpen, onStudy, onQuiz, onDelete, onViewMastery, onReviewMistakes }) {
  const format = FORMAT_CONFIG[doc.sourceType] || FORMAT_CONFIG.pasted;
  const FormatIcon = format.icon;

  const dateLabel = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Recently';

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      onClick={() => onOpen?.(doc)}
      className="group relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl
        bg-paper border border-slate-200/80 dark:border-[#23262e] hover:border-amber-500/40
        shadow-sm dark:shadow-md hover:shadow-lg
        transition-all duration-200 cursor-pointer select-none"
    >
      {/* Icon + title + metadata */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#181a20] border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:border-amber-400/60 group-hover:scale-105 transition-all shrink-0">
          <FileText size={20} className="stroke-[2]" />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-200 transition-colors truncate">
            {doc.title}
          </h3>

          {/* Metadata row: date · format pill · Qs · Cards · Mastery · Mistakes */}
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 mt-1 flex-wrap">
            <span>{dateLabel}</span>

            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] font-mono font-semibold uppercase">
              <FormatIcon size={10} />
              {format.label}
            </span>

            {doc.quizCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                <HelpCircle size={13} />
                {doc.quizCount} Qs
              </span>
            )}

            {doc.flashcardsCount > 0 && (
              <span className="hidden md:flex items-center gap-1 text-slate-400">
                <Layers size={13} className="text-slate-500" />
                {doc.flashcardsCount} Cards
              </span>
            )}

            {doc.status === 'done' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewMastery?.(doc);
                  }}
                  className="hidden lg:inline-flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                  title="View Knowledge Map for this document"
                >
                  <Network size={12} className="text-amber-400" />
                  <span>Mastery</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReviewMistakes?.(doc);
                  }}
                  className="hidden lg:inline-flex items-center gap-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="View Mistake Book for this document"
                >
                  <AlertTriangle size={12} className="text-rose-400" />
                  <span>Mistakes</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: quick actions (on hover) + status + chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 mr-1 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <QuickAction
            label="Study"
            icon={BookOpen}
            onClick={(e) => {
              e.stopPropagation();
              onStudy?.(doc);
            }}
          />
          {doc.status === 'done' && doc.quizCount > 0 && (
            <QuickAction
              label="Quiz"
              icon={HelpCircle}
              onClick={(e) => {
                e.stopPropagation();
                onQuiz?.(doc);
              }}
            />
          )}
          {doc.status === 'done' && (
            <>
              <QuickAction
                label="View Mastery"
                icon={Network}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewMastery?.(doc);
                }}
              />
              <QuickAction
                label="Review Mistakes"
                icon={AlertTriangle}
                onClick={(e) => {
                  e.stopPropagation();
                  onReviewMistakes?.(doc);
                }}
              />
            </>
          )}
          <QuickAction
            label="Delete"
            icon={Trash2}
            danger
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(doc);
            }}
          />
        </div>

        <StatusBadge status={doc.status} />
        <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}

function QuickAction({ label, icon: Icon, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`p-2 rounded-lg border border-slate-200 dark:border-[#23262e] bg-slate-100 dark:bg-[#181a20] text-slate-700 dark:text-slate-300
        hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#20232c] transition-colors duration-200 cursor-pointer
        ${danger ? 'hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30' : 'hover:border-amber-500/40'}`}
    >
      <Icon size={14} />
    </button>
  );
}
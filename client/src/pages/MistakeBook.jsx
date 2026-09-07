import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCw,
  Search,
  Filter,
  Flame,
  Check,
  X,
  Target,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DocumentFilter from '../components/DocumentFilter';
import * as api from '../api/client';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, ease: [0.16, 1, 0.3, 1] } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
};

export default function MistakeBook() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedDocument, setSelectedDocument] = useState(searchParams.get('documentId') || 'all');
  const [mistakes, setMistakes] = useState([]);
  const [counts, setCounts] = useState({ total: 0, needs_revision: 0, improving: 0, fixed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'needs_revision' | 'improving' | 'fixed'

  // Active retest state: mistakeId -> { selectedIndex, submitting, result }
  const [activeRetestId, setActiveRetestId] = useState(null);
  const [retestState, setRetestState] = useState({});

  async function loadMistakes(docId = selectedDocument, status = selectedStatus) {
    try {
      const data = await api.getMistakes(token, {
        status: status === 'all' ? undefined : status,
        documentId: docId === 'all' ? undefined : docId
      });
      setMistakes(data.mistakes || []);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error('Failed to load mistakes:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMistakes(selectedDocument, selectedStatus);
  }, [token, selectedDocument, selectedStatus]);

  async function handleRetestSubmit(mistakeId, selectedIndex, selectedAnswer) {
    setRetestState((prev) => ({
      ...prev,
      [mistakeId]: { ...prev[mistakeId], submitting: true, selectedIndex }
    }));

    try {
      const result = await api.retestMistake(token, mistakeId, { selectedIndex, selectedAnswer });
      setRetestState((prev) => ({
        ...prev,
        [mistakeId]: { submitting: false, selectedIndex, result }
      }));

      // Update mistake in local list
      setMistakes((prev) =>
        prev.map((m) => (m._id === mistakeId ? { ...m, status: result.status } : m))
      );
    } catch (err) {
      alert(err.message || 'Failed to submit retest');
      setRetestState((prev) => ({
        ...prev,
        [mistakeId]: { ...prev[mistakeId], submitting: false }
      }));
    }
  }

  const filteredMistakes = mistakes.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.conceptName?.toLowerCase().includes(q) ||
      m.misconception?.toLowerCase().includes(q) ||
      m.question?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen size={18} />
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-white tracking-tight">
              AI Mistake Book
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Diagnosed conceptual misconceptions, targeted mini-fixes, and guided re-tests.
          </p>
        </div>
      </div>

      {/* Document Selector Filter */}
      <DocumentFilter selected={selectedDocument} onChange={setSelectedDocument} />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
        {[
          { id: 'all', label: 'Total Recorded', count: counts.total, color: 'text-white', border: 'border-white/10' },
          { id: 'needs_revision', label: 'Needs Revision', count: counts.needs_revision, color: 'text-rose-400', border: 'border-rose-500/30' },
          { id: 'improving', label: 'Improving', count: counts.improving, color: 'text-amber-400', border: 'border-amber-500/30' },
          { id: 'fixed', label: 'Fixed / Mastered', count: counts.fixed, color: 'text-emerald-400', border: 'border-emerald-500/30' }
        ].map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedStatus(s.id)}
            className={`glass-panel rounded-2xl p-4 cursor-pointer transition-all ${
              selectedStatus === s.id ? `${s.border} bg-white/5` : 'border-white/5 hover:border-white/20'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-400 block mb-1">{s.label}</span>
            <span className={`text-2xl font-extrabold ${s.color}`}>{s.count}</span>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by mistake, misconception, or concept..."
          className="glass-input w-full pl-11 pr-4 py-3 rounded-xl text-xs sm:text-sm focus:outline-none"
        />
      </div>

      {/* Mistakes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 glass-panel rounded-2xl animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="glass-panel rounded-2xl p-14 text-center border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {selectedStatus === 'all' ? 'No mistakes recorded yet!' : 'No mistakes in this category'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Whenever you take a quiz or practice session and get an answer wrong, StudyDeck AI will automatically diagnose the root misconception and store it here.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
          >
            Practice from Documents
          </button>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {filteredMistakes.map((mistake) => {
            const isRetesting = activeRetestId === mistake._id;
            const currentRetest = retestState[mistake._id] || {};

            return (
              <motion.div
                key={mistake._id}
                variants={item}
                className="glass-panel rounded-2xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-5"
              >
                {/* Card Top Pill Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                      {mistake.conceptName}
                    </span>
                    {mistake.occurrences > 1 && (
                      <span className="text-[10px] font-semibold text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30">
                        Mistaken {mistake.occurrences}x
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        mistake.status === 'fixed'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : mistake.status === 'improving'
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {mistake.status === 'fixed'
                        ? 'Mastered 🟢'
                        : mistake.status === 'improving'
                        ? 'Improving 🟡'
                        : 'Needs Revision 🔴'}
                    </span>
                  </div>
                </div>

                {/* Original Question */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white leading-snug mb-3">
                    {mistake.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Student Answer */}
                    <div className="rounded-xl p-3 bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5">
                      <XCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-rose-300 block mb-0.5">Your Answer</span>
                        <span className="text-slate-200">{mistake.studentAnswer}</span>
                      </div>
                    </div>

                    {/* Correct Answer */}
                    <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <span className="font-semibold text-emerald-300 block mb-0.5">Correct Answer</span>
                        <span className="text-slate-200">{mistake.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Misconception Diagnosis Box */}
                <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <Sparkles size={14} className="text-amber-400" />
                    AI Misconception Diagnosis
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white mb-1">
                      You confused: <span className="text-amber-300">{mistake.misconception}</span>
                    </div>
                    {mistake.whyChosen && (
                      <p className="text-xs text-slate-300 leading-relaxed">{mistake.whyChosen}</p>
                    )}
                  </div>

                  {mistake.miniFix && (
                    <div className="pt-2 border-t border-amber-500/20">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block mb-1">
                        Targeted Mini-Fix:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed">{mistake.miniFix}</p>
                    </div>
                  )}
                </div>

                {/* Try Again / Re-test Section */}
                {mistake.tryAgainQuestion && (
                  <div className="pt-3 border-t border-white/5">
                    {!isRetesting && !currentRetest.result ? (
                      <button
                        onClick={() => setActiveRetestId(mistake._id)}
                        className="btn-gold flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        <Zap size={14} /> Try Again Practice Question
                      </button>
                    ) : (
                      <div className="space-y-4 bg-white/5 rounded-2xl p-5 border border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Target size={14} /> Practice Re-Test
                          </span>
                          <button
                            onClick={() => setActiveRetestId(null)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Close
                          </button>
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-white">
                          {mistake.tryAgainQuestion.question}
                        </p>

                        <div className="space-y-2">
                          {mistake.tryAgainQuestion.options?.map((opt, idx) => {
                            const isSelected = currentRetest.selectedIndex === idx;
                            const isSubmitted = Boolean(currentRetest.result);
                            const isCorrectOpt = idx === mistake.tryAgainQuestion.correctIndex;

                            return (
                              <button
                                key={idx}
                                disabled={isSubmitted || currentRetest.submitting}
                                onClick={() => handleRetestSubmit(mistake._id, idx, opt)}
                                className={`w-full text-left p-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-between cursor-pointer ${
                                  isSubmitted
                                    ? isCorrectOpt
                                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                                      : isSelected
                                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                                      : 'bg-white/5 border-white/10 text-slate-400 opacity-50'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-500/40 text-slate-200'
                                }`}
                              >
                                <span>{opt}</span>
                                {isSubmitted && isCorrectOpt && <Check size={16} className="text-emerald-400" />}
                                {isSubmitted && isSelected && !isCorrectOpt && (
                                  <X size={16} className="text-rose-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {currentRetest.result && (
                          <div
                            className={`p-3.5 rounded-xl text-xs ${
                              currentRetest.result.isCorrect
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <span className="font-bold block mb-1">
                              {currentRetest.result.isCorrect ? '✅ Excellent! Misconception resolved.' : '❌ Not quite right yet.'}
                            </span>
                            {currentRetest.result.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}


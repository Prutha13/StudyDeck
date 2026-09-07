import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  Award,
  BookOpen,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DocumentFilter from '../components/DocumentFilter';
import * as api from '../api/client';

export default function DailyReview() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedDocument, setSelectedDocument] = useState(searchParams.get('documentId') || 'all');
  const [loading, setLoading] = useState(true);
  const [queueData, setQueueData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [finished, setFinished] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  async function loadReviewQueue(docId = selectedDocument) {
    try {
      const data = await api.getDailyReview(token, docId);
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load daily review queue:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
    setFinished(false);
    setCompletedCount(0);
    loadReviewQueue(selectedDocument);
  }, [token, selectedDocument]);

  const items = queueData?.items || [];
  const currentItem = items[currentIndex];

  async function handleChoose(idx) {
    if (submitted || selectedOption !== null) return;
    setSelectedOption(idx);
    setSubmitted(true);

    const correct = idx === currentItem.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      setCompletedCount((c) => c + 1);
    }

    try {
      await api.submitDailyReview(token, {
        conceptId: currentItem.conceptId,
        isCorrect: correct
      });
    } catch (err) {
      console.warn('Daily review submit warning:', err.message);
    }
  }

  function handleNext() {
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setSubmitted(false);
      setIsCorrect(false);
    } else {
      setFinished(true);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Brain size={28} />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Calculating Review Schedule…</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Checking your memory decay curves, SM-2 retention intervals, and concepts due for reinforcement today.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
              <Calendar size={12} className="text-amber-400" />
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
            </span>
          </div>
          <h1 className="font-extrabold text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2.5">
            Daily Review Queue
          </h1>
        </div>

        {items.length > 0 && !finished && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
            <Clock size={14} className="text-amber-400" />
            <span>~{queueData?.estimatedMinutes || 5} min session</span>
          </div>
        )}
      </div>

      {/* Document Filter */}
      <DocumentFilter selected={selectedDocument} onChange={setSelectedDocument} />

      {items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10 shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white">All Caught Up For Today! 🎉</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            No concepts are currently due for spaced review. Your retention curves are on track.
          </p>
          <div className="pt-3">
            <button
              onClick={() => navigate('/knowledge-map')}
              className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Explore Knowledge Map
            </button>
          </div>
        </div>
      ) : finished ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-2xl p-10 text-center border border-emerald-500/30 shadow-2xl space-y-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Award size={36} />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Daily Review Complete! 🧠
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              You reviewed all <span className="font-bold text-amber-300">{items.length} concepts</span> scheduled for today and maintained your learning retention.
            </p>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => navigate('/knowledge-map')}
              className="btn-gold text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
            >
              View Knowledge Map
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-glass text-xs font-medium py-3 px-5 rounded-xl cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Concept {currentIndex + 1} of {items.length}</span>
            <span className="text-amber-400 font-semibold">{currentItem.subjectName}</span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            />
          </div>

          {/* Active Review Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="glass-panel rounded-2xl p-7 border border-white/10 shadow-2xl space-y-6"
            >
              {/* Concept Meta */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                    {currentItem.conceptName}
                  </span>
                  <span className="text-[11px] text-slate-400">• {currentItem.topicName}</span>
                </div>
                <span className="text-[11px] font-bold text-amber-300">
                  Mastery: {currentItem.currentScore}%
                </span>
              </div>

              {/* Question */}
              <h2 className="text-base sm:text-lg font-semibold text-white leading-snug">
                {currentItem.question}
              </h2>

              {/* Options */}
              <div className="space-y-2.5">
                {currentItem.options?.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectOpt = idx === currentItem.correctIndex;

                  let btnStyle = 'glass-card-interactive border-white/10 text-slate-200';
                  if (submitted) {
                    if (isCorrectOpt) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-semibold';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                    } else {
                      btnStyle = 'bg-white/5 border-white/10 text-slate-400 opacity-40';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={submitted}
                      onClick={() => handleChoose(idx)}
                      className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {submitted && isCorrectOpt && <Check size={16} className="text-emerald-400 shrink-0" />}
                      {submitted && isSelected && !isCorrectOpt && <X size={16} className="text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback box */}
              {submitted && (
                <div
                  className={`p-4 rounded-xl text-xs leading-relaxed ${
                    isCorrect
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                  }`}
                >
                  <span className="font-bold block mb-1">
                    {isCorrect ? '✅ Well recalled! Memory interval expanded.' : '❌ Needs review.'}
                  </span>
                  {currentItem.explanation}
                </div>
              )}

              {/* Next Button */}
              {submitted && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleNext}
                    className="btn-gold flex items-center gap-2 text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    {currentIndex + 1 < items.length ? 'Next Concept →' : 'Complete Daily Review 🎉'}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


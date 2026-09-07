import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, RotateCcw, Layers, Sparkles, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function Quiz() {
  const { id } = useParams();
  const { state } = useLocation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(state?.quiz || []);
  const [loading, setLoading] = useState(!state?.quiz || state.quiz.length === 0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const savedAttemptRef = useRef(false);

  useEffect(() => {
    if (quiz && quiz.length > 0) return;

    let isMounted = true;
    api.getDocument(token, id)
      .then((doc) => {
        if (isMounted && doc?.result?.quiz && doc.result.quiz.length > 0) {
          setQuiz(doc.result.quiz);
        }
      })
      .catch((err) => console.error('Failed to load quiz:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, id, quiz]);

  const [answers, setAnswers] = useState([]);

  // Save score to backend when quiz finishes (once per attempt)
  useEffect(() => {
    if (!finished || quiz.length === 0 || savedAttemptRef.current) return;
    savedAttemptRef.current = true;
    setSavingScore(true);
    api
      .saveQuizAttempt(token, id, { score, total: quiz.length, answers })
      .then(() => api.notifyStatsChanged())
      .catch((err) => console.warn('Could not save quiz attempt:', err.message))
      .finally(() => setSavingScore(false));
  }, [finished, score, quiz.length, answers, token, id]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-10 py-20 text-center">
          <div className="relative w-4 h-4 mx-auto mb-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </div>
          <p className="text-slate-400 text-sm">Loading quiz questions…</p>
        </div>
    );
  }

  if (!quiz || quiz.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-10 py-20 text-center">
          <p className="text-slate-400 text-sm mb-5">
            No quiz questions found for this document.
          </p>
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="btn-glass text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
          >
            Back to document
          </button>
        </div>
    );
  }

  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);

  const current = quiz[index];

  async function choose(optIndex) {
    if (selected !== null) return;
    setSelected(optIndex);

    const isCorrect = optIndex === current.correctIndex;
    const studentAnswer = current.options[optIndex];
    const correctAnswer = current.options[current.correctIndex];

    setAnswers((prev) => [
      ...prev,
      {
        question: current.question,
        options: current.options,
        studentAnswer,
        correctAnswer,
        isCorrect,
        concept: current.concept || null
      }
    ]);

    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      // Trigger AI Mistake Diagnosis
      setDiagnosisLoading(true);
      setCurrentDiagnosis(null);
      try {
        const res = await api.diagnoseMistake(token, {
          question: current.question,
          studentAnswer,
          correctAnswer,
          options: current.options,
          conceptName: current.concept || state?.title || 'Core Concept',
          documentId: id
        });
        setCurrentDiagnosis(res.diagnosis);
      } catch (err) {
        console.warn('Diagnosis warning:', err.message);
      } finally {
        setDiagnosisLoading(false);
      }
    }
  }

  function next() {
    if (index + 1 < quiz.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      setCurrentDiagnosis(null);
    } else {
      setFinished(true);
    }
  }

  function restartQuiz() {
    savedAttemptRef.current = false;
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setFinished(false);
    setCurrentDiagnosis(null);
  }

  const percentage = Math.round((score / quiz.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12">
        <button
          onClick={() => navigate(`/documents/${id}`)}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft size={15} /> Back to document
        </button>

        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-medium">
                <span>Question {index + 1} of {quiz.length}</span>
                <span className="text-amber-400 font-semibold">Score: {score}</span>
              </div>

              <div className="w-full bg-white/5 rounded-full h-2 mb-8 overflow-hidden p-[1px] border border-white/10">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((index + 1) / quiz.length) * 100}%` }}
                />
              </div>

              <h1 className="font-bold text-xl sm:text-2xl text-white mb-8 leading-snug tracking-tight">
                {current.question}
              </h1>

              <div className="flex flex-col gap-3 mb-8">
                {current.options.map((opt, i) => {
                  const isCorrect = i === current.correctIndex;
                  const isChosen = i === selected;
                  const showState = selected !== null;

                  let style = 'glass-card-interactive border-white/10 text-slate-200';
                  if (showState && isCorrect)
                    style = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold shadow-lg shadow-emerald-500/10';
                  else if (showState && isChosen)
                    style = 'bg-rose-500/15 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-500/10';

                  return (
                    <button
                      key={i}
                      onClick={() => choose(i)}
                      className={`flex items-center justify-between text-left text-sm rounded-xl px-5 py-4 transition-all cursor-pointer ${style}`}
                    >
                      <span className="pr-4">{opt}</span>
                      {showState && isCorrect && <Check size={18} className="text-emerald-400 shrink-0" />}
                      {showState && isChosen && !isCorrect && <X size={18} className="text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* AI Mistake Diagnosis Feedback */}
              {selected !== null && selected !== current.correctIndex && (
                <div className="mb-6 rounded-2xl p-5 bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-transparent border border-amber-500/30 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" />
                      AI Mistake Diagnosis
                    </span>
                    <span className="text-[10px] font-semibold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                      Saved to Mistake Book
                    </span>
                  </div>

                  {diagnosisLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-300 animate-pulse py-2">
                      <Sparkles size={14} className="animate-spin text-amber-400" />
                      AI Coach is diagnosing your misconception…
                    </div>
                  ) : currentDiagnosis ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-white">Misconception: </span>
                        <span className="text-amber-300">{currentDiagnosis.misconception}</span>
                      </div>
                      {currentDiagnosis.whyChosen && (
                        <p className="text-slate-300 leading-relaxed">{currentDiagnosis.whyChosen}</p>
                      )}
                      {currentDiagnosis.miniFix && (
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                          <span className="font-bold text-amber-400 block mb-0.5">Mini-Fix:</span>
                          {currentDiagnosis.miniFix}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {selected !== null && (
                <button
                  onClick={next}
                  className="btn-gold w-full text-sm font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {index + 1 < quiz.length ? 'Next Question →' : 'View Final Results'}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center glass-panel rounded-2xl p-10 border border-white/10 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
                <Award size={32} />
              </div>

              <div className="font-extrabold text-5xl text-white mb-2 tracking-tight">
                {score} / {quiz.length}
              </div>
              <div className="text-sm font-bold text-amber-400 mb-3 tracking-widest uppercase">
                {percentage}% Final Score
              </div>
              <p className="text-xs text-slate-300 mb-8 max-w-sm mx-auto leading-relaxed">
                {savingScore
                  ? 'Saving your score…'
                  : score === quiz.length
                  ? 'Perfect score! You have completely mastered this material.'
                  : percentage >= 70
                  ? 'Great job! Review the document summary to reinforce key points.'
                  : 'Keep studying — review the flashcards or summary deck to strengthen recall.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
                <button
                  onClick={restartQuiz}
                  className="btn-glass flex items-center justify-center gap-2 text-xs font-semibold py-3 px-5 rounded-xl cursor-pointer"
                >
                  <RotateCcw size={14} /> Retake Quiz
                </button>
                <Link
                  to={`/documents/${id}/flashcards`}
                  className="btn-gold flex items-center justify-center gap-2 text-xs font-semibold py-3 px-5 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Layers size={14} /> Study Flashcards
                </Link>
                <button
                  onClick={() => navigate(`/documents/${id}`)}
                  className="btn-glass text-xs font-medium py-3 px-5 rounded-xl cursor-pointer"
                >
                  Back to Document
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}


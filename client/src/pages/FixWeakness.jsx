import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Check,
  X,
  RotateCcw,
  Zap,
  BookOpen,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FeatureGate from '../components/FeatureGate';
import * as api from '../api/client';

export default function FixWeakness() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conceptId = searchParams.get('conceptId');

  const isPro = Boolean(
    user?.plan === 'pro' ||
    user?.plan === 'premium' ||
    user?.subscription?.plan === 'premium' ||
    user?.subscription?.isPremium
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1 to 6 (6 is complete)

  // Step questions state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [stepFeedback, setStepFeedback] = useState({});
  const [submittingStep, setSubmittingStep] = useState(false);

  useEffect(() => {
    if (!isPro) {
      setLoading(false);
      return;
    }

    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.startFixWeakness(token, conceptId);
        if (!res.session) {
          setError(res.message || 'Could not find any weak concepts to repair right now.');
        } else {
          setSessionData(res);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize weakness repair session.');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [token, conceptId]);

  async function handleAnswerSubmit(stepNum, optIndex, optionText) {
    const questionObj = sessionData?.session?.questions?.find((q) => q.step === stepNum);
    if (!questionObj) return;

    const isCorrect = optIndex === questionObj.correctIndex;
    setSelectedAnswers((prev) => ({ ...prev, [stepNum]: optIndex }));
    setStepFeedback((prev) => ({
      ...prev,
      [stepNum]: {
        isCorrect,
        explanation: questionObj.explanation
      }
    }));

    setSubmittingStep(true);
    try {
      await api.submitFixWeaknessStep(token, {
        conceptId: sessionData.concept._id,
        stepIndex: stepNum,
        isCorrect
      });
    } catch (err) {
      console.warn('Step recording error:', err);
    } finally {
      setSubmittingStep(false);
    }
  }

  function advanceStep() {
    if (currentStep < 5) {
      setCurrentStep((s) => s + 1);
    } else {
      setCurrentStep(6); // completion screen
    }
  }

  if (!isPro) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <FeatureGate
          featureName="Fix My Weakness (5-Step Remediation)"
          description="Fix My Weakness uses deep AI misconception diagnosis, targeted mental models, and adaptive question ladders to permanently repair learning gaps. Exclusive to StudyDeck Pro members."
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Flame size={28} />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Analyzing Learning History…</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Pinpointing your highest-priority knowledge gaps, checking prerequisite graphs, and designing a 5-step repair session.
        </p>
      </div>
    );
  }

  if (error || !sessionData) {
    const isProRequired = error && (error.includes('exclusive to StudyDeck Pro') || error.includes('upgrade') || error.includes('Pro'));

    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="glass-panel rounded-3xl p-10 border border-white/10 shadow-2xl">
          {isProRequired ? (
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/20">
                <Crown size={28} />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold mb-3">
                <Sparkles size={13} /> StudyDeck Pro Feature
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Unlock 5-Step Weakness Repair</h2>
              <p className="text-xs text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
                Fix My Weakness uses deep AI misconception diagnosis, intuitive mental models, and targeted question ladders to permanently fix your difficult concepts.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn-gold text-xs font-bold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                >
                  <Sparkles size={14} /> Upgrade to Pro
                </button>
                <button
                  onClick={() => navigate('/knowledge-map')}
                  className="btn-glass text-xs font-semibold py-3 px-5 rounded-xl cursor-pointer"
                >
                  Back to Knowledge Map
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-base font-bold text-white mb-2">Ready for Learning</h2>
              <p className="text-xs text-slate-400 mb-6">{error || 'No weak areas identified!'}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
              >
                Go to Documents
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { concept, prerequisiteAdvisory, session } = sessionData;
  const currentQuestion = session.questions?.find((q) => q.step === currentStep);

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-12">
      {/* Top bar */}
      <button
        onClick={() => navigate('/knowledge-map')}
        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={15} /> Back to Knowledge Map
      </button>

      {/* Hero Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
              <Flame size={12} className="text-amber-400" />
              Fix My Weakness Session
            </span>
          </div>
          <h1 className="font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Remediating: <span className="text-amber-400">{concept.name}</span>
          </h1>
        </div>
      </div>

      {/* Prerequisite Alert Banner */}
      {prerequisiteAdvisory && (
        <div className="mb-6 rounded-2xl p-4 bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
          <Zap size={18} className="text-cyan-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-cyan-300 block mb-0.5">Foundational Dependency Detected</span>
            <p className="text-slate-300 leading-relaxed">{prerequisiteAdvisory.message}</p>
          </div>
        </div>
      )}

      {/* Step Progress Tracker */}
      <div className="grid grid-cols-5 gap-2 mb-8">
        {[
          { num: 1, label: 'Pitfalls' },
          { num: 2, label: 'Mental Model' },
          { num: 3, label: 'Easy Check' },
          { num: 4, label: 'Application' },
          { num: 5, label: 'Mastery' }
        ].map((s) => (
          <div key={s.num} className="flex flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStep > s.num
                  ? 'bg-emerald-400'
                  : currentStep === s.num
                  ? 'bg-amber-400'
                  : 'bg-white/10'
              }`}
            />
            <span className="text-[10px] text-center font-medium text-slate-400 hidden sm:block">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step Card Container */}
      <AnimatePresence mode="wait">
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-2.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle size={16} />
              Step 1: Understand The Confusion
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">Why this concept is tricky</h2>
              <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                {session.step1_diagnosis}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                onClick={advanceStep}
                className="btn-gold flex items-center gap-2 text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Next: Build Mental Model <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Lightbulb size={16} />
              Step 2: The Core Rule & Intuitive Explanation
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">The Intuitive Model</h2>
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/25 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {session.step2_explanation}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <button
                onClick={() => setCurrentStep(1)}
                className="btn-glass text-xs font-medium py-2.5 px-4 rounded-xl cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={advanceStep}
                className="btn-gold flex items-center gap-2 text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Ready for Practice Check <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {currentStep >= 3 && currentStep <= 5 && currentQuestion && (
          <motion.div
            key={`step${currentStep}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} />
                Step {currentStep}: {currentQuestion.level}
              </span>
              <span className="text-[11px] text-slate-400">Step {currentStep} of 5</span>
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-white leading-snug">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options?.map((opt, idx) => {
                const isSelected = selectedAnswers[currentStep] === idx;
                const isSubmitted = selectedAnswers[currentStep] !== undefined;
                const isCorrectOpt = idx === currentQuestion.correctIndex;

                let btnStyle = 'glass-card-interactive border-white/10 text-slate-200';
                if (isSubmitted) {
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
                    disabled={isSubmitted || submittingStep}
                    onClick={() => handleAnswerSubmit(currentStep, idx, opt)}
                    className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isSubmitted && isCorrectOpt && <Check size={18} className="text-emerald-400 shrink-0" />}
                    {isSubmitted && isSelected && !isCorrectOpt && <X size={18} className="text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Step Feedback Box */}
            {stepFeedback[currentStep] && (
              <div
                className={`p-4 rounded-xl text-xs leading-relaxed ${
                  stepFeedback[currentStep].isCorrect
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-200'
                }`}
              >
                <span className="font-bold block mb-1">
                  {stepFeedback[currentStep].isCorrect ? '✅ Correct! Mastery updated.' : '❌ Not quite right.'}
                </span>
                {stepFeedback[currentStep].explanation}
              </div>
            )}

            {selectedAnswers[currentStep] !== undefined && (
              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={advanceStep}
                  className="btn-gold flex items-center gap-2 text-xs font-semibold py-3 px-6 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {currentStep === 5 ? 'Complete Session 🎉' : 'Next Question →'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === 6 && (
          <motion.div
            key="step6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-2xl p-10 text-center border border-emerald-500/30 shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Award size={36} />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-white mb-1 tracking-tight">
                Weakness Repaired! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                You have worked through the diagnosis, reviewed the core mental model, and successfully passed the multi-level practice ladder for <span className="font-bold text-amber-300">{concept.name}</span>.
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl max-w-sm mx-auto flex items-center justify-around">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">Status</span>
                <span className="text-xs font-bold text-emerald-300">Improving 🟡 / Mastered 🟢</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-0.5">Next Review</span>
                <span className="text-xs font-bold text-slate-200">Scheduled in 3 days</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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
                Return to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


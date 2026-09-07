import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  CheckSquare,
  HelpCircle,
  AlertCircle,
  Layers,
  Send,
  RotateCw,
  Sparkles,
  History,
  Bot,
  Network,
  BookOpen,
  ArrowRight,
  GitFork,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StatusDot from '../components/StatusDot';
import FeatureGate from '../components/FeatureGate';
import * as api from '../api/client';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, ease: [0.16, 1, 0.3, 1] } }
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export default function DocumentDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const isPro = Boolean(
    user?.plan === 'pro' ||
    user?.plan === 'premium' ||
    user?.subscription?.plan === 'premium' ||
    user?.subscription?.isPremium
  );

  const [doc, setDoc] = useState(null);
  const [status, setStatus] = useState('processing');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [regenerating, setRegenerating] = useState(false);
  const [showExportUpgrade, setShowExportUpgrade] = useState(false);

  // Knowledge Graph State
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [extractingKnowledge, setExtractingKnowledge] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Initial fetch for document metadata, summary & quiz history
  useEffect(() => {
    let isMounted = true;

    async function loadDoc() {
      try {
        const data = await api.getDocument(token, id);
        if (isMounted) {
          setDoc(data);
          setStatus(data.status || 'processing');
          if (data.result) setResult(data.result);
          if (data.error) setErrorMsg(data.error);
        }

        // Fetch quiz attempts history
        const attempts = await api.getQuizAttempts(token, id).catch(() => []);
        if (isMounted) setQuizAttempts(attempts);
      } catch (err) {
        if (isMounted) setErrorMsg(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDoc();
    loadKnowledge();
    return () => {
      isMounted = false;
    };
  }, [token, id]);

  async function loadKnowledge() {
    try {
      const data = await api.getDocumentKnowledge(token, id);
      setKnowledgeData(data);
    } catch (err) {
      console.warn('Could not fetch document knowledge graph:', err);
    }
  }

  async function handleExtractKnowledge() {
    setExtractingKnowledge(true);
    setKnowledgeError(null);
    try {
      await api.extractDocumentKnowledge(token, id);
      await loadKnowledge();
    } catch (err) {
      setKnowledgeError(err.message || 'Failed to extract knowledge graph');
    } finally {
      setExtractingKnowledge(false);
    }
  }

  // Live SSE listener while pending or processing with backup polling
  useEffect(() => {
    if (status === 'done' || status === 'failed') return;

    const unsubscribe = api.subscribeToStatus(token, id, (update) => {
      if (update.status) setStatus(update.status);
      if (update.result) setResult(update.result);
      if (update.error) setErrorMsg(update.error);
      if (update.status === 'done') loadKnowledge();
    });

    const pollInterval = setInterval(async () => {
      try {
        const data = await api.getDocument(token, id);
        if (data.status) setStatus(data.status);
        if (data.result) setResult(data.result);
        if (data.error) setErrorMsg(data.error);
        if (data.status === 'done') loadKnowledge();
      } catch (err) {
        console.warn('Poll status error:', err);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [token, id, status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const title = doc?.title || 'Document Summary';

  async function handleRegenerate() {
    if (!window.confirm('Re-run AI analysis on this document?')) return;
    setRegenerating(true);
    setErrorMsg(null);
    try {
      await api.regenerateDocument(token, id, doc?.quizCount ?? 5);
      setStatus('processing');
      setResult(null);
    } catch (err) {
      alert(err.message || 'Failed to regenerate');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');

    const newHistory = [...chatMessages, { role: 'user', content: userText }];
    setChatMessages(newHistory);
    setChatLoading(true);

    try {
      const { reply } = await api.chatDocument(token, id, userText, chatMessages);
      setChatMessages([...newHistory, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages([
        ...newHistory,
        { role: 'assistant', content: `Error: ${err.message || 'Could not reach AI tutor.'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} /> Back to documents
          </button>
          {status === 'done' && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Re-analyze document with StudyDeck AI"
              className="btn-glass flex items-center gap-2 text-xs py-2 px-3.5 rounded-xl cursor-pointer"
            >
              <RotateCw size={13} className={regenerating ? 'animate-spin text-amber-400' : 'text-slate-400'} />
              Re-analyze
            </button>
          )}
        </div>

        {/* Document Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="font-bold text-2xl sm:text-3xl text-white tracking-tight truncate mr-2">{title}</h1>
          <StatusDot status={status} />
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 glass-panel rounded-2xl animate-pulse bg-white/5" />
            <div className="h-32 glass-panel rounded-2xl animate-pulse bg-white/5" />
          </div>
        ) : status === 'failed' ? (
          <div className="glass-panel rounded-2xl p-6 border border-rose-500/30 bg-rose-500/5 mb-6">
            <div className="flex items-start gap-3.5">
              <AlertCircle size={22} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-rose-300 mb-1">Analysis Failed</h2>
                <p className="text-xs text-slate-300 mb-5">{errorMsg || 'An error occurred during AI processing.'}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerate}
                    className="btn-gold text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-glass text-xs font-medium py-2 px-4 rounded-xl cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : status !== 'done' ? (
          <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
            <div className="relative w-4 h-4 mx-auto mb-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              {status === 'processing' ? 'Analyzing document with StudyDeck AI…' : 'Queued for AI processing…'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Extracting core topics, producing executive summaries, action items, interactive flashcards, and practice quizzes.
            </p>
          </div>
        ) : result ? (
          <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-8">
            {/* Executive Summary */}
            <motion.div variants={item}>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400" /> Executive Summary
                </h2>
                <button
                  onClick={() => {
                    if (!isPro) {
                      setShowExportUpgrade(true);
                    } else {
                      api.exportPdf(token, id);
                    }
                  }}
                  className="btn-glass flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg cursor-pointer hover:border-amber-500/40 transition-all"
                >
                  <Download size={13} /> Export PDF
                  {!isPro && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PRO
                    </span>
                  )}
                </button>
              </div>
              <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-amber-400 text-slate-200 text-[15px] leading-relaxed whitespace-pre-line shadow-xl">
                {result.summary}
              </div>
            </motion.div>

            {/* AI Knowledge Hierarchy & Concept Map */}
            <motion.div variants={item}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Network size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      Extracted Knowledge Graph
                      {knowledgeData?.totalConcepts > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          {knowledgeData.totalConcepts} concepts
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Granular concepts, topics, and prerequisite relationships identified by AI.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleExtractKnowledge}
                  disabled={extractingKnowledge}
                  className="btn-glass flex items-center gap-2 text-xs py-1.5 px-3 rounded-xl cursor-pointer self-start sm:self-auto"
                >
                  <RotateCw size={12} className={extractingKnowledge ? 'animate-spin text-amber-400' : 'text-slate-400'} />
                  {extractingKnowledge ? 'Extracting Concepts…' : knowledgeData?.topics?.length > 0 ? 'Refresh Concepts' : 'Extract Knowledge Graph'}
                </button>
              </div>

              {knowledgeError && (
                <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-2.5 mb-4">
                  {knowledgeError}
                </div>
              )}

              {knowledgeData?.subjects?.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-400 font-medium">Domain:</span>
                  {knowledgeData.subjects.map((s) => (
                    <span
                      key={s._id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300"
                    >
                      <BookOpen size={12} />
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              {knowledgeData?.topics?.length > 0 ? (
                <div className="space-y-4">
                  {knowledgeData.topics.map((topic) => (
                    <div
                      key={topic._id}
                      className="glass-panel rounded-2xl p-5 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Cpu size={15} className="text-amber-400" />
                          <h3 className="text-sm font-semibold text-white">{topic.name}</h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {topic.concepts?.length || 0} {topic.concepts?.length === 1 ? 'concept' : 'concepts'}
                        </span>
                      </div>

                      {topic.description && (
                        <p className="text-xs text-slate-400 mb-4">{topic.description}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {topic.concepts?.map((concept) => (
                          <div
                            key={concept._id}
                            className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/5 hover:border-amber-500/30 transition-all"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-xs font-bold text-white group-hover:text-amber-300">
                                  {concept.name}
                                </h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      concept.difficulty === 'easy'
                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                                        : concept.difficulty === 'hard' || concept.difficulty === 'advanced'
                                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                                    }`}
                                  >
                                    {concept.difficulty}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                                {concept.definition || concept.description}
                              </p>

                              {concept.keyTakeaway && (
                                <div className="text-[11px] text-amber-300/90 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2.5 py-1.5 mb-2.5">
                                  <span className="font-semibold">Takeaway:</span> {concept.keyTakeaway}
                                </div>
                              )}
                            </div>

                            {concept.prerequisites && concept.prerequisites.length > 0 && (
                              <div className="pt-2 border-t border-white/5 mt-1">
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                                  <GitFork size={10} className="text-cyan-400" />
                                  <span className="font-medium text-slate-500">Requires:</span>
                                  {concept.prerequisites.map((p) => (
                                    <span
                                      key={p._id || p}
                                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
                                    >
                                      {p.name || p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-center border border-dashed border-white/10">
                  <p className="text-xs text-slate-400 mb-3">
                    Knowledge graph not yet extracted for this document.
                  </p>
                  <button
                    onClick={handleExtractKnowledge}
                    disabled={extractingKnowledge}
                    className="btn-gold text-xs font-semibold py-2 px-4 rounded-xl cursor-pointer"
                  >
                    {extractingKnowledge ? 'Analyzing with AI…' : 'Extract Knowledge Graph'}
                  </button>
                </div>
              )}
            </motion.div>

            {/* Study Tools Grid (Flashcards & Quiz) */}
            <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Flashcards Card */}
              {result.flashcards && result.flashcards.length > 0 ? (
                <Link
                  to={`/documents/${id}/flashcards`}
                  state={{ flashcards: result.flashcards, title }}
                  className="glass-card group flex flex-col justify-between rounded-2xl p-6 cursor-pointer select-none"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
                        <Layers size={18} />
                      </div>
                      <span className="text-xs font-semibold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                        {result.flashcards.length} cards
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors mb-1">
                      Study Flashcards
                    </h3>
                    <p className="text-xs text-slate-400">Interactive 3D flip deck with spaced mastery tracking.</p>
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-white/10 text-xs font-semibold text-amber-400">
                    <span>Practice Deck</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ) : null}

              {/* Quiz Card */}
              {result.quiz && result.quiz.length > 0 ? (
                <Link
                  to={`/documents/${id}/quiz`}
                  state={{ quiz: result.quiz, title }}
                  className="glass-card group flex flex-col justify-between rounded-2xl p-6 cursor-pointer select-none"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center">
                        <HelpCircle size={18} />
                      </div>
                      <span className="text-xs font-semibold text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        {result.quiz.length} questions
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors mb-1">
                      Take Practice Quiz
                    </h3>
                    <p className="text-xs text-slate-400">Test knowledge recall with instant scoring feedback.</p>
                  </div>
                  <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-white/10 text-xs font-semibold text-amber-400">
                    <span>Start Quiz</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ) : (
                <div className="glass-panel rounded-2xl p-6 text-center border border-dashed border-white/10 flex flex-col justify-center">
                  <p className="text-xs text-slate-400 italic">No quiz questions generated for this document.</p>
                </div>
              )}
            </motion.div>

            {/* Past Quiz Attempts History */}
            {quizAttempts.length > 0 && (
              <motion.div variants={item} className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  <History size={14} className="text-amber-400" /> Past Quiz History ({quizAttempts.length})
                </div>
                <div className="divide-y divide-white/5">
                  {quizAttempts.map((attempt) => (
                    <div key={attempt._id} className="flex items-center justify-between py-3 text-xs">
                      <span className="text-slate-400">
                        {new Date(attempt.completedAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">{attempt.score} / {attempt.total}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                            attempt.percentage >= 80
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : attempt.percentage >= 50
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {attempt.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Action Items Section */}
            {result.actionItems && result.actionItems.length > 0 && (
              <motion.div variants={item}>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3.5">
                  Key Action Items
                </h2>
                <div className="flex flex-col gap-2.5">
                  {result.actionItems.map((task, i) => (
                    <div
                      key={i}
                      className="glass-card-interactive flex items-start gap-3.5 rounded-xl px-5 py-3.5"
                    >
                      <CheckSquare size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <span className="text-white font-medium">{task.task}</span>
                        {(task.owner || task.dueDate) && (
                          <span className="text-slate-400 text-xs block sm:inline sm:ml-2">
                            — {task.owner || 'Self'}{task.dueDate ? `, due ${task.dueDate}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AI Tutor Chat Widget */}
            <motion.div variants={item} className="glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ask AI Tutor</h3>
                  <p className="text-xs text-slate-400">Ask clarifying questions based directly on this document.</p>
                </div>
              </div>

              {/* Chat Message Box */}
              <div className="max-h-80 overflow-y-auto space-y-3.5 mb-4 pr-1">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    Have questions about this material? Type your question below!
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'btn-gold text-[#080b11] font-medium'
                            : 'glass-card border border-white/10 text-slate-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="glass-card text-xs text-slate-400 px-4 py-3 rounded-2xl animate-pulse flex items-center gap-2">
                      <Sparkles size={14} className="text-amber-400 animate-spin" /> AI Tutor is thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question about this document…"
                  disabled={chatLoading}
                  className="glass-input flex-1 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="btn-gold px-4 py-2.5 rounded-xl disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-lg shadow-amber-500/20"
                >
                  <Send size={15} />
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : (
          <div className="glass-panel rounded-2xl p-10 text-center border border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
              <Sparkles size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Generating Summary Deck…</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Click below to generate or refresh executive summaries, interactive flashcards, and practice quizzes for this document.
            </p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {regenerating ? 'Analyzing with AI…' : 'Generate Summary Deck'}
            </button>
          </div>
        )}

        {/* PDF Export Pro Gate Modal */}
        {showExportUpgrade && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-md w-full">
              <button
                onClick={() => setShowExportUpgrade(false)}
                className="absolute top-12 right-6 z-20 text-slate-400 hover:text-white text-xs bg-white/10 hover:bg-white/20 p-2 rounded-full cursor-pointer"
              >
                ✕
              </button>
              <FeatureGate
                featureName="PDF Report Export"
                description="Exporting full summaries, flashcards, and quizzes to printable PDF is exclusive to StudyDeck Pro members."
              />
            </div>
          </div>
        )}
      </div>
  );
}
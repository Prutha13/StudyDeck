import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Search, Plus, Sparkles, BookOpen, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassDocumentCard from '../components/GlassDocumentCard';
import * as api from '../api/client';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  }
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [docs, setDocs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const showNew = searchParams.get('new') === '1';

  const isPro = Boolean(
    user?.plan === 'pro' ||
    user?.plan === 'premium' ||
    user?.subscription?.plan === 'premium' ||
    user?.subscription?.isPremium
  );

  function loadDocs(query = '') {
    api.fetchDocuments(token, query)
      .then((d) => {
        setDocs(d);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDocs();
  }, [token]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadDocs(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  function closeModal() {
    setSearchParams({});
  }

  function handleCreated(newDoc) {
    setDocs((prev) => [newDoc, ...prev]);
    api.notifyStatsChanged();
    closeModal();
    navigate(`/documents/${newDoc.id}`);
  }

  async function handleDelete(doc) {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(token, doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      api.notifyStatsChanged();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  }

  const inflightKey = docs
    .filter((d) => d.status === 'pending' || d.status === 'processing')
    .map((d) => d.id)
    .join(',');

  useEffect(() => {
    if (!token || !inflightKey) return;

    const ids = inflightKey.split(',');
    const unsubs = ids.map((id) =>
      api.subscribeToStatus(token, id, (update) => {
        setDocs((prev) =>
          prev.map((doc) => {
            if (String(doc.id) !== String(id)) return doc;
            const next = { ...doc, status: update.status || doc.status };
            if (update.result) {
              next.flashcardsCount = update.result.flashcards?.length ?? next.flashcardsCount;
              next.quizCount = update.result.quiz?.length ?? next.quizCount;
            }
            return next;
          })
        );
        if (update.status === 'done' || update.status === 'failed') {
          api.notifyStatsChanged();
        }
      })
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [token, inflightKey]);

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-bold text-3xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              Your Documents
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                {docs.length} saved
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              AI-generated study summaries, interactive flashcards, and adaptive learning coach.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/fix-weakness')}
              className="btn-glass flex items-center gap-2 text-xs py-2.5 px-4 rounded-xl cursor-pointer hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300 transition-all shadow-md"
            >
              <Flame size={15} className="text-amber-500 dark:text-amber-400" /> Fix Weakness
              {!isPro && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  PRO
                </span>
              )}
            </button>
            <button
              onClick={() => setSearchParams({ new: '1' })}
              className="btn-gold flex items-center gap-2 text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} /> New Document
            </button>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-8">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or topic…"
            className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-paper border border-slate-200 dark:border-[#23262e] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Document List View */}
        {loading ? (
          <div className="space-y-3.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse bg-paper border border-slate-200 dark:border-[#23262e]"
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-14 text-center bg-paper border border-slate-200 dark:border-[#23262e] shadow-lg"
          >
            {searchQuery ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
                  <Search size={22} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">No matching documents</h3>
                <p className="text-xs text-slate-400 mb-5">No items found matching &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-glass text-xs font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Clear search query
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
                  <BookOpen size={26} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No documents uploaded yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Upload lecture notes, transcripts, or PDF documents to unlock instant executive summaries, flashcard decks, and AI quiz practice.
                </p>
                <button
                  onClick={() => setSearchParams({ new: '1' })}
                  className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
                >
                  Upload First Document
                </button>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3.5"
          >
            {docs.map((doc) => (
              <GlassDocumentCard
                key={doc.id}
                doc={doc}
                onOpen={(d) => navigate(`/documents/${d.id}`)}
                onStudy={(d) => navigate(`/documents/${d.id}`)}
                onQuiz={(d) => {
                  if (d.status !== 'done' || !(d.quizCount > 0)) return;
                  navigate(`/documents/${d.id}/quiz`);
                }}
                onViewMastery={(d) => navigate(`/knowledge-map?documentId=${d.id}`)}
                onReviewMistakes={(d) => navigate(`/mistakes?documentId=${d.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showNew && <NewDocumentModal onClose={closeModal} onCreated={handleCreated} />}
      </AnimatePresence>
    </>
  );
}

function NewDocumentModal({ onClose, onCreated }) {
  const { token } = useAuth();
  const [mode, setMode] = useState('upload'); // 'upload' | 'paste'
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState(null);
  const [quizCount, setQuizCount] = useState(5);
  const [customQuizCount, setCustomQuizCount] = useState('');
  const [isCustomQuiz, setIsCustomQuiz] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleFile(f) {
    if (!f) return;
    const validExt = /\.(pdf|docx|txt)$/i.test(f.name);
    if (!validExt) {
      setError('Only .pdf, .docx, and .txt files are supported.');
      return;
    }
    setError('');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'upload' && !file) return setError('Choose a file to upload.');
    if (mode === 'paste' && rawText.trim().length < 20) return setError('Paste at least a few sentences (min 20 characters).');

    const effectiveQuizCount = isCustomQuiz
      ? Math.max(0, Math.min(20, parseInt(customQuizCount, 10) || 0))
      : quizCount;

    setSubmitting(true);
    try {
      const doc = await api.uploadDocument(token, {
        title,
        rawText,
        file: mode === 'upload' ? file : null,
        quizCount: effectiveQuizCount
      });
      onCreated(doc);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center px-6 z-50 overflow-y-auto py-10"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-paper text-slate-900 dark:text-slate-100 w-full max-w-lg p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-[#23262e]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-400" />
            </div>
            <h2 className="font-bold text-xl text-white tracking-tight">New Document</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex gap-1.5 mb-6 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
          {['upload', 'paste'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                mode === m
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'upload' ? 'Upload File' : 'Paste Text'}
            </button>
          ))}
        </div>

        {/* Title Input */}
        <label className="block text-xs font-medium text-slate-300 mb-1.5">Document Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Quantum Physics Lecture 4 Notes"
          className="w-full rounded-xl px-4 py-2.5 text-sm mb-5 bg-[#181a20] border border-[#23262e] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
        />

        {mode === 'upload' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-9 mb-6 text-center transition-all ${
              dragActive
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-white/10 bg-white/3 hover:border-white/20'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
              <UploadCloud size={24} />
            </div>
            {file ? (
              <p className="text-sm font-semibold text-amber-300 px-4 truncate max-w-xs">{file.name}</p>
            ) : (
              <>
                <p className="text-xs text-slate-300">
                  Drag & drop your file here, or{' '}
                  <label className="text-amber-400 font-semibold underline underline-offset-2 cursor-pointer hover:text-amber-300">
                    browse
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files[0])}
                    />
                  </label>
                </p>
                <p className="text-[11px] text-slate-500">Supports PDF, DOCX, or TXT (up to 10MB)</p>
              </>
            )}
          </div>
        ) : (
          <>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Transcript or Raw Notes</label>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste the full lecture transcript or notes text here…"
              className="w-full rounded-xl px-4 py-2.5 text-sm mb-6 resize-none bg-[#181a20] border border-[#23262e] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </>
        )}

        {/* Quiz Option */}
        <div className="mb-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-2.5">
            <label className="block text-xs font-medium text-slate-300">
              Quiz Questions <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <span className="text-xs font-semibold text-amber-400">
              {isCustomQuiz
                ? `${customQuizCount || 0} questions`
                : quizCount === 0
                ? 'No quiz'
                : `${quizCount} questions`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: 'None', count: 0 },
              { label: '3 Qs', count: 3 },
              { label: '5 Qs', count: 5 },
              { label: '10 Qs', count: 10 }
            ].map((opt) => (
              <button
                key={opt.count}
                type="button"
                onClick={() => {
                  setIsCustomQuiz(false);
                  setQuizCount(opt.count);
                }}
                className={`text-xs py-2 px-2.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  !isCustomQuiz && quizCount === opt.count
                    ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-sm'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCustomQuiz(true);
                if (!customQuizCount) setCustomQuizCount('7');
              }}
              className={`text-xs underline cursor-pointer transition-colors ${
                isCustomQuiz ? 'font-semibold text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom count
            </button>
            {isCustomQuiz && (
              <input
                type="number"
                min="0"
                max="20"
                value={customQuizCount}
                onChange={(e) => setCustomQuizCount(e.target.value)}
                placeholder="0 - 20"
                className="glass-input w-20 rounded-lg px-2.5 py-1 text-xs focus:outline-none text-white"
              />
            )}
          </div>
        </div>

        {error && <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl px-4 py-2.5 mb-5">{error}</div>}
        {error && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 mb-5">
            <p className="mb-2 leading-relaxed">{error}</p>
            {error.toLowerCase().includes('limit') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/pricing');
                }}
                className="btn-gold py-1.5 px-3 rounded-lg text-[11px] font-bold text-black cursor-pointer shadow-md inline-flex items-center gap-1.5"
              >
                <Sparkles size={12} /> Upgrade to Pro
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-gold w-full text-sm font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Analyzing with StudyDeck AI…' : 'Generate Summary & Study Tools'}
        </button>
      </motion.form>
    </motion.div>
  );
}
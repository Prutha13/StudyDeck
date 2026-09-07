import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCw, Check, X, Shuffle, Layers, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

export default function Flashcards() {
  const { id } = useParams();
  const { state } = useLocation();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [cards, setCards] = useState(state?.flashcards || []);
  const [loading, setLoading] = useState(!state?.flashcards || state.flashcards.length === 0);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState(new Set());
  const [learningIds, setLearningIds] = useState(new Set());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (cards && cards.length > 0) return;

    let isMounted = true;
    api.getDocument(token, id)
      .then((doc) => {
        if (isMounted) {
          const loadedCards = doc?.result?.flashcards || [];
          setCards(loadedCards);
        }
      })
      .catch((err) => console.error('Failed to load flashcards:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, id, cards]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-10 py-20 text-center">
          <div className="relative w-4 h-4 mx-auto mb-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </div>
          <p className="text-slate-400 text-sm">Loading study deck…</p>
        </div>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-10 py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Layers size={24} />
          </div>
          <p className="text-slate-400 text-sm mb-5">
            No flashcards found for this document. Re-analyze to generate flashcards!
          </p>
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="btn-glass text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
          >
            Back to Document
          </button>
        </div>
    );
  }

  const currentCard = cards[index];
  const progressPercent = Math.round(((index) / cards.length) * 100);

  function markMastered() {
    setMasteredIds((prev) => new Set([...prev, index]));
    learningIds.delete(index);
    setLearningIds(new Set(learningIds));
    goNext();
  }

  function markLearning() {
    setLearningIds((prev) => new Set([...prev, index]));
    masteredIds.delete(index);
    setMasteredIds(new Set(masteredIds));
    goNext();
  }

  function goNext() {
    setIsFlipped(false);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  function goPrev() {
    if (index > 0) {
      setIsFlipped(false);
      setIndex((i) => i - 1);
    }
  }

  function restartAll() {
    setIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFinished(false);
  }

  function reviewLearning() {
    const needReview = cards.filter((_, i) => !masteredIds.has(i));
    if (needReview.length === 0) return restartAll();
    setCards(needReview);
    setIndex(0);
    setIsFlipped(false);
    setMasteredIds(new Set());
    setLearningIds(new Set());
    setFinished(false);
  }

  function shuffleCards() {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setIndex(0);
    setIsFlipped(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Navigation & Controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} /> Back to document
          </button>
          {!finished && (
            <button
              onClick={shuffleCards}
              title="Shuffle cards"
              className="btn-glass flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg cursor-pointer"
            >
              <Shuffle size={13} className="text-amber-400" /> Shuffle
            </button>
          )}
        </div>

        {!finished ? (
          <div>
            {/* Header & Progress */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Card {index + 1} of {cards.length}</span>
              <span className="text-emerald-400">{masteredIds.size} mastered</span>
            </div>

            <div className="w-full bg-white/5 rounded-full h-2 mb-8 overflow-hidden p-[1px] border border-white/10">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-300 ease-out shadow-sm shadow-amber-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Flashcard with 3D Flip */}
            <div
              className="perspective-1000 min-h-[320px] cursor-pointer mb-8"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full min-h-[320px] rounded-2xl border border-white/10 glass-panel shadow-2xl p-8 flex flex-col justify-between select-none [transform-style:preserve-3d]"
              >
                {/* Front Side */}
                <div
                  className={`flex flex-col justify-between h-full ${
                    isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  } transition-opacity duration-200`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold flex items-center gap-1.5">
                      <Sparkles size={13} /> Prompt / Concept
                    </span>
                    <span className="text-[11px] text-slate-500">Click to reveal answer</span>
                  </div>
                  <div className="my-auto py-8">
                    <h2 className="font-bold text-2xl sm:text-3xl text-white leading-snug text-center tracking-tight">
                      {currentCard?.front}
                    </h2>
                  </div>
                  <div className="text-center text-xs text-slate-400">
                    Click card to flip ↷
                  </div>
                </div>

                {/* Back Side */}
                <div
                  className={`absolute inset-0 p-8 flex flex-col justify-between rounded-2xl glass-panel bg-[#0d121c]/95 border border-amber-500/30 [transform:rotateY(180deg)] ${
                    !isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  } transition-opacity duration-200`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-1.5">
                      Explanation / Detail
                    </span>
                    <span className="text-[11px] text-slate-500">Click to flip back</span>
                  </div>
                  <div className="my-auto py-6">
                    <p className="text-base sm:text-lg text-slate-200 leading-relaxed text-center font-normal">
                      {currentCard?.back}
                    </p>
                  </div>
                  <div className="text-center text-xs text-slate-400">
                    Rate your recall below
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="btn-glass text-xs py-2.5 px-4 rounded-xl disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={markLearning}
                  className="flex items-center gap-2 text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <X size={15} /> Still learning
                </button>
                <button
                  onClick={markMastered}
                  className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Check size={15} /> Got it!
                </button>
              </div>

              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="btn-gold text-xs py-2.5 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <RotateCw size={14} /> Flip
              </button>
            </div>
          </div>
        ) : (
          /* Completion Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 glass-panel rounded-2xl p-10 border border-white/10"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
              <Sparkles size={32} />
            </div>
            <h2 className="font-bold text-3xl text-white mb-2 tracking-tight">
              Deck Complete! 🎉
            </h2>
            <p className="text-sm text-slate-300 mb-8">
              You mastered <strong className="text-emerald-400 font-bold">{masteredIds.size}</strong> out of{' '}
              <strong>{cards.length}</strong> cards in this deck.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center">
              {learningIds.size > 0 && (
                <button
                  onClick={reviewLearning}
                  className="btn-gold text-xs font-semibold py-3 px-5 rounded-xl cursor-pointer"
                >
                  Review {cards.length - masteredIds.size} missed cards
                </button>
              )}
              <button
                onClick={restartAll}
                className="btn-glass text-xs font-semibold py-3 px-5 rounded-xl cursor-pointer"
              >
                Restart Deck
              </button>
              <button
                onClick={() => navigate(`/documents/${id}`)}
                className="btn-glass text-xs font-medium py-3 px-5 rounded-xl cursor-pointer"
              >
                Back to Document
              </button>
            </div>
          </motion.div>
        )}
      </div>
  );
}



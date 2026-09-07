import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  UploadCloud,
  Wand2,
  LayoutGrid,
  HelpCircle,
  FileText,
  ArrowRight,
  Layers,
  Zap,
  ShieldCheck
} from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import StatusDot from '../components/StatusDot';

const EASE = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
};

const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};

const fadeRight = {
  hidden: { opacity: 0, x: 28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: EASE } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } }
};

const steps = [
  {
    icon: UploadCloud,
    title: 'Upload your material',
    body: 'Drop in a PDF, DOCX, or a pasted transcript — lecture notes, textbook chapters, anything you need to learn.'
  },
  {
    icon: Wand2,
    title: 'StudyDeck reads it for you',
    body: 'The AI extracts the key ideas and structures them into a clear, skimmable summary in under a minute.'
  },
  {
    icon: LayoutGrid,
    title: 'Study your way',
    body: 'Review flashcards, run a practice quiz, or jump straight to the summary — pick whatever fits the next 10 minutes.'
  }
];

const features = [
  {
    icon: FileText,
    title: 'Instant summaries',
    body: 'Long transcripts condensed into the sections and takeaways that actually matter for the exam.'
  },
  {
    icon: Layers,
    title: 'Auto-generated flashcards',
    body: 'Every document becomes a flippable deck, ready for quick recall practice between classes.'
  },
  {
    icon: HelpCircle,
    title: 'Practice quizzes',
    body: 'Choose how many questions you want and get graded practice built directly from your own notes.'
  },
  {
    icon: ShieldCheck,
    title: 'Your documents, private',
    body: 'Everything you upload stays tied to your account — nothing is shared or used to train anything else.'
  }
];

const previewDocs = [
  { title: 'Cognitive Psychology — Ch. 6', qs: 8, status: 'done' },
  { title: 'Organic Chemistry Lab Notes', qs: 5, status: 'processing' },
  { title: 'Macroeconomics Midterm Review', qs: 12, status: 'done' }
];

export default function Landing() {
  const heroRef = useRef(null);
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 80], ['rgba(9,10,13,0)', 'rgba(9,10,13,0.9)']);
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(32,35,42,0)', 'rgba(32,35,42,1)']);
  const previewY = useTransform(scrollY, [0, 600], [0, -40]);

  return (
    <div className="relative min-h-screen bg-[#080b11] text-slate-100 overflow-x-hidden font-[var(--font-display)] selection:bg-amber-500/30 selection:text-amber-200">
      <AmbientBackground />

      {/* Nav */}
      <motion.header
        style={{ backgroundColor: navBg, borderColor: navBorder }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 py-5 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#080b11] rounded-[11px] flex items-center justify-center">
                <BookOpen size={18} className="text-amber-400" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">StudyDeck</span>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <Link
              to="/pricing"
              className="text-sm font-medium text-slate-300 hover:text-amber-400 transition-colors px-3 py-2"
            >
              Pricing
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <motion.div whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="btn-gold block text-sm font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/20"
              >
                Sign up
              </Link>
            </motion.div>
          </motion.nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 pt-20 sm:pt-28 pb-28 sm:pb-36 grid lg:grid-cols-2 gap-16 lg:gap-20 items-center"
      >
        {/* Floating decorative icons */}
        <motion.div
          className="hidden lg:flex absolute -top-6 left-[46%] w-10 h-10 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 items-center justify-center text-cyan-300"
          animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Layers size={16} />
        </motion.div>
        <motion.div
          className="hidden lg:flex absolute top-24 left-[38%] w-8 h-8 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 items-center justify-center text-indigo-300"
          animate={{ y: [0, 12, 0], rotate: [0, -8, 0] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <HelpCircle size={14} />
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.span
            variants={fadeUp}
            className="relative inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1.5 mb-7 overflow-hidden"
          >
            <motion.span
              className="absolute inset-0 bg-amber-400/20 rounded-full"
              animate={{ opacity: [0.15, 0.4, 0.15] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <Sparkles size={12} className="relative" />
            <span className="relative">AI study workspace</span>
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white leading-[1.12] mb-6"
          >
            Turn lecture notes into
            <br />
            study decks that actually stick.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-slate-400 text-base leading-relaxed max-w-md mb-10">
            Upload a PDF, a DOCX, or a raw transcript. StudyDeck reads it and hands you a clean summary,
            flashcards, and a practice quiz — so you spend your time studying, not organizing.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="btn-gold flex items-center gap-2 text-sm font-semibold py-3.5 px-7 rounded-xl shadow-lg shadow-amber-500/20"
              >
                Get started free
                <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
                  <ArrowRight size={16} />
                </motion.span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/login"
                className="btn-glass flex items-center gap-2 text-sm font-medium py-3.5 px-7 rounded-xl"
              >
                I already have an account
              </Link>
            </motion.div>
          </motion.div>

          <motion.p variants={fadeUp} className="text-xs text-slate-500 mt-7">
            No credit card required · Supports PDF, DOCX, and TXT
          </motion.p>
        </motion.div>

        {/* Product preview */}
        <motion.div
          style={{ y: previewY }}
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-2xl p-6 shadow-2xl bg-[#111317] border border-[#23262e]"
          >
            <div className="flex items-center justify-between mb-5 px-1">
              <span className="text-xs font-semibold text-slate-300">Your Documents</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                3 saved
              </span>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="flex flex-col gap-3"
            >
              {previewDocs.map((doc) => (
                <motion.div
                  key={doc.title}
                  variants={fadeUp}
                  whileHover={{ y: -2, borderColor: 'rgba(251,191,36,0.35)' }}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-[#181a20] border border-[#23262e] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#181a20] border border-amber-500/30 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{doc.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{doc.qs} quiz questions</p>
                    </div>
                  </div>
                  <StatusDot status={doc.status} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 py-24 sm:py-28 border-t border-[#20232a] bg-[#0c0d12]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="text-center mb-16 max-w-lg mx-auto"
        >
          <motion.span
            variants={fadeUp}
            className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/25 mb-4"
          >
            How it works
          </motion.span>
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
            From raw notes to a study session in three steps
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-sm leading-relaxed">
            No formatting, no manual flashcard writing. StudyDeck does the setup so you can start reviewing.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="grid sm:grid-cols-3 gap-6"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              variants={scaleIn}
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="relative p-7 rounded-2xl bg-[#111317] border border-[#23262e] hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-3xl font-black text-amber-400/20 font-mono leading-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <motion.div
                  whileHover={{ rotate: 8, scale: 1.08 }}
                  className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center"
                >
                  <step.icon size={17} />
                </motion.div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-2.5">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 py-24 sm:py-28 border-t border-[#20232a]">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-10 items-start">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeLeft}
            className="max-w-sm lg:sticky lg:top-28"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/25 mb-4">
              Core capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
              Everything you need to actually retain it
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              StudyDeck isn't just a summarizer — it builds the tools you'd normally spend hours making
              yourself.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid sm:grid-cols-2 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={i % 2 === 0 ? fadeLeft : fadeRight}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="p-6 rounded-2xl bg-[#111317] border border-[#23262e] hover:border-amber-500/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mb-4">
                  <f.icon size={15} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 py-24 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative rounded-3xl px-8 sm:px-16 py-16 sm:py-20 text-center overflow-hidden bg-gradient-to-b from-[#161822] to-[#101217] border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.1)]"
        >
          <motion.div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-amber-500/15 blur-[110px] pointer-events-none"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center mx-auto mb-7"
          >
            <Zap size={22} />
          </motion.div>
          <h2 className="relative text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
            Your next study session starts here
          </h2>
          <p className="relative text-slate-400 text-sm max-w-md mx-auto mb-9">
            Upload your first document and have a summary, flashcards, and a quiz ready in under a minute.
          </p>
          <motion.div
            className="relative inline-block"
            whileHover={{ y: -3, scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              to="/register"
              className="btn-gold inline-flex items-center gap-2 text-sm font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-amber-500/20"
            >
              Get started free <ArrowRight size={16} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-8 py-10 border-t border-[#20232a] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <BookOpen size={14} className="text-amber-400" /> StudyDeck
        </div>
        <p className="text-xs text-slate-500">Built for students who'd rather study than format notes.</p>
      </footer>
    </div>
  );
}
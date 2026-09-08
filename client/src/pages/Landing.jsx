import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  UploadCloud,
  Wand2,
  Brain,
  Download,
  FileText,
  ArrowRight,
  Zap,
  CheckCircle2,
  Menu,
  X,
  Mail
} from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import StatusDot from '../components/StatusDot';

function LinkedinIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const EASE = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } }
};

const features = [
  {
    icon: UploadCloud,
    title: 'Upload Any Format',
    description: 'Import lecture notes, slides, PDFs, Word documents, or raw text transcripts directly into your workspace.'
  },
  {
    icon: Zap,
    title: 'Live AI Processing',
    description: 'Watch real-time SSE progress updates as Gemini reads, classifies, and synthesizes your study material.'
  },
  {
    icon: Brain,
    title: 'Auto-Generated Quizzes & Cards',
    description: 'Instantly get custom multiple-choice quizzes and active recall flashcards tailored to your specific material.'
  },
  {
    icon: Download,
    title: 'Executive Summaries & Action Items',
    description: 'Get key takeaways, structured concepts, and automatically extracted assignment deadlines in one clean view.'
  }
];

const steps = [
  {
    step: '01',
    icon: UploadCloud,
    title: 'Upload Material',
    description: 'Drop in your PDF, DOCX, or paste lecture text.'
  },
  {
    step: '02',
    icon: Wand2,
    title: 'AI Processing',
    description: 'Gemini analyzes text & extracts key concepts live.'
  },
  {
    step: '03',
    icon: FileText,
    title: 'Review Insights',
    description: 'Read the summary, action items, & key takeaways.'
  },
  {
    step: '04',
    icon: Brain,
    title: 'Practice & Master',
    description: 'Test yourself with practice quizzes & flashcards.'
  }
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // SEO Metadata management
  useEffect(() => {
    const origTitle = document.title;
    document.title = 'StudyDeck — Turn Notes into Summaries, Quizzes & Action Items';

    const metaTags = [
      { name: 'description', content: 'Transform messy lecture notes, PDFs, and transcripts into clear summaries, actionable tasks, practice quizzes, and active recall flashcards instantly with AI.' },
      { property: 'og:title', content: 'StudyDeck — AI Study Workspace' },
      { property: 'og:description', content: 'Turn notes into summaries, quizzes & action items with AI.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: '/favicon.svg' }
    ];

    const createdElements = [];
    metaTags.forEach(({ name, property, content }) => {
      let el = document.querySelector(name ? `meta[name="${name}"]` : `meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (name) el.setAttribute('name', name);
        if (property) el.setAttribute('property', property);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute('content', content);
    });

    return () => {
      document.title = origTitle;
      createdElements.forEach((el) => el.remove());
    };
  }, []);

  // Sticky Nav Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-ink text-slate-100 overflow-x-hidden font-[var(--font-display)] selection:bg-amber-500/30 selection:text-amber-200">
      <AmbientBackground />

      {/* 1. NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#080b11]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
              <div className="w-full h-full bg-ink rounded-[11px] flex items-center justify-center">
                <BookOpen size={19} className="text-amber-400" />
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white font-serif">StudyDeck</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              About
            </a>
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, 'how-it-works')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              How it works
            </a>
            <a
              href="#contact"
              onClick={(e) => scrollToSection(e, 'contact')}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Contact
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Login
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="btn-gold text-sm font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-amber-500/20 inline-block"
              >
                Sign Up
              </Link>
            </motion.div>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-ink/98 backdrop-blur-2xl md:hidden pt-24 px-6 flex flex-col justify-between pb-12"
          >
            <div className="flex flex-col gap-6 text-lg font-medium">
              <a
                href="#about"
                onClick={(e) => scrollToSection(e, 'about')}
                className="text-slate-200 hover:text-amber-400 transition-colors border-b border-white/10 pb-3"
              >
                About
              </a>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, 'features')}
                className="text-slate-200 hover:text-amber-400 transition-colors border-b border-white/10 pb-3"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, 'how-it-works')}
                className="text-slate-200 hover:text-amber-400 transition-colors border-b border-white/10 pb-3"
              >
                How it works
              </a>
              <a
                href="#contact"
                onClick={(e) => scrollToSection(e, 'contact')}
                className="text-slate-200 hover:text-amber-400 transition-colors border-b border-white/10 pb-3"
              >
                Contact
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-glass text-center py-3 rounded-xl font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-gold text-center py-3 rounded-xl font-semibold shadow-lg shadow-amber-500/20"
              >
                Sign Up Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-32 sm:pt-40 pb-20 sm:pb-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-3.5 py-1.5 mb-6">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>AI-Powered Study Workspace</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6"
          >
            Turn messy notes into <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500">summaries, quizzes & action items</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mb-9 font-[var(--font-body)]">
            Upload PDFs, lecture slides, or transcripts. StudyDeck automatically extracts executive summaries, assigns actionable follow-ups, and builds active recall practice sets in seconds.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                to="/register"
                className="btn-gold flex items-center gap-2 text-base font-semibold py-3.5 px-7 rounded-xl shadow-xl shadow-amber-500/20"
              >
                Get Started Free <ArrowRight size={18} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, 'how-it-works')}
                className="btn-glass flex items-center gap-2 text-base font-medium py-3.5 px-7 rounded-xl cursor-pointer"
              >
                See how it works
              </a>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-6 mt-8 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-amber-400" /> Supports PDF, DOCX, TXT</span>
          </motion.div>
        </motion.div>

        {/* Live SSE Status Flow Mockup / Interactive Visual Anchor */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-2xl p-6 bg-paper border border-glass-border shadow-2xl backdrop-blur-xl">
            {/* Header Mock */}
            <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <FileText size={16} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Distributed_Systems_Lec4.pdf</h4>
                  <p className="text-[11px] text-slate-400">Uploaded just now · 14.2 KB</p>
                </div>
              </div>
              <StatusDot status="done" />
            </div>

            {/* Simulated Workspace Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2 text-xs">
              {['summary', 'quiz', 'flashcards'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                    activeTab === tab ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Preview Content */}
            <div className="min-h-[180px] bg-ink/60 rounded-xl p-4 border border-white/5 text-xs">
              {activeTab === 'summary' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold uppercase tracking-wider">
                    <span>Executive Summary</span>
                    <span className="text-slate-500 font-normal">Gemini 2.5 Flash</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    This lecture covers consensus protocols in distributed systems, focusing on Raft leader election, log replication, and safety guarantees.
                  </p>
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Key Action Item:</span>
                    <p className="text-amber-200 mt-0.5">· Review state machine replication diagrams before Thursday's lab.</p>
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="space-y-2.5">
                  <p className="text-slate-200 font-medium">Q: Which condition triggers a new election round in Raft?</p>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-medium">
                      ✓ Heartbeat timeout elapses without receiving leader contact
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-slate-400">
                      ✗ Client disconnects from primary server node
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold block mb-1">Flashcard 1 of 6</span>
                  <p className="text-sm font-semibold text-white mb-2">What is Split Vote?</p>
                  <p className="text-xs text-slate-300">Occurs when candidate votes are divided equally, triggering randomized election timeouts to resolve ties.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. FEATURES */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-24 border-t border-white/10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={fadeUp} className="text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
            Powerful Features
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight mt-4 mb-4">
            Everything you need for active recall & mastery
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-sm sm:text-base">
            Stop spending hours re-typing lecture notes. StudyDeck extracts structure and generates active learning tools automatically.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid md:grid-cols-2 gap-6"
        >
          {features.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="p-7 rounded-2xl bg-paper border border-glass-border hover:border-amber-500/40 transition-all shadow-xl"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 text-amber-400">
                <item.icon size={20} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 py-24 border-t border-white/10 bg-[#0c0e14]/60">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={fadeUp} className="text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
            Simple Workflow
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight mt-4 mb-4">
            How StudyDeck Transforms Your Learning
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-400 text-sm sm:text-base">
            From raw input to active recall study deck in 4 effortless steps.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((s) => (
            <motion.div
              key={s.step}
              variants={fadeUp}
              className="relative p-6 rounded-2xl bg-paper border border-glass-border flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black font-mono text-amber-500/30">{s.step}</span>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <s.icon size={18} />
                  </div>
                </div>
                <h4 className="text-base font-bold text-white mb-2">{s.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 5. ABOUT */}
      <section id="about" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-24 border-t border-white/10 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="space-y-6"
        >
          <motion.span variants={fadeUp} className="text-xs font-semibold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
            About StudyDeck
          </motion.span>
          <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Built for Students Who Want to Learn, Not Format
          </motion.h2>
          <motion.p variants={fadeUp} className="text-slate-300 text-base leading-relaxed max-w-2xl mx-auto">
            StudyDeck was designed for college students, researchers, and lifelong learners overwhelmed by lengthy transcripts and slide decks. Powered by advanced Gemini AI models, StudyDeck converts static reading materials into active study tools so you retain more in less time.
          </motion.p>
        </motion.div>
      </section>

      {/* 6. CONTACT */}
      <section id="contact" className="relative z-10 max-w-4xl mx-auto px-5 sm:px-8 py-20 border-t border-white/10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-paper to-ink border border-amber-500/30 text-center shadow-2xl"
        >
          <motion.h3 variants={fadeUp} className="font-serif text-2xl sm:text-3xl font-bold text-white mb-3">
            Have Questions or Feedback?
          </motion.h3>
          <motion.p variants={fadeUp} className="text-slate-400 text-sm max-w-md mx-auto mb-8">
            We’d love to hear how StudyDeck is helping your studies or answer any questions you have.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:support@studydeck.app"
              className="btn-gold inline-flex items-center gap-2 text-sm font-semibold py-3 px-6 rounded-xl shadow-lg shadow-amber-500/20"
            >
              <Mail size={16} /> Contact Support
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* 7. FOOTER */}
      <footer className="relative z-10 bg-ink border-t border-white/10 pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1 */}
            <div className="col-span-2 md:col-span-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <BookOpen size={15} className="text-amber-400" />
                </div>
                <span className="font-serif font-bold text-white text-base">StudyDeck</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Transforming reading materials into active study decks with AI.
              </p>
              <p className="text-xs text-slate-500 font-mono">© 2026 StudyDeck</p>
            </div>

            {/* Col 2: Product */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Product</h5>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-amber-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-amber-400 transition-colors">How it works</a></li>
                <li><Link to="/pricing" className="hover:text-amber-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Company</h5>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="hover:text-amber-400 transition-colors">About Us</a></li>
                <li><a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} className="hover:text-amber-400 transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Col 4: Legal & Social */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Legal</h5>
              <ul className="space-y-2.5 text-xs text-slate-400 mb-4">
                <li><span className="hover:text-amber-400 transition-colors cursor-pointer">Privacy Policy</span></li>
                <li><span className="hover:text-amber-400 transition-colors cursor-pointer">Terms of Service</span></li>
              </ul>
              <div className="flex items-center text-slate-400">
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-amber-400 transition-colors inline-flex items-center gap-1.5" aria-label="LinkedIn">
                  <LinkedinIcon size={16} />
                  <span className="text-xs">LinkedIn</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
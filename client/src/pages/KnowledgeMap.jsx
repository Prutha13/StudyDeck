import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  BookOpen,
  Cpu,
  GitFork,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Flame,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DocumentFilter from '../components/DocumentFilter';
import * as api from '../api/client';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, ease: [0.16, 1, 0.3, 1] } }
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
};

export default function KnowledgeMap() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedDocument, setSelectedDocument] = useState(searchParams.get('documentId') || 'all');
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'struggling' | 'improving' | 'mastered'
  const [refreshing, setRefreshing] = useState(false);

  async function loadKnowledgeMap(docId = selectedDocument) {
    try {
      const data = await api.getKnowledgeMap(token, docId);
      setMapData(data);
    } catch (err) {
      console.error('Failed to load knowledge map:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadKnowledgeMap(selectedDocument);
  }, [token, selectedDocument]);

  function handleRefresh() {
    setRefreshing(true);
    loadKnowledgeMap(selectedDocument);
  }

  // Filter subjects/topics/concepts based on search and status filter
  const filteredSubjects = (mapData?.subjects || []).map((subject) => {
    const matchingTopics = (subject.topics || []).map((topic) => {
      const matchingConcepts = (topic.concepts || []).filter((concept) => {
        const matchesQuery =
          !searchQuery ||
          concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          concept.definition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          topic.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          selectedFilter === 'all' ||
          (selectedFilter === 'struggling' && (concept.mastery?.status === 'struggling' || (concept.mastery?.score < 50 && concept.mastery?.attempts > 0))) ||
          (selectedFilter === 'improving' && (concept.mastery?.status === 'improving' || (concept.mastery?.score >= 50 && concept.mastery?.score < 80))) ||
          (selectedFilter === 'mastered' && (concept.mastery?.status === 'mastered' || concept.mastery?.score >= 80));

        return matchesQuery && matchesStatus;
      });

      return { ...topic, concepts: matchingConcepts };
    }).filter((topic) => topic.concepts.length > 0 || (!searchQuery && selectedFilter === 'all'));

    return { ...subject, topics: matchingTopics };
  }).filter((subject) => subject.topics.length > 0);

  const stats = mapData?.overallStats || {
    overallScore: 0,
    totalConcepts: 0,
    masteredCount: 0,
    improvingCount: 0,
    strugglingCount: 0
  };

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Network size={18} />
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-white tracking-tight">
              Student Knowledge Map
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time concept mastery tracking, prerequisite graphs, and learning progress.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => navigate('/fix-weakness')}
            className="btn-gold flex items-center gap-2 text-xs py-2 px-4 rounded-xl cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.98]"
          >
            <Flame size={14} /> Fix Weakness
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-glass flex items-center gap-2 text-xs py-2 px-3.5 rounded-xl cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-amber-400' : 'text-slate-400'} />
            Refresh Map
          </button>
        </div>
      </div>

      {/* Document Selector Filter */}
      <DocumentFilter selected={selectedDocument} onChange={setSelectedDocument} />

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Overall Mastery Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Overall Mastery</span>
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{stats.overallScore}%</span>
            <span className="text-xs text-slate-400">across {stats.totalConcepts} concepts</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-white/10 mt-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
              style={{ width: `${Math.max(4, stats.overallScore)}%` }}
            />
          </div>
        </div>

        {/* Mastered Card */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === 'mastered' ? 'all' : 'mastered')}
          className={`glass-card rounded-2xl p-5 cursor-pointer transition-all ${
            selectedFilter === 'mastered' ? 'border-emerald-500/60 bg-emerald-500/10' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Mastered</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">{stats.masteredCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Score ≥ 80% with confidence</div>
        </div>

        {/* Improving Card */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === 'improving' ? 'all' : 'improving')}
          className={`glass-card rounded-2xl p-5 cursor-pointer transition-all ${
            selectedFilter === 'improving' ? 'border-amber-500/60 bg-amber-500/10' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Improving</span>
            <TrendingUp size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">{stats.improvingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Score 50% – 79%</div>
        </div>

        {/* Struggling / Weak Areas Card */}
        <div
          onClick={() => setSelectedFilter(selectedFilter === 'struggling' ? 'all' : 'struggling')}
          className={`glass-card rounded-2xl p-5 cursor-pointer transition-all ${
            selectedFilter === 'struggling' ? 'border-rose-500/60 bg-rose-500/10' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Needs Revision</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-300">{stats.strugglingCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Score &lt; 50% or recent mistakes</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts, topics, or definitions…"
            className="glass-input w-full pl-11 pr-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'mastered', label: 'Mastered 🟢' },
            { id: 'improving', label: 'Improving 🟡' },
            { id: 'struggling', label: 'Needs Focus 🔴' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 glass-panel rounded-2xl animate-pulse bg-white/5" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen size={22} />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            {searchQuery || selectedFilter !== 'all' ? 'No matching concepts found' : 'No knowledge map generated yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            {searchQuery || selectedFilter !== 'all'
              ? 'Try changing your search keywords or resetting filters.'
              : 'Upload study material or lecture notes to automatically extract topics, concepts, and track your personalized mastery.'}
          </p>
          {searchQuery || selectedFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="btn-glass text-xs font-medium py-2 px-4 rounded-xl cursor-pointer"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard?new=1')}
              className="btn-gold text-xs font-semibold py-2.5 px-5 rounded-xl cursor-pointer"
            >
              Upload Material
            </button>
          )}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
          {filteredSubjects.map((subject) => (
            <motion.div key={subject._id} variants={item} className="space-y-4">
              {/* Subject Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {subject.name}
                    </h2>
                    {subject.description && (
                      <p className="text-xs text-slate-400">{subject.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2">Subject Mastery:</span>
                    <span className="text-sm font-bold text-amber-300">{subject.averageMastery || 0}%</span>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${Math.max(4, subject.averageMastery || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Topics Grid */}
              <div className="space-y-4">
                {subject.topics?.map((topic) => (
                  <div
                    key={topic._id}
                    className="glass-panel rounded-2xl p-6 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Cpu size={16} className="text-amber-400" />
                        <h3 className="text-sm font-semibold text-white">{topic.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Topic score:</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            (topic.averageMastery || 0) >= 80
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : (topic.averageMastery || 0) >= 50
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                          }`}
                        >
                          {topic.averageMastery || 0}%
                        </span>
                      </div>
                    </div>

                    {/* Concepts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {topic.concepts?.map((concept) => {
                        const score = concept.mastery?.score || 0;
                        const status = concept.mastery?.status || 'unseen';

                        return (
                          <div
                            key={concept._id}
                            className="glass-card rounded-xl p-4 flex flex-col justify-between border border-white/5 hover:border-amber-500/30 transition-all"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-xs font-bold text-white group-hover:text-amber-300">
                                  {concept.name}
                                </h4>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    score >= 80
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                      : score >= 50
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                      : concept.mastery?.attempts > 0
                                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                      : 'bg-white/5 border-white/10 text-slate-400'
                                  }`}
                                >
                                  {score}% {score >= 80 ? '🟢' : score >= 50 ? '🟡' : concept.mastery?.attempts > 0 ? '🔴' : '⚪'}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full h-1 rounded-full bg-white/10 mb-2.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    score >= 80
                                      ? 'bg-emerald-400'
                                      : score >= 50
                                      ? 'bg-amber-400'
                                      : 'bg-rose-400'
                                  }`}
                                  style={{ width: `${Math.max(4, score)}%` }}
                                />
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
                                {concept.definition || concept.description}
                              </p>

                              {concept.keyTakeaway && (
                                <div className="text-[11px] text-amber-300/90 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2.5 py-1.5 mb-2.5">
                                  <span className="font-semibold">Key:</span> {concept.keyTakeaway}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-white/5 mt-1 space-y-1.5">
                              {concept.prerequisites && concept.prerequisites.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-400">
                                  <GitFork size={10} className="text-cyan-400" />
                                  <span className="text-slate-500">Prereq:</span>
                                  {concept.prerequisites.map((p) => (
                                    <span
                                      key={p._id || p}
                                      className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300"
                                    >
                                      {p.name || p}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                <span>{concept.mastery?.attempts || 0} practice attempts</span>
                                <span className="capitalize">{concept.difficulty} difficulty</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

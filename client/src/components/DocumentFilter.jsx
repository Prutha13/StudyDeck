import { useEffect, useState } from 'react';
import { Layers, FileText, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';

/**
 * DocumentFilter
 * Shared document selector for Knowledge Map, Daily Review, and Mistake Book.
 * Follows the dark "notebook" theme (bg-ink, bg-paper, amber accent tokens).
 */
export default function DocumentFilter({ selected = 'all', onChange, className = '' }) {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!token) return;

    api
      .fetchDocuments(token)
      .then((docs) => {
        if (mounted) {
          setDocuments(Array.isArray(docs) ? docs : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('DocumentFilter failed to load documents:', err.message);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  // If there's only 0 documents, don't show the filter
  if (!loading && documents.length === 0) {
    return null;
  }

  return (
    <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-thin scrollbar-thumb-white/10 max-w-full">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 mr-1 hidden md:inline">
          Scope:
        </span>

        {/* 'All Documents' Pill */}
        <button
          type="button"
          onClick={() => onChange?.('all')}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
            selected === 'all'
              ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
              : 'border-white/10 bg-[#181a20] text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          <Layers size={13} className={selected === 'all' ? 'text-amber-400' : 'text-slate-400'} />
          <span>All Documents</span>
          <span className="text-[10px] opacity-70 ml-0.5">({documents.length})</span>
        </button>

        {/* Per-document Pills */}
        {documents.map((doc) => {
          const isSelected = String(selected) === String(doc.id);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => onChange?.(String(doc.id))}
              title={doc.title}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all shrink-0 max-w-[200px] truncate cursor-pointer ${
                isSelected
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 font-semibold shadow-sm'
                  : 'border-white/10 bg-[#181a20] text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              <FileText size={12} className={isSelected ? 'text-amber-400 shrink-0' : 'text-slate-400 shrink-0'} />
              <span className="truncate">{doc.title}</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown for compact / mobile selector */}
      <div className="relative sm:hidden w-full">
        <select
          value={selected}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-[#181a20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
        >
          <option value="all">All Documents ({documents.length})</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}


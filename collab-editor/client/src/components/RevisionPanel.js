import React, { useEffect, useState } from 'react';
import { fetchRevisions } from '../utils/api';
import { Clock, RotateCcw, X, ChevronDown, ChevronRight } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

export default function RevisionPanel({ roomId, onRestore, onClose }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    fetchRevisions(roomId)
      .then((data) => setRevisions(data.revisions || []))
      .catch(() => setRevisions([]))
      .finally(() => setLoading(false));
  }, [roomId]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">History</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : revisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 px-4 text-center">
            <Clock size={28} className="mb-2 opacity-40" />
            <p className="text-sm font-medium">No revisions yet</p>
            <p className="text-xs mt-1">Edits will appear here as you type</p>
          </div>
        ) : (
          <div className="p-2">
            {revisions.map((rev, idx) => (
              <div key={rev._id || idx} className="mb-1">
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    expanded === idx ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                >
                  {expanded === idx ? (
                    <ChevronDown size={12} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={12} className="text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {rev.savedBy || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(rev.createdAt)}</p>
                  </div>
                  <span className="text-xs text-gray-300 shrink-0">{formatBytes(rev.size)}</span>
                </div>

                {expanded === idx && (
                  <div className="mx-2 mb-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 animate-fade-in">
                    <p className="text-xs text-gray-500 mb-2 line-clamp-3">
                      {/* Strip HTML for preview */}
                      {rev.content?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Empty'}…
                    </p>
                    <button
                      onClick={() => {
                        if (window.confirm('Restore this version? Current changes will be overwritten.')) {
                          onRestore(rev.content);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      <RotateCcw size={11} /> Restore this version
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

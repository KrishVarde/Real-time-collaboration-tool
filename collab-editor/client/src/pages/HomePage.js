import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus, FolderOpen, Upload, Clock, Users,
  ChevronRight, Trash2, Search, FileText, Zap
} from 'lucide-react';
import { fetchDocuments, createDocument, deleteDocument, uploadDocx } from '../utils/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function DocSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  // ── Load documents ─────────────────────────────────────────────────────────
  const loadDocs = async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents || []);
    } catch {
      setError('Failed to load documents. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  // ── Create new document ────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const data = await createDocument(newTitle || 'Untitled Document');
      navigate(`/doc/${data.document.roomId}`);
    } catch {
      setError('Failed to create document.');
      setCreating(false);
    }
  };

  // ── Join by room ID ────────────────────────────────────────────────────────
  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = joinInput.trim();
    if (!trimmed) return;
    // Accept full URL or bare roomId
    const roomId = trimmed.includes('/doc/') ? trimmed.split('/doc/')[1] : trimmed;
    navigate(`/doc/${roomId}`);
  };

  // ── Upload DOCX ────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadDocx(file);
      navigate(`/doc/${data.document.roomId}`);
    } catch {
      setError('Failed to parse DOCX. Make sure it is a valid .docx file.');
      setUploading(false);
    }
  };

  // ── Delete document ────────────────────────────────────────────────────────
  const handleDelete = async (roomId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    try {
      await deleteDocument(roomId);
      setDocuments((prev) => prev.filter((d) => d.roomId !== roomId));
    } catch {
      setError('Failed to delete document.');
    }
  };

  const filtered = documents.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">CollabDocs</span>
          </div>
          <span className="text-sm text-gray-500">Real-time collaborative editing</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center animate-fade-in">
            {error}
            <button onClick={() => setError('')} className="ml-4 font-bold hover:text-red-900">✕</button>
          </div>
        )}

        {/* ── Hero actions ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create new */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
              <FilePlus size={20} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">New Document</h2>
            <p className="text-sm text-gray-500 mb-4">Start fresh with a blank document</p>
            {showNewForm ? (
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Document title..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-indigo-600 text-white text-sm rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full bg-indigo-600 text-white text-sm rounded-lg py-2.5 hover:bg-indigo-700 transition-colors font-medium"
              >
                Create Document
              </button>
            )}
          </div>

          {/* Join existing */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <FolderOpen size={20} className="text-emerald-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Join Document</h2>
            <p className="text-sm text-gray-500 mb-4">Enter a Room ID or paste a link</p>
            <form onSubmit={handleJoin} className="space-y-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Room ID or URL…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="w-full bg-emerald-600 text-white text-sm rounded-lg py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
              >
                Join
              </button>
            </form>
          </div>

          {/* Upload DOCX */}
          <div
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={20} className="text-amber-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">Upload DOCX</h2>
            <p className="text-sm text-gray-500 mb-4">Import a Word document to edit</p>
            <div className="w-full border-2 border-dashed border-gray-200 rounded-lg py-4 text-center text-sm text-gray-400 group-hover:border-amber-400 group-hover:text-amber-500 transition-colors">
              {uploading ? 'Uploading…' : 'Click to browse .docx'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>

        {/* ── Document list ─────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <DocSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">{search ? 'No matching documents' : 'No documents yet'}</p>
              <p className="text-sm mt-1">Create or join a document to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((doc) => (
                <div
                  key={doc.roomId}
                  onClick={() => navigate(`/doc/${doc.roomId}`)}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group animate-slide-up"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                        {doc.title || 'Untitled Document'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {timeAgo(doc.updatedAt)}
                        </span>
                        {doc.activeUsers > 0 && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <Users size={11} /> {doc.activeUsers} online
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1.5 font-mono truncate">{doc.roomId}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDelete(doc.roomId, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

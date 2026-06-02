import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCollaboration } from '../hooks/useCollaboration';
import { useDebounce } from '../hooks/useDebounce';
import { exportDocx } from '../utils/api';
import Toolbar from '../components/Toolbar';
import UserAvatars from '../components/UserAvatars';
import TypingIndicator from '../components/TypingIndicator';
import RevisionPanel from '../components/RevisionPanel';
import ConnectionBadge from '../components/ConnectionBadge';
import ShareModal from '../components/ShareModal';
import {
  ArrowLeft, Save, Download, History, Share2,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';

// Debounce delay for sending changes over socket (ms)
const SEND_DELAY = 250;
// Typing-stop delay (ms after last keystroke)
const TYPING_STOP_DELAY = 1500;

export default function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('Untitled Document');
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving | error
  const [showRevisions, setShowRevisions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isRemoteChange, setIsRemoteChange] = useState(false);

  const typingStopTimer = useRef(null);
  const isRemoteRef = useRef(false);

  // ── TipTap editor ─────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: { depth: 100 } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Skip emitting if this update came from a remote change
      if (isRemoteRef.current) return;
      const html = editor.getHTML();
      setSaveStatus('saving');
      debouncedSend(html);
      handleTypingActivity();
    },
  });

  // ── Collaboration hook ────────────────────────────────────────────────────
  const handleLoad = useCallback(({ content, title: t }) => {
    if (editor && content) {
      isRemoteRef.current = true;
      editor.commands.setContent(content, false);
      isRemoteRef.current = false;
    }
    if (t) setTitle(t);
  }, [editor]);

  const handleRemoteChange = useCallback(({ content }) => {
    if (!editor) return;
    isRemoteRef.current = true;
    editor.commands.setContent(content, false);
    isRemoteRef.current = false;
    setSaveStatus('saved');
  }, [editor]);

  const handleTitleChange = useCallback(({ title: t }) => {
    setTitle(t);
  }, []);

  const {
    user,
    roomUsers,
    typingUsers,
    joined,
    connected,
    sendChange,
    sendTitle,
    sendTypingStart,
    sendTypingStop,
  } = useCollaboration({ roomId, onLoad: handleLoad, onRemoteChange: handleRemoteChange, onTitleChange: handleTitleChange });

  // ── Debounced emit ────────────────────────────────────────────────────────
  const { debounced: debouncedSend } = useDebounce(
    (content) => {
      sendChange(content);
      setSaveStatus('saved');
    },
    SEND_DELAY
  );

  // ── Typing indicator logic ────────────────────────────────────────────────
  const handleTypingActivity = useCallback(() => {
    sendTypingStart();
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      sendTypingStop();
    }, TYPING_STOP_DELAY);
  }, [sendTypingStart, sendTypingStop]);

  // ── Title edit ────────────────────────────────────────────────────────────
  const handleTitleEdit = (e) => {
    const val = e.target.value;
    setTitle(val);
    sendTitle(val);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    window.open(exportDocx(roomId), '_blank');
  };

  // ── Cleanup typing timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    };
  }, []);

  // ── Save status icon ──────────────────────────────────────────────────────
  const SaveIcon = {
    saved: <CheckCircle size={14} className="text-emerald-500" />,
    saving: <Loader2 size={14} className="text-gray-400 animate-spin" />,
    error: <AlertCircle size={14} className="text-red-500" />,
  }[saveStatus];

  const SaveLabel = { saved: 'Saved', saving: 'Saving…', error: 'Error' }[saveStatus];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Title */}
          <input
            value={title}
            onChange={handleTitleEdit}
            className="flex-1 text-base font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 rounded-lg px-2 py-1 min-w-0 hover:bg-gray-50 transition-colors"
            placeholder="Untitled Document"
            maxLength={200}
          />

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
            {SaveIcon}
            <span>{SaveLabel}</span>
          </div>

          {/* Connection */}
          <ConnectionBadge connected={connected} joined={joined} />

          {/* Active users */}
          <UserAvatars users={roomUsers} currentUserId={user?.id} />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share document"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => setShowRevisions(!showRevisions)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showRevisions ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Revision history"
            >
              <History size={14} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export as DOCX"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Formatting toolbar ───────────────────────────────────────────────── */}
      {editor && <Toolbar editor={editor} />}

      {/* ── Main editor + sidebar ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor column */}
        <main className="flex-1 overflow-y-auto py-10 px-4">
          <div className="max-w-[816px] mx-auto">
            <div className="bg-white rounded-xl editor-paper min-h-[calc(100vh-200px)] p-12">
              {/* Typing indicator inside document */}
              {typingUsers.length > 0 && (
                <TypingIndicator users={typingUsers} />
              )}
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>

        {/* Revision panel */}
        {showRevisions && (
          <aside className="w-72 border-l border-gray-200 bg-white overflow-y-auto shrink-0">
            <RevisionPanel
              roomId={roomId}
              onRestore={(content) => {
                if (editor) {
                  isRemoteRef.current = true;
                  editor.commands.setContent(content, false);
                  isRemoteRef.current = false;
                  sendChange(content);
                }
              }}
              onClose={() => setShowRevisions(false)}
            />
          </aside>
        )}
      </div>

      {/* ── Room info footer ─────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 px-6 py-2 flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono truncate">Room: {roomId}</span>
        <span>{roomUsers.length} collaborator{roomUsers.length !== 1 ? 's' : ''}</span>
      </footer>

      {/* ── Share modal ──────────────────────────────────────────────────────── */}
      {showShare && (
        <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

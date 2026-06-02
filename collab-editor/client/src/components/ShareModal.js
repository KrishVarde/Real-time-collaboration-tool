import React, { useState } from 'react';
import { Copy, Check, X, Link } from 'lucide-react';

export default function ShareModal({ roomId, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/doc/${roomId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Link size={15} className="text-indigo-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Share Document</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Anyone with this link can view and edit this document in real-time.
        </p>

        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={copy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              copied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 font-medium mb-1">Room ID</p>
          <p className="text-xs font-mono text-gray-700 break-all">{roomId}</p>
        </div>
      </div>
    </div>
  );
}

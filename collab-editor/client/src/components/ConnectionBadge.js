import React from 'react';

export default function ConnectionBadge({ connected, joined }) {
  if (connected && joined) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        Live
      </div>
    );
  }
  if (connected && !joined) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
        Joining…
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-full shrink-0">
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
      Offline
    </div>
  );
}

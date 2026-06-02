import React, { useState } from 'react';

export default function UserAvatars({ users = [], currentUserId }) {
  const [tooltip, setTooltip] = useState(false);
  const MAX_SHOW = 4;
  const visible = users.slice(0, MAX_SHOW);
  const overflow = users.length - MAX_SHOW;

  if (users.length === 0) return null;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <div className="flex -space-x-2">
        {visible.map((u) => (
          <div
            key={u.socketId}
            title={u.name + (u.socketId === currentUserId ? ' (you)' : '')}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white shrink-0 shadow-sm"
            style={{ backgroundColor: u.color || '#6366f1' }}
          >
            {(u.name || 'A')[0].toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
            +{overflow}
          </div>
        )}
      </div>

      {/* Tooltip with full user list */}
      {tooltip && users.length > 0 && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg p-2 z-50 animate-fade-in">
          <p className="text-xs font-semibold text-gray-500 uppercase px-2 pb-1 mb-1 border-b border-gray-50">
            Online ({users.length})
          </p>
          {users.map((u) => (
            <div key={u.socketId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: u.color || '#6366f1' }}
              >
                {(u.name || 'A')[0].toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 truncate">
                {u.name}
                {u.socketId === currentUserId && (
                  <span className="text-xs text-gray-400 ml-1">(you)</span>
                )}
              </span>
              <span className="ml-auto w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

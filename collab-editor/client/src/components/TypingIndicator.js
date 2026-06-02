import React from 'react';

export default function TypingIndicator({ users = [] }) {
  if (users.length === 0) return null;

  const names = users.map((u) => u.user?.name || 'Someone');
  let label;
  if (names.length === 1) label = `${names[0]} is typing…`;
  else if (names.length === 2) label = `${names[0]} and ${names[1]} are typing…`;
  else label = `${names[0]} and ${names.length - 1} others are typing…`;

  return (
    <div className="flex items-center gap-2 mb-3 animate-fade-in">
      <div className="flex gap-0.5 items-end">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400 italic">{label}</span>
    </div>
  );
}

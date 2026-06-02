import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

// Assign a random color to each collaborator
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6',
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomName() {
  const adjectives = ['Swift', 'Bright', 'Calm', 'Bold', 'Kind'];
  const nouns = ['Panda', 'Fox', 'Eagle', 'Wolf', 'Otter'];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

/**
 * Encapsulates all real-time collaboration state and event wiring.
 *
 * @param {string} roomId   - the document room to join
 * @param {Function} onLoad - called with { content, title } when server sends initial doc
 * @param {Function} onRemoteChange - called with { content } from remote edits
 * @param {Function} onTitleChange  - called with { title } from remote title edits
 */
export function useCollaboration({ roomId, onLoad, onRemoteChange, onTitleChange }) {
  const { socket, connected } = useSocket();

  // ── Local user identity (stable across re-renders) ────────────────────────
  const userRef = useRef({
    id: socket?.id || Math.random().toString(36).slice(2),
    name: randomName(),
    color: randomColor(),
  });

  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // [{socketId, user}]
  const [cursors, setCursors] = useState({});         // socketId → cursor data
  const [joined, setJoined] = useState(false);

  // Track whether the latest change was sent by us (to skip echo)
  const isSendingRef = useRef(false);

  // ── Join room once socket connects & roomId is known ─────────────────────
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    // Update user id now that socket is connected
    userRef.current.id = socket.id;

    socket.emit('join-room', { roomId, user: userRef.current });
    setJoined(true);

    return () => {
      socket.emit('leave-room', { roomId });
      setJoined(false);
    };
  }, [socket, connected, roomId]);

  // ── Inbound socket event handlers ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Server sends saved document state on join
    const handleLoad = ({ content, title }) => {
      onLoad?.({ content, title });
    };

    // Remote peer changed the document
    const handleReceiveChanges = ({ content, socketId }) => {
      if (socketId === socket.id) return; // ignore our own echo
      onRemoteChange?.({ content });
    };

    // Remote peer changed the title
    const handleReceiveTitle = ({ title }) => {
      onTitleChange?.({ title });
    };

    // Room user list updated
    const handleRoomUsers = ({ users }) => {
      setRoomUsers(users);
    };

    // Typing indicator
    const handleUserTyping = ({ socketId, user, isTyping }) => {
      if (socketId === socket.id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          const exists = prev.find((u) => u.socketId === socketId);
          if (exists) return prev;
          return [...prev, { socketId, user }];
        }
        return prev.filter((u) => u.socketId !== socketId);
      });
    };

    // Remote cursor position
    const handleReceiveCursor = ({ socketId, user, cursor }) => {
      if (socketId === socket.id) return;
      setCursors((prev) => ({ ...prev, [socketId]: { user, cursor } }));
    };

    socket.on('load-document', handleLoad);
    socket.on('receive-changes', handleReceiveChanges);
    socket.on('receive-title', handleReceiveTitle);
    socket.on('room-users', handleRoomUsers);
    socket.on('user-typing', handleUserTyping);
    socket.on('receive-cursor', handleReceiveCursor);

    return () => {
      socket.off('load-document', handleLoad);
      socket.off('receive-changes', handleReceiveChanges);
      socket.off('receive-title', handleReceiveTitle);
      socket.off('room-users', handleRoomUsers);
      socket.off('user-typing', handleUserTyping);
      socket.off('receive-cursor', handleReceiveCursor);
    };
  }, [socket, onLoad, onRemoteChange, onTitleChange]);

  // ── Outbound emitters (memoized) ──────────────────────────────────────────

  const sendChange = useCallback(
    (content) => {
      if (!socket || !roomId) return;
      socket.emit('document-change', { roomId, content });
    },
    [socket, roomId]
  );

  const sendTitle = useCallback(
    (title) => {
      if (!socket || !roomId) return;
      socket.emit('title-change', { roomId, title });
    },
    [socket, roomId]
  );

  const sendTypingStart = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('typing-start', { roomId });
  }, [socket, roomId]);

  const sendTypingStop = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('typing-stop', { roomId });
  }, [socket, roomId]);

  const sendCursor = useCallback(
    (cursor) => {
      if (!socket || !roomId) return;
      socket.emit('cursor-move', { roomId, cursor });
    },
    [socket, roomId]
  );

  return {
    user: userRef.current,
    roomUsers,
    typingUsers,
    cursors,
    joined,
    connected,
    sendChange,
    sendTitle,
    sendTypingStart,
    sendTypingStop,
    sendCursor,
  };
}

const Document = require('../models/Document');

/**
 * ──────────────────────────────────────────────────────────────────────────
 * SOCKET.IO REAL-TIME SYNCHRONIZATION ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────────────
 *
 * How it works:
 *
 * 1. ROOMS: Each document has a unique roomId. When a user opens a document,
 *    the client calls socket.emit('join-room', { roomId, user }). The server
 *    adds the socket to that Socket.IO room (io.socketsJoin(roomId)).
 *
 * 2. BROADCASTING EDITS:
 *    - Client emits `document-change` with { roomId, content, delta } whenever
 *      the editor content changes (debounced on client to ~300ms).
 *    - Server receives it and immediately broadcasts `receive-changes` to ALL
 *      OTHER sockets in the same room (socket.to(roomId).emit).
 *    - The emitting client does NOT receive its own change back, preventing
 *      echo loops.
 *
 * 3. AUTO-SAVE:
 *    - Server-side per-room debounce (1500ms). Every `document-change` resets
 *      the timer. When it fires, content is written to MongoDB.
 *    - This means DB writes are batched even under heavy typing.
 *
 * 4. CURSOR TRACKING:
 *    - Clients emit `cursor-move` with position data.
 *    - Server rebroadcasts to room peers — pure relay, no DB write.
 *
 * 5. TYPING INDICATORS:
 *    - `typing-start` / `typing-stop` events relayed to room peers.
 *
 * 6. USER PRESENCE:
 *    - On join: broadcast updated user list to room.
 *    - On disconnect: remove user, broadcast updated list, update DB activeUsers.
 *
 * 7. CONFLICT AVOIDANCE:
 *    - The Tiptap editor on the client uses its own internal state.
 *    - Incoming `receive-changes` sets editor content only if it differs from
 *      current content (checked client-side), preventing unnecessary re-renders.
 *    - Because updates are full-content (not operational transforms), the last
 *      writer wins within the debounce window. For production, use Y.js/CRDT.
 * ──────────────────────────────────────────────────────────────────────────
 */

// In-memory maps for room state
const roomUsers = new Map();      // roomId → Map<socketId, user>
const saveTimers = new Map();     // roomId → NodeJS.Timeout

/**
 * Debounced save to MongoDB.
 * Resets on every edit within the room; fires after SAVE_DELAY ms of inactivity.
 */
const SAVE_DELAY = 1500; // ms

function scheduleSave(roomId, content, userName) {
  if (saveTimers.has(roomId)) {
    clearTimeout(saveTimers.get(roomId));
  }
  const timer = setTimeout(async () => {
    try {
      const doc = await Document.findOneAndUpdate(
        { roomId },
        {
          content,
          lastEditedBy: userName,
          $push: {
            revisions: {
              $each: [{ content, savedBy: userName, size: content.length }],
              $slice: -50, // keep only last 50 revisions
            },
          },
        },
        { new: true, upsert: false }
      );
      if (doc) {
        console.log(`💾 Auto-saved [${roomId}] (${content.length} chars)`);
      }
    } catch (err) {
      console.error(`❌ Auto-save failed [${roomId}]:`, err.message);
    }
    saveTimers.delete(roomId);
  }, SAVE_DELAY);

  saveTimers.set(roomId, timer);
}

/**
 * Build a plain user list array from the room's user map.
 */
function getRoomUserList(roomId) {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values());
}

/**
 * Initialize all Socket.IO event handlers.
 * @param {import('socket.io').Server} io
 */
function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId, user }) => {
      if (!roomId) return;

      // Leave any previous room this socket was in
      const prevRooms = [...socket.rooms].filter((r) => r !== socket.id);
      prevRooms.forEach((r) => leaveRoom(io, socket, r));

      // Join Socket.IO room
      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.currentUser = user || { id: socket.id, name: 'Anonymous', color: '#6366f1' };

      // Register user in room map
      if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
      roomUsers.get(roomId).set(socket.id, {
        socketId: socket.id,
        ...socket.currentUser,
      });

      // Update active user count in DB
      const userCount = roomUsers.get(roomId).size;
      try {
        await Document.findOneAndUpdate({ roomId }, { activeUsers: userCount });
      } catch (_) {}

      // Send current document state to the joining user
      try {
        const doc = await Document.findOne({ roomId });
        if (doc) {
          socket.emit('load-document', {
            content: doc.content,
            title: doc.title,
            roomId: doc.roomId,
          });
        } else {
          socket.emit('load-document', { content: '', title: 'Untitled Document', roomId });
        }
      } catch (err) {
        console.error('❌ load-document error:', err.message);
        socket.emit('load-document', { content: '', title: 'Untitled Document', roomId });
      }

      // Broadcast updated user list to everyone in room
      const userList = getRoomUserList(roomId);
      io.to(roomId).emit('room-users', { users: userList, count: userList.length });

      console.log(`👤 ${socket.currentUser.name} joined room [${roomId}] (${userCount} users)`);
    });

    // ── DOCUMENT CHANGE ──────────────────────────────────────────────────────
    // Relay edit to all peers; schedule debounced DB save
    socket.on('document-change', ({ roomId, content }) => {
      if (!roomId) return;
      // Broadcast to everyone else in the room
      socket.to(roomId).emit('receive-changes', { content, socketId: socket.id });
      // Schedule auto-save
      const userName = socket.currentUser?.name || 'Anonymous';
      scheduleSave(roomId, content, userName);
    });

    // ── TITLE CHANGE ─────────────────────────────────────────────────────────
    socket.on('title-change', async ({ roomId, title }) => {
      if (!roomId || !title) return;
      try {
        await Document.findOneAndUpdate({ roomId }, { title });
      } catch (_) {}
      socket.to(roomId).emit('receive-title', { title });
    });

    // ── CURSOR POSITION ──────────────────────────────────────────────────────
    socket.on('cursor-move', ({ roomId, cursor }) => {
      if (!roomId) return;
      socket.to(roomId).emit('receive-cursor', {
        socketId: socket.id,
        user: socket.currentUser,
        cursor,
      });
    });

    // ── TYPING INDICATORS ────────────────────────────────────────────────────
    socket.on('typing-start', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user-typing', {
        socketId: socket.id,
        user: socket.currentUser,
        isTyping: true,
      });
    });

    socket.on('typing-stop', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user-typing', {
        socketId: socket.id,
        user: socket.currentUser,
        isTyping: false,
      });
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const roomId = socket.currentRoom;
      if (roomId) leaveRoom(io, socket, roomId);
      console.log(`🔴 Socket disconnected: ${socket.id}`);
    });

    socket.on('leave-room', ({ roomId }) => {
      if (roomId) leaveRoom(io, socket, roomId);
    });
  });
}

/**
 * Remove a socket from a room and broadcast updated user list.
 */
async function leaveRoom(io, socket, roomId) {
  socket.leave(roomId);

  const users = roomUsers.get(roomId);
  if (users) {
    users.delete(socket.id);
    if (users.size === 0) {
      roomUsers.delete(roomId);
    }
  }

  const userList = getRoomUserList(roomId);
  io.to(roomId).emit('room-users', { users: userList, count: userList.length });

  // Broadcast that this user stopped typing
  io.to(roomId).emit('user-typing', {
    socketId: socket.id,
    user: socket.currentUser,
    isTyping: false,
  });

  // Update DB active user count
  try {
    await Document.findOneAndUpdate({ roomId }, { activeUsers: userList.length });
  } catch (_) {}
}

module.exports = { initializeSocket };

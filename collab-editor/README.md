# CollabDocs — Real-Time Collaborative Document Editor

A full-stack MERN application for real-time collaborative document editing, inspired by Google Docs.

## Features

- **Real-Time Collaboration** — Multiple users edit the same document simultaneously
- **Live Synchronization** — Changes broadcast instantly via Socket.IO
- **Active Users Display** — See collaborator avatars and names in the toolbar
- **Typing Indicators** — Animated dots when others are typing
- **Rich Text Editor** — TipTap-powered: Bold, Italic, Underline, Headings, Lists, Alignment, Links, Code
- **DOCX Import** — Upload `.docx` files parsed via Mammoth.js
- **DOCX Export** — Download your edited document as `.docx`
- **Auto-Save** — Debounced 1.5s auto-save to MongoDB
- **Revision History** — Browse and restore up to 50 previous versions per document
- **Shareable Links** — Share a room URL for instant access
- **Connection Status** — Live / Joining… / Offline badge
- **Document Management** — Create, list, search, and delete documents

---

## Project Structure

```
/
├── server/
│   ├── index.js                  # Express + Socket.IO entry point
│   ├── .env.example
│   ├── package.json
│   ├── models/
│   │   └── Document.js           # Mongoose schema (Documents + Revisions)
│   ├── routes/
│   │   └── documents.js          # REST API routes
│   ├── middleware/
│   │   └── error.js              # Central error handler
│   └── socket/
│       └── socketManager.js      # All Socket.IO event logic
│
└── client/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js                # Router
    │   ├── index.js              # React entry
    │   ├── index.css             # Tailwind + TipTap styles
    │   ├── context/
    │   │   └── SocketContext.js  # Single socket instance via Context
    │   ├── hooks/
    │   │   ├── useCollaboration.js  # All Socket.IO wiring
    │   │   └── useDebounce.js       # Reusable debounce hook
    │   ├── utils/
    │   │   └── api.js            # Axios API helpers
    │   ├── pages/
    │   │   ├── HomePage.js       # Document list + create/join/upload
    │   │   └── EditorPage.js     # Main editor view
    │   └── components/
    │       ├── Toolbar.js        # Formatting toolbar
    │       ├── UserAvatars.js    # Online collaborator avatars
    │       ├── TypingIndicator.js
    │       ├── ConnectionBadge.js
    │       ├── RevisionPanel.js  # History sidebar
    │       └── ShareModal.js     # Shareable link modal
    ├── package.json
    ├── tailwind.config.js
    └── .env.example
```

---

## Installation & Setup

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** running locally on port 27017 (or a MongoDB Atlas URI)

### 1. Clone / extract the project

```bash
# If starting fresh, create the folder structure as provided
cd collab-editor
```

### 2. Setup the Server

```bash
cd server
cp .env.example .env
# Edit .env if needed (default MongoDB is localhost:27017)
npm install
```

### 3. Setup the Client

```bash
cd ../client
cp .env.example .env
npm install
```

---

## Running the App

### Start MongoDB (if running locally)

```bash
mongod --dbpath /data/db
# or on macOS with Homebrew:
brew services start mongodb-community
```

### Start the Server

```bash
cd server
npm run dev       # development (nodemon)
# or
npm start         # production
```

Server runs on **http://localhost:5000**

### Start the Client

```bash
cd client
npm start
```

Client runs on **http://localhost:3000**

Open **http://localhost:3000** in your browser.

---

## Environment Variables

### `server/.env`

| Variable      | Default                                   | Description               |
| ------------- | ----------------------------------------- | ------------------------- |
| `PORT`        | `5000`                                    | Express server port       |
| `MONGODB_URI` | `mongodb://localhost:27017/collab-editor` | MongoDB connection string |
| `CLIENT_URL`  | `http://localhost:3000`                   | CORS allowed origin       |
| `NODE_ENV`    | `development`                             | Environment               |

### `client/.env`

| Variable               | Default                 | Description           |
| ---------------------- | ----------------------- | --------------------- |
| `REACT_APP_SERVER_URL` | `http://localhost:5000` | Backend REST API base |
| `REACT_APP_SOCKET_URL` | `http://localhost:5000` | Socket.IO server URL  |

---

## REST API Reference

| Method   | Endpoint                           | Description            |
| -------- | ---------------------------------- | ---------------------- |
| `GET`    | `/api/documents`                   | List all documents     |
| `POST`   | `/api/documents`                   | Create new document    |
| `GET`    | `/api/documents/:roomId`           | Get document by roomId |
| `PATCH`  | `/api/documents/:roomId/title`     | Update title           |
| `DELETE` | `/api/documents/:roomId`           | Delete document        |
| `GET`    | `/api/documents/:roomId/revisions` | Get revision history   |
| `POST`   | `/api/documents/upload/docx`       | Upload & parse DOCX    |
| `GET`    | `/api/documents/:roomId/export`    | Export as DOCX         |
| `GET`    | `/api/health`                      | Health check           |

---

## How Socket.IO Synchronization Works

### Architecture Overview

```
User A types              User B types
    │                         │
    ▼                         ▼
[TipTap Editor]          [TipTap Editor]
    │  onChange (debounced 250ms)
    │                         │
    ▼                         ▼
socket.emit('document-change') ──► Server receives
                                      │
                     socket.to(roomId).emit('receive-changes')
                                      │
                              ◄───────┘
                         All OTHER users in room
                              │
                              ▼
                         editor.commands.setContent()
```

### Event Flow

1. **Join Room** — `join-room` → server adds socket to room, sends saved content via `load-document`
2. **Edit** — `document-change` (debounced 250ms client-side) → server relays to peers via `receive-changes`
3. **Auto-Save** — server-side 1500ms debounce writes to MongoDB after edits settle
4. **Title Change** — `title-change` → relayed as `receive-title`
5. **Typing** — `typing-start` / `typing-stop` → relayed to peers, shown as animated dots
6. **Presence** — `room-users` broadcast on join/leave with full user list

### Conflict Strategy

The implementation uses **last-writer-wins** with client-side debouncing:

- Client debounces at 250ms — rapid keystrokes are batched into a single emit
- Server debounces DB writes at 1500ms — further reduces write pressure
- Incoming remote changes skip re-emitting (via `isRemoteRef`) — no echo loops
- For production-grade conflict resolution, integrate **Y.js** (CRDT) with TipTap's collaboration extension

---

## Key Dependencies

| Package            | Purpose                           |
| ------------------ | --------------------------------- |
| `socket.io`        | Real-time WebSocket communication |
| `mongoose`         | MongoDB ODM                       |
| `mammoth`          | DOCX → HTML conversion            |
| `html-to-docx`     | HTML → DOCX export                |
| `@tiptap/react`    | Rich text editor                  |
| `react-router-dom` | Client-side routing               |
| `tailwindcss`      | Utility-first CSS                 |
| `lucide-react`     | Icon set                          |

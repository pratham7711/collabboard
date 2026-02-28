import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT ?? 3001;

// ── Allowed origins ────────────────────────────────────────────────────────────
// In production, restrict this to your deployed frontend URL.
// In development or when CORS_ORIGIN is unset, allow any origin.
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

const httpServer = createServer((_req, res) => {
  // Simple health-check endpoint for Railway / Render uptime monitors
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'CollabBoard WebSocket Server' }));
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },

  // ── Keep-alive / heartbeat ─────────────────────────────────────────────────
  // Ping every 20s; if no pong arrives within 15s, disconnect the client.
  // This prevents ghost sockets from piling up after network drops.
  pingInterval: 20_000,
  pingTimeout: 15_000,

  // ── Reconnection helpers ───────────────────────────────────────────────────
  // Allow clients to re-use the same socket ID when reconnecting within 2 min.
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1_000,
    skipMiddlewares: true,
  },
});

/**
 * rooms: Map<boardId, { canvasJSON: string|null, users: Map<socketId, UserInfo> }>
 */
const rooms = new Map();

function getRoom(boardId) {
  if (!rooms.has(boardId)) {
    rooms.set(boardId, { canvasJSON: null, users: new Map() });
  }
  return rooms.get(boardId);
}

// ── Broadcast online users list to everyone in a room ─────────────────────────
function broadcastUsers(boardId) {
  const room = rooms.get(boardId);
  if (!room) return;
  const userList = [...room.users.values()];
  io.to(boardId).emit('users-update', userList);
}

// ── Clean up empty rooms to prevent memory leaks ──────────────────────────────
function cleanEmptyRoom(boardId) {
  const room = rooms.get(boardId);
  if (room && room.users.size === 0) {
    rooms.delete(boardId);
    console.log(`[room:${boardId}] cleaned up (empty)`);
  }
}

io.on('connection', (socket) => {
  let myBoardId = null;

  console.log(`[socket] connected: ${socket.id} (total: ${io.engine.clientsCount})`);

  // ── join-room ───────────────────────────────────────────────────────────────
  socket.on('join-room', ({ boardId, userId, userName, color }) => {
    // If already in a room, leave it first (handles re-join on reconnect)
    if (myBoardId && myBoardId !== boardId) {
      socket.leave(myBoardId);
      const prevRoom = rooms.get(myBoardId);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        broadcastUsers(myBoardId);
        cleanEmptyRoom(myBoardId);
      }
    }

    myBoardId = boardId;
    socket.join(boardId);
    const room = getRoom(boardId);
    room.users.set(socket.id, { userId, userName, color });

    // Collect other users already in the room (exclude self)
    const otherUsers = [...room.users.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([, u]) => u);

    // Send current board state + peer list to the new joiner
    socket.emit('room-state', {
      canvasJSON: room.canvasJSON,
      users: otherUsers,
    });

    // Broadcast updated user list to everyone in the room
    broadcastUsers(boardId);

    console.log(`[room:${boardId}] ${userName} joined  (peers: ${room.users.size})`);
  });

  // ── canvas-sync ─────────────────────────────────────────────────────────────
  socket.on('canvas-sync', ({ boardId, canvasJSON }) => {
    const room = getRoom(boardId);
    room.canvasJSON = canvasJSON;
    // Forward to all other peers in the same room
    socket.to(boardId).emit('canvas-sync', { canvasJSON });
  });

  // ── cursor-move ─────────────────────────────────────────────────────────────
  socket.on('cursor-move', ({ boardId, userId, x, y }) => {
    socket.to(boardId).emit('cursor-move', { userId, x, y });
  });

  // ── ping (explicit application-level ping for debugging) ─────────────────────
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') callback();
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    console.log(`[socket] disconnected: ${socket.id} (reason: ${reason})`);

    if (!myBoardId) return;
    const room = rooms.get(myBoardId);
    if (!room) return;

    const user = room.users.get(socket.id);
    room.users.delete(socket.id);

    if (user) {
      io.to(myBoardId).emit('user-left', { userId: user.userId });
      broadcastUsers(myBoardId);
      console.log(`[room:${myBoardId}] ${user.userName} left  (peers: ${room.users.size})`);
    }

    cleanEmptyRoom(myBoardId);
    myBoardId = null;
  });

  // ── error handling ───────────────────────────────────────────────────────────
  socket.on('error', (err) => {
    console.error(`[socket:${socket.id}] error:`, err.message);
  });
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully…`);
  io.close(() => {
    httpServer.close(() => {
      console.log('[server] closed');
      process.exit(0);
    });
  });
  // Force quit after 10s if graceful shutdown stalls
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

httpServer.listen(PORT, () => {
  console.log(`CollabBoard server  →  ws://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});

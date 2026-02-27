import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 3001;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('CollabBoard WebSocket Server\n');
});

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
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

io.on('connection', (socket) => {
  let myBoardId = null;

  // ── join-room ─────────────────────────────────────────────────────────────
  socket.on('join-room', ({ boardId, userId, userName, color }) => {
    myBoardId = boardId;
    socket.join(boardId);
    const room = getRoom(boardId);
    room.users.set(socket.id, { userId, userName, color });

    // Collect other users already in the room
    const otherUsers = [...room.users.entries()]
      .filter(([sid]) => sid !== socket.id)
      .map(([, u]) => u);

    // Send current board state + peer list to the new joiner
    socket.emit('room-state', {
      canvasJSON: room.canvasJSON,
      users: otherUsers,
    });

    // Tell everyone else a new user joined
    socket.to(boardId).emit('user-joined', { userId, userName, color });

    console.log(`[room:${boardId}] ${userName} joined  (peers: ${room.users.size})`);
  });

  // ── canvas-sync ───────────────────────────────────────────────────────────
  // Sent by a client whenever canvas changes; forwarded to all other peers.
  socket.on('canvas-sync', ({ boardId, canvasJSON }) => {
    const room = getRoom(boardId);
    room.canvasJSON = canvasJSON; // persist so late-joiners get full state
    socket.to(boardId).emit('canvas-sync', { canvasJSON });
  });

  // ── cursor-move ───────────────────────────────────────────────────────────
  socket.on('cursor-move', ({ boardId, userId, x, y }) => {
    socket.to(boardId).emit('cursor-move', { userId, x, y });
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!myBoardId) return;
    const room = rooms.get(myBoardId);
    if (!room) return;
    const user = room.users.get(socket.id);
    room.users.delete(socket.id);
    if (user) {
      io.to(myBoardId).emit('user-left', { userId: user.userId });
      console.log(`[room:${myBoardId}] ${user.userName} left  (peers: ${room.users.size})`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`CollabBoard server  →  ws://localhost:${PORT}`);
});

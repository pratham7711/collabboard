/**
 * Vercel Serverless Function — Socket.io adapter
 *
 * ⚠️  IMPORTANT LIMITATION:
 * Vercel serverless functions can run on multiple instances. Socket.IO's
 * polling transport makes multiple HTTP requests per session. If request N
 * hits a different instance than the one that created the session, the server
 * returns {"code":1,"message":"Session ID unknown"} and the client reconnects.
 *
 * This means live multi-user collaboration does NOT work reliably on Vercel
 * serverless. The client is configured to stop retrying after 5 attempts and
 * fall back to solo/offline mode.
 *
 * ✅ FIX: Deploy server.mjs to Railway (or Render) and set the
 *    VITE_SOCKET_URL environment variable in Vercel to its URL.
 *    See DEPLOYMENT.md for step-by-step instructions.
 *
 * This file is kept as a fallback for dev/demo purposes only.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';

const rooms = new Map();

function getRoom(boardId) {
  if (!rooms.has(boardId)) {
    rooms.set(boardId, { canvasJSON: null, users: new Map() });
  }
  return rooms.get(boardId);
}

function broadcastUsers(io, boardId) {
  const room = rooms.get(boardId);
  if (!room) return;
  const userList = [...room.users.values()];
  io.to(boardId).emit('users-update', userList);
}

// Singleton Socket.io server (cached across warm Vercel invocations on the
// SAME instance — does NOT persist across different instances)
let io;

function getIO() {
  if (!io) {
    const httpServer = createServer();

    io = new Server(httpServer, {
      path: '/api/socket',
      cors: { origin: '*', methods: ['GET', 'POST'] },
      // Polling only — Vercel serverless cannot upgrade to WebSocket
      transports: ['polling'],
      pingInterval: 25_000,
      pingTimeout: 20_000,
      // Do NOT enable connectionStateRecovery here — it causes issues when
      // different instances try to recover sessions they don't own
    });

    io.on('connection', (socket) => {
      let myBoardId = null;

      socket.on('join-room', ({ boardId, userId, userName, color }) => {
        if (myBoardId && myBoardId !== boardId) {
          socket.leave(myBoardId);
          const prevRoom = rooms.get(myBoardId);
          if (prevRoom) {
            prevRoom.users.delete(socket.id);
            broadcastUsers(io, myBoardId);
          }
        }
        myBoardId = boardId;
        socket.join(boardId);
        const room = getRoom(boardId);
        room.users.set(socket.id, { userId, userName, color });

        const otherUsers = [...room.users.entries()]
          .filter(([sid]) => sid !== socket.id)
          .map(([, u]) => u);

        socket.emit('room-state', { canvasJSON: room.canvasJSON, users: otherUsers });
        broadcastUsers(io, boardId);
      });

      socket.on('canvas-sync', ({ boardId, canvasJSON }) => {
        const room = getRoom(boardId);
        room.canvasJSON = canvasJSON;
        socket.to(boardId).emit('canvas-sync', { canvasJSON });
      });

      socket.on('cursor-move', ({ boardId, userId, x, y }) => {
        socket.to(boardId).emit('cursor-move', { userId, x, y });
      });

      socket.on('ping', (callback) => {
        if (typeof callback === 'function') callback();
      });

      socket.on('disconnect', () => {
        if (!myBoardId) return;
        const room = rooms.get(myBoardId);
        if (!room) return;
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        if (user) {
          io.to(myBoardId).emit('user-left', { userId: user.userId });
          broadcastUsers(io, myBoardId);
        }
        if (room.users.size === 0) rooms.delete(myBoardId);
        myBoardId = null;
      });

      socket.on('error', (err) => {
        console.error(`[socket:${socket.id}] error:`, err?.message ?? err);
      });
    });

    httpServer.listen();
  }
  return io;
}

export default function handler(req, res) {
  // Simple health-check ping (no Socket.IO path needed)
  if (req.method === 'GET' && req.url?.includes('health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', note: 'Vercel serverless — solo mode only. Deploy server.mjs to Railway for real collab.' }));
    return;
  }

  const ioInstance = getIO();
  ioInstance.engine.handleRequest(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

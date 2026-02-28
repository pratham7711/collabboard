/**
 * Vercel Serverless Function — Socket.io adapter
 *
 * This module creates a singleton Socket.io server that persists in the
 * Vercel function container's Node.js module cache between invocations
 * (as long as the container remains warm). This gives real-time collaboration
 * without needing a separate always-on WebSocket server.
 *
 * Limitations:
 *  - Uses HTTP long-polling only (Vercel serverless can't upgrade to WS)
 *  - State is lost when the function container goes cold (users re-join)
 *
 * For production at scale, deploy server.mjs separately on Railway/Render
 * and set VITE_SOCKET_URL to its URL.
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

// Singleton Socket.io server (cached across warm Vercel invocations)
let io;

function getIO(res) {
  if (!io) {
    const httpServer = createServer();

    io = new Server(httpServer, {
      path: '/api/socket',
      cors: { origin: '*', methods: ['GET', 'POST'] },
      // MUST use polling only on Vercel serverless
      transports: ['polling'],
      pingInterval: 20_000,
      pingTimeout: 15_000,
    });

    io.on('connection', (socket) => {
      let myBoardId = null;

      socket.on('join-room', ({ boardId, userId, userName, color }) => {
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
      });
    });

    httpServer.listen();
  }
  return io;
}

export default function handler(req, res) {
  const ioInstance = getIO(res);
  // Let Socket.io handle the request via its internal polling transport
  ioInstance.engine.handleRequest(req, res);
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

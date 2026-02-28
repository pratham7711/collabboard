import { io } from 'socket.io-client';

/**
 * Socket.io client with environment-aware connection:
 *
 * 1. VITE_SOCKET_URL is set (e.g. https://collabboard-server.up.railway.app)
 *    → connect to that URL, path = /socket.io  (full WebSocket + polling)
 *
 * 2. Development (no VITE_SOCKET_URL, Vite dev server running)
 *    → connect to '/', path = /socket.io  (proxied by Vite to localhost:3001)
 *
 * 3. Production on Vercel without a separate socket server
 *    → connect to '/', path = /api/socket  (Vercel serverless function, polling only)
 *
 * autoConnect: false — we connect explicitly after joining a room.
 */

const isDev = import.meta.env.DEV;
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? '/';

// Use the Vercel serverless path in production when no external server URL is given
const socketPath = import.meta.env.VITE_SOCKET_URL
  ? '/socket.io'
  : isDev
  ? '/socket.io'
  : '/api/socket';

export const socket = io(socketUrl, {
  autoConnect: false,

  // Vercel serverless only supports polling; external servers support both
  transports: import.meta.env.VITE_SOCKET_URL || isDev
    ? ['websocket', 'polling']
    : ['polling'],

  path: socketPath,

  // ── Reconnection ──────────────────────────────────────────────────────────
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  randomizationFactor: 0.4,

  // ── Timeouts ──────────────────────────────────────────────────────────────
  timeout: 20_000,
});

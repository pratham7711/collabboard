import { io } from 'socket.io-client';

/**
 * Socket.io client with environment-aware connection:
 *
 * 1. VITE_SOCKET_URL is set (e.g. https://collabboard-server.up.railway.app)
 *    → connect to that URL, path = /socket.io  (full WebSocket + polling)
 *    ✅ WORKS — persistent server, real multi-user collab
 *
 * 2. Development (no VITE_SOCKET_URL, Vite dev server running)
 *    → connect to '/', path = /socket.io  (proxied by Vite to localhost:3001)
 *    ✅ WORKS — run `npm run server` alongside `npm run dev`
 *
 * 3. Production on Vercel without VITE_SOCKET_URL
 *    → /api/socket serverless function — BROKEN for multi-user collab.
 *    Vercel routes each polling request to a potentially different function
 *    instance, so the server can never find the session → "Session ID unknown".
 *    We limit reconnect attempts and fall back to solo (offline) mode.
 *    ➜ Deploy server.mjs to Railway and set VITE_SOCKET_URL to fix this.
 *    See DEPLOYMENT.md for step-by-step instructions.
 *
 * autoConnect: false — we connect explicitly after joining a room.
 */

const isDev = import.meta.env.DEV;

/** True when a dedicated persistent socket server is configured or we're in dev. */
export const collabAvailable: boolean =
  !!import.meta.env.VITE_SOCKET_URL || isDev;

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? '/';

const socketPath = import.meta.env.VITE_SOCKET_URL
  ? '/socket.io'
  : isDev
  ? '/socket.io'
  : '/api/socket';

export const socket = io(socketUrl, {
  autoConnect: false,

  // Vercel serverless only supports polling; external/dev servers support both
  transports: collabAvailable ? ['websocket', 'polling'] : ['polling'],

  path: socketPath,

  // ── Reconnection ──────────────────────────────────────────────────────────
  reconnection: true,
  // On Vercel without an external server, each reconnect fails immediately
  // (multi-instance polling → "Session ID unknown"). Cap attempts so we don't
  // loop forever — after this many failures we fall back to solo/offline mode.
  reconnectionAttempts: collabAvailable ? Infinity : 5,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 10_000,
  randomizationFactor: 0.4,

  // ── Timeouts ──────────────────────────────────────────────────────────────
  timeout: 20_000,
});

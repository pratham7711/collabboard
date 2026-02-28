import { io } from 'socket.io-client';

/**
 * Single shared socket instance.
 *
 * In development Vite proxies /socket.io → port 3001 (see vite.config.ts).
 * In production set the environment variable VITE_SOCKET_URL to the URL of
 * your deployed socket server, e.g. https://collabboard-server.up.railway.app
 *
 * autoConnect: false — we explicitly connect after the room ID is known so we
 * can emit join-room as the very first message after the handshake.
 */
export const socket = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
  autoConnect: false,

  // Try WebSocket first, fall back to long-polling for restrictive networks
  transports: ['websocket', 'polling'],

  // Re-use the same connection path the Vite proxy forwards
  path: '/socket.io',

  // ── Reconnection ──────────────────────────────────────────────────────────
  // Automatically reconnect forever (network blips, server restarts, etc.)
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1_000,      // wait 1s before first retry
  reconnectionDelayMax: 10_000,  // cap at 10s between retries
  randomizationFactor: 0.4,      // add jitter so clients don't hammer simultaneously

  // ── Timeouts ──────────────────────────────────────────────────────────────
  timeout: 20_000,               // how long to wait for the initial connection
});

import { io } from 'socket.io-client';

/**
 * Single shared socket instance.
 *
 * In development Vite proxies /socket.io → port 3001 (see vite.config.ts).
 * In production set the environment variable VITE_SOCKET_URL to the URL of
 * your deployed socket server, e.g. https://collabboard-server.onrender.com
 *
 * autoConnect: false — we explicitly connect after the room ID is known so we
 * can emit join-room as the very first message after the handshake.
 */
export const socket = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  // Re-use the same connection path the Vite proxy forwards
  path: '/socket.io',
});

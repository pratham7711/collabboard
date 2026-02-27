import { io } from 'socket.io-client';

/**
 * Single shared socket instance.
 * Connects to the same origin; Vite proxies /socket.io → port 3001.
 * autoConnect: false so we explicitly connect after the room ID is known.
 */
export const socket = io({
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

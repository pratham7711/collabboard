import { create } from 'zustand';
import type { Tool, User } from '../types';

export type Theme = 'dark' | 'light';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface BoardStore {
  tool: Tool;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  zoom: number;
  showGrid: boolean;
  boardTitle: string;
  activeUsers: User[];   // remote peers only (not the local user)
  history: string[];
  historyIndex: number;
  theme: Theme;
  connectionStatus: ConnectionStatus;

  setTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setBoardTitle: (title: string) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Real user management
  setActiveUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUserCursor: (userId: string, x: number, y: number) => void;

  pushHistory: (state: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearBoard: () => void;
}

function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem('collabboard-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore SSR / private browsing */ }
  return 'dark';
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  tool: 'select',
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
  fillColor: 'transparent',
  zoom: 100,
  showGrid: false,
  boardTitle: 'Untitled Board',
  activeUsers: [],   // starts empty; populated via socket events
  history: [],
  historyIndex: -1,
  theme: getSavedTheme(),
  connectionStatus: 'connecting',

  setTool: (tool) => set({ tool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFillColor: (fillColor) => set({ fillColor }),
  setZoom: (zoom) => set({ zoom: Math.min(200, Math.max(50, zoom)) }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setBoardTitle: (boardTitle) => set({ boardTitle }),

  setTheme: (theme) => {
    try { localStorage.setItem('collabboard-theme', theme); } catch { /* ignore */ }
    set({ theme });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('collabboard-theme', next); } catch { /* ignore */ }
    set({ theme: next });
  },

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setActiveUsers: (users) => set({ activeUsers: users }),

  addUser: (user) =>
    set((s) => ({
      activeUsers: [
        ...s.activeUsers.filter((u) => u.id !== user.id),
        user,
      ],
    })),

  removeUser: (userId) =>
    set((s) => ({
      activeUsers: s.activeUsers.filter((u) => u.id !== userId),
    })),

  updateUserCursor: (userId, x, y) =>
    set((s) => ({
      activeUsers: s.activeUsers.map((u) =>
        u.id === userId ? { ...u, cursor: { x, y } } : u
      ),
    })),

  pushHistory: (state) =>
    set((s) => {
      const trimmed = s.history.slice(0, s.historyIndex + 1);
      const next = [...trimmed, state].slice(-50);
      return { history: next, historyIndex: next.length - 1 };
    }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const nextIndex = historyIndex - 1;
    set({ historyIndex: nextIndex });
    return history[nextIndex];
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const nextIndex = historyIndex + 1;
    set({ historyIndex: nextIndex });
    return history[nextIndex];
  },

  clearBoard: () => set({ history: [], historyIndex: -1 }),
}));

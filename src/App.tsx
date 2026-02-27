import { useRef, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import TopBar from './components/TopBar';
import Toolbar from './components/Toolbar';
import Canvas, {
  canvasUndo,
  canvasRedo,
  canvasClear,
  canvasDownload,
  canvasSelectAll,
  canvasAddImage,
} from './components/Canvas';
import UserCursors from './components/UserCursors';
import MiniMap from './components/MiniMap';
import { useBoardStore } from './store/boardStore';
import { socket } from './lib/socket';
import { getBoardId, getMyUser } from './lib/user';
import type { User } from './types';
import './index.css';

export default function App() {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const { undo, redo, clearBoard, pushHistory, setTool, setActiveUsers, addUser, removeUser, updateUserCursor } = useBoardStore();

  // Stable identity for this tab
  const [myUser] = useState(() => getMyUser());

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  const handleUndo = () => {
    const snapshot = undo();
    canvasUndo(fabricRef, snapshot);
  };

  const handleRedo = () => {
    const snapshot = redo();
    canvasRedo(fabricRef, snapshot);
  };

  const handleClear = () => {
    canvasClear(fabricRef, clearBoard);
  };

  const handleDownload = () => {
    canvasDownload(fabricRef);
  };

  const handleImageUpload = (file: File) => {
    canvasAddImage(fabricRef, file, () => {
      const fc = fabricRef.current;
      if (fc) pushHistory(JSON.stringify(fc.toJSON()));
    });
    setTool('select');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); handleRedo(); }
      if (e.ctrlKey && e.key === 'a') { e.preventDefault(); canvasSelectAll(fabricRef); }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        const toolMap: Record<string, Parameters<typeof setTool>[0]> = {
          v: 'select', p: 'pen', r: 'rectangle', c: 'circle',
          l: 'line', t: 'text', e: 'eraser',
        };
        if (key in toolMap) setTool(toolMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Socket / collaboration setup ─────────────────────────────────────────
  useEffect(() => {
    const boardId = getBoardId();

    // ── Incoming events ──────────────────────────────────────────────────
    socket.on('room-state', ({ canvasJSON, users }: { canvasJSON: string | null; users: Array<{ userId: string; userName: string; color: string }> }) => {
      // Populate existing peers
      const peers: User[] = users.map((u) => ({
        id: u.userId,
        name: u.userName,
        color: u.color,
        cursor: { x: -200, y: -200 }, // off-screen until first cursor-move
      }));
      setActiveUsers(peers);

      // Load saved canvas state if any
      if (canvasJSON) {
        const fc = fabricRef.current;
        if (fc) {
          fc.loadFromJSON(JSON.parse(canvasJSON)).then(() => fc.renderAll());
        }
      }
    });

    socket.on('user-joined', ({ userId, userName, color }: { userId: string; userName: string; color: string }) => {
      addUser({ id: userId, name: userName, color, cursor: { x: -200, y: -200 } });
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      removeUser(userId);
    });

    socket.on('cursor-move', ({ userId, x, y }: { userId: string; x: number; y: number }) => {
      updateUserCursor(userId, x, y);
    });

    // ── Connect & join ────────────────────────────────────────────────────
    socket.connect();
    socket.emit('join-room', {
      boardId,
      userId: myUser.userId,
      userName: myUser.userName,
      color: myUser.color,
    });

    return () => {
      socket.off('room-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('cursor-move');
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#1A1A2E' }}>
      <TopBar myUser={myUser} />

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onDownload={handleDownload}
        onImageUpload={handleImageUpload}
      />

      <Canvas fabricRef={fabricRef} myUserId={myUser.userId} />

      <UserCursors />

      <MiniMap fabricRef={fabricRef} />
    </div>
  );
}

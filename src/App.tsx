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

  // True once the socket receives room-state (canvas data + peers loaded)
  const [boardReady, setBoardReady] = useState(false);

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
          fc.loadFromJSON(JSON.parse(canvasJSON)).then(() => {
            fc.renderAll();
            setBoardReady(true);
          });
        } else {
          setBoardReady(true);
        }
      } else {
        setBoardReady(true);
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
    // Emit join-room on EVERY (re)connect, not just the first one.
    // Socket.io auto-reconnects after network blips; without re-emitting
    // join-room the server has no record of which room this socket belongs
    // to, so canvas-sync / cursor-move events from peers stop arriving and
    // users effectively end up on isolated boards.
    const joinRoom = () => {
      socket.emit('join-room', {
        boardId,
        userId: myUser.userId,
        userName: myUser.userName,
        color: myUser.color,
      });
    };

    socket.on('connect', joinRoom);

    // Fallback: if the socket can't connect within 4s (server offline / wrong
    // URL) still show the board so the user can draw locally.
    const readyTimer = setTimeout(() => setBoardReady(true), 4000);

    socket.connect();

    return () => {
      clearTimeout(readyTimer);
      socket.off('connect', joinRoom);
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

      {/* Board loading overlay — visible until socket emits room-state */}
      {!boardReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: '#1A1A2E',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            pointerEvents: 'none',
            transition: 'opacity 0.4s',
          }}
        >
          {/* Canvas grid skeleton */}
          <div
            style={{
              width: 'min(480px, 90vw)',
              height: 'min(320px, 50vh)',
              borderRadius: 12,
              border: '1px solid rgba(99,102,241,0.2)',
              background: 'rgba(99,102,241,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'boardShimmer 1.8s ease-in-out infinite',
              }}
            />
            {/* Fake toolbar items */}
            {[20, 52, 84, 116].map((top) => (
              <div
                key={top}
                style={{
                  position: 'absolute',
                  left: 16,
                  top,
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.12)',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(150,150,200,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Connecting to board…
          </div>
          <style>{`
            @keyframes boardShimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

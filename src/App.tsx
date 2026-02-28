import { useRef, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useTheme } from './lib/theme';
import { socket } from './lib/socket';
import { getBoardId, getMyUser } from './lib/user';
import type { User } from './types';
import './index.css';

export default function App() {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const {
    undo, redo, clearBoard, pushHistory, setTool,
    setActiveUsers, addUser, removeUser, updateUserCursor,
    setConnectionStatus, connectionStatus,
  } = useBoardStore();
  const theme = useTheme();

  // Stable identity for this tab
  const [myUser] = useState(() => getMyUser());

  // True once the socket receives room-state (canvas data + peers loaded)
  const [boardReady, setBoardReady] = useState(false);

  // Holds the canvasJSON received in room-state if the Fabric canvas isn't
  // ready yet. Canvas calls onCanvasReady() once it initialises.
  const pendingCanvasJSON = useRef<string | null>(null);

  // Called by Canvas once fabric is initialised
  const onCanvasReady = useCallback(() => {
    const json = pendingCanvasJSON.current;
    if (!json) return;
    pendingCanvasJSON.current = null;
    const fc = fabricRef.current;
    if (!fc) return;
    fc.loadFromJSON(JSON.parse(json)).then(() => {
      fc.renderAll();
      setBoardReady(true);
    });
  }, []);

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
    canvasClear(fabricRef, clearBoard, theme.canvasBg);
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
      setConnectionStatus('connected');

      const peers: User[] = users.map((u) => ({
        id: u.userId,
        name: u.userName,
        color: u.color,
        cursor: { x: -200, y: -200 },
      }));
      setActiveUsers(peers);

      if (canvasJSON) {
        const fc = fabricRef.current;
        if (fc) {
          fc.loadFromJSON(JSON.parse(canvasJSON)).then(() => {
            fc.renderAll();
            setBoardReady(true);
          });
        } else {
          pendingCanvasJSON.current = canvasJSON;
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

    // Authoritative user list pushed by server (on join/leave)
    socket.on('users-update', (users: Array<{ userId: string; userName: string; color: string }>) => {
      const peers: User[] = users
        .filter((u) => u.userId !== myUser.userId) // exclude self
        .map((u) => ({
          id: u.userId,
          name: u.userName,
          color: u.color,
          cursor: { x: -200, y: -200 },
        }));
      setActiveUsers(peers);
    });

    // ── Connection lifecycle ──────────────────────────────────────────────
    const joinRoom = () => {
      setConnectionStatus('connected');
      socket.emit('join-room', {
        boardId,
        userId: myUser.userId,
        userName: myUser.userName,
        color: myUser.color,
      });
    };

    const onDisconnect = (reason: string) => {
      console.warn('[socket] disconnected:', reason);
      setConnectionStatus('disconnected');
    };

    const onReconnectAttempt = (attempt: number) => {
      console.log('[socket] reconnect attempt', attempt);
      setConnectionStatus('reconnecting');
    };

    const onReconnect = () => {
      console.log('[socket] reconnected');
      setConnectionStatus('connected');
      // join-room is handled by the 'connect' event after reconnect
    };

    const onConnectError = (err: Error) => {
      console.warn('[socket] connect error:', err.message);
      setConnectionStatus('disconnected');
    };

    // Fired after all reconnection attempts have been exhausted.
    // On Vercel without a dedicated socket server this happens quickly (after 5
    // attempts) because every polling request hits a different instance and gets
    // "Session ID unknown". We switch to solo/offline mode instead of looping forever.
    const onReconnectFailed = () => {
      console.warn('[socket] all reconnect attempts exhausted — switching to solo mode');
      setConnectionStatus('unavailable');
      setBoardReady(true); // unblock the board so the user can still draw locally
    };

    socket.on('connect', joinRoom);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_failed', onReconnectFailed);
    socket.on('connect_error', onConnectError);

    // Fallback: if the socket can't connect within 6s show the board anyway
    const readyTimer = setTimeout(() => setBoardReady(true), 6000);

    socket.connect();

    return () => {
      clearTimeout(readyTimer);
      socket.off('connect', joinRoom);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_failed', onReconnectFailed);
      socket.off('connect_error', onConnectError);
      socket.off('room-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('cursor-move');
      socket.off('users-update');
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOffline = connectionStatus === 'disconnected' || connectionStatus === 'reconnecting' || connectionStatus === 'unavailable';

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: theme.bg,
      }}
    >
      <TopBar myUser={myUser} />

      <Toolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onDownload={handleDownload}
        onImageUpload={handleImageUpload}
      />

      <Canvas fabricRef={fabricRef} myUserId={myUser.userId} onReady={onCanvasReady} />

      <UserCursors />

      <MiniMap fabricRef={fabricRef} />

      {/* ── Reconnection banner ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isOffline && boardReady && (
          <motion.div
            key="reconnect-banner"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              top: 64,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9000,
              background: connectionStatus === 'reconnecting'
                ? 'rgba(245, 158, 11, 0.95)'
                : connectionStatus === 'unavailable'
                ? 'rgba(99, 102, 241, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
              color: '#fff',
              padding: '6px 18px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.02em',
            }}
          >
            {connectionStatus === 'reconnecting' ? (
              <>
                <ReconnectSpinner />
                Reconnecting…
              </>
            ) : connectionStatus === 'unavailable' ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Solo mode — live collab needs a dedicated server
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Connection lost — drawing locally
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board loading overlay */}
      {!boardReady && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: theme.canvasBg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            pointerEvents: 'none',
            transition: 'opacity 0.4s',
          }}
        >
          <div
            style={{
              width: 'min(480px, 90vw)',
              height: 'min(320px, 50vh)',
              borderRadius: 12,
              border: `1px solid ${theme.accentMuted}`,
              background: theme.accentBg,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(90deg, transparent 0%, ${theme.accentBg} 50%, transparent 100%)`,
                backgroundSize: '200% 100%',
                animation: 'boardShimmer 1.8s ease-in-out infinite',
              }}
            />
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
                  background: theme.accentMuted,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 13, color: theme.textFaint, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
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

function ReconnectSpinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  );
}

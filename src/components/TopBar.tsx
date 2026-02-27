import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '../store/boardStore';
import { useIsMobile } from '../lib/useIsMobile';
import type { MyUser } from '../lib/user';

interface TopBarProps {
  myUser: MyUser;
}

export default function TopBar({ myUser }: TopBarProps) {
  const { boardTitle, setBoardTitle, activeUsers, zoom, setZoom, showGrid, toggleGrid } = useBoardStore();
  const [editingTitle, setEditingTitle] = useState(false);
  const [toast, setToast] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Link copied!');
    }).catch(() => {
      showToast('Copy failed');
    });
  };

  const totalOnline = activeUsers.length + 1;

  const toastEl = (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,40,70,0.97)',
            border: '1px solid rgba(79,70,229,0.4)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            background: 'rgba(22, 33, 62, 0.97)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            zIndex: 150,
            boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }}
        >
          {/* Logo mark only */}
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79,70,229,0.5)',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" opacity="0.8" />
            </svg>
          </div>

          {/* Board title (compact, non-editable on mobile — tap to edit) */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {editingTitle ? (
              <input
                ref={titleInputRef}
                autoFocus
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(79,70,229,0.6)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  outline: 'none',
                  width: '100%',
                }}
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  padding: '4px 6px',
                  borderRadius: 6,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                  textAlign: 'left',
                }}
              >
                {boardTitle}
              </button>
            )}
          </div>

          {/* Online count badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 20,
            padding: '3px 8px',
            flexShrink: 0,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>{totalOnline}</span>
          </div>

          {/* User avatars (self + up to 2 peers) */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <motion.div
              key="self"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              title={`${myUser.userName} (you)`}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: myUser.color,
                border: '2px solid rgba(22, 33, 62, 1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: getContrastColor(myUser.color),
                boxShadow: `0 0 0 2px ${myUser.color}88`,
              }}
            >
              {myUser.userName.slice(0, 2).toUpperCase()}
            </motion.div>
            {activeUsers.slice(0, 2).map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                title={user.name}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: user.color,
                  border: '2px solid rgba(22, 33, 62, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: getContrastColor(user.color),
                  marginLeft: -8,
                }}
              >
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </motion.div>
            ))}
          </div>

          {/* Share button — prominent on mobile */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 12px rgba(79,70,229,0.5)',
              flexShrink: 0,
              height: 38,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Invite
          </motion.button>
        </div>

        {toastEl}
      </>
    );
  }

  // ── Desktop Layout (original) ──────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'rgba(22, 33, 62, 0.97)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        zIndex: 150,
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(79,70,229,0.5)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" opacity="0.8" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          CollabBoard
        </span>
      </div>

      {/* Title */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {editingTitle ? (
          <input
            ref={titleInputRef}
            autoFocus
            value={boardTitle}
            onChange={(e) => setBoardTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(79,70,229,0.6)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              textAlign: 'center',
              outline: 'none',
              minWidth: 180,
            }}
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              padding: '4px 10px',
              borderRadius: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {boardTitle}
          </button>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Grid toggle */}
        <TopBarButton
          onClick={toggleGrid}
          active={showGrid}
          title={showGrid ? 'Hide Grid' : 'Show Grid'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          Grid
        </TopBarButton>

        {/* Zoom */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '4px 6px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button
            onClick={() => setZoom(zoom - 10)}
            style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 16, transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >−</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', minWidth: 38, textAlign: 'center' }}>
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(zoom + 10)}
            style={{ width: 22, height: 22, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 16, transition: 'background 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >+</button>
        </div>

        {/* Active users (self first, then remote peers) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Self */}
          <motion.div
            key="self"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            title={`${myUser.userName} (you)`}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: myUser.color,
              border: '2px solid rgba(22, 33, 62, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: getContrastColor(myUser.color),
              cursor: 'default',
              boxShadow: `0 0 0 2px ${myUser.color}88`,
            }}
          >
            {myUser.userName.slice(0, 2).toUpperCase()}
          </motion.div>

          {/* Remote peers */}
          {activeUsers.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              title={`${user.name} is online`}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: user.color,
                border: '2px solid rgba(22, 33, 62, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: getContrastColor(user.color),
                marginLeft: -8,
                cursor: 'default',
                boxShadow: `0 0 0 1px ${user.color}33`,
              }}
            >
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </motion.div>
          ))}
          <div style={{
            marginLeft: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            {activeUsers.length + 1} online
          </div>
        </div>

        {/* Share */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          style={{
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </motion.button>
      </div>

      {toastEl}
    </div>
  );
}

function TopBarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 500,
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        background: active ? 'rgba(79,70,229,0.7)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${active ? 'rgba(79,70,229,0.5)' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      }}
    >
      {children}
    </button>
  );
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}

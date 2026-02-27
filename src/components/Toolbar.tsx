import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '../store/boardStore';
import { useIsMobile } from '../lib/useIsMobile';
import type { Tool } from '../types';

const PRESET_COLORS = [
  '#FFFFFF', '#F59E0B', '#EF4444', '#10B981',
  '#3B82F6', '#8B5CF6', '#EC4899', '#000000',
];

interface ToolDef {
  id: Tool;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 4.702z" />
      </svg>
    ),
  },
  {
    id: 'pen',
    label: 'Pen',
    shortcut: 'P',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'rectangle',
    label: 'Rectangle',
    shortcut: 'R',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'circle',
    label: 'Circle',
    shortcut: 'C',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line',
    shortcut: 'L',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    shortcut: 'T',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortcut: 'E',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16l10-10 7 7-1.5 1.5" />
        <path d="M6.0002 11.9998L11.9999 18.0002" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    shortcut: 'I',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
];

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  onImageUpload: (file: File) => void;
}

export default function Toolbar({ onUndo, onRedo, onClear, onDownload, onImageUpload }: ToolbarProps) {
  const { tool, strokeColor, strokeWidth, fillColor, setTool, setStrokeColor, setStrokeWidth, setFillColor } = useBoardStore();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const fillInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const [showColorModal, setShowColorModal] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const handleImageClick = () => {
    imageInputRef.current?.click();
    setShowMore(false);
  };

  const hiddenInputs = (
    <>
      <input ref={colorInputRef} type="color" defaultValue={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} style={{ display: 'none' }} />
      <input ref={fillInputRef} type="color" defaultValue="#FF0000" onChange={(e) => setFillColor(e.target.value)} style={{ display: 'none' }} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onImageUpload(file); setTool('select'); }
          e.target.value = '';
        }}
      />
    </>
  );

  // ── Mobile Layout ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Bottom toolbar */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            paddingBottom: 'env(safe-area-inset-bottom)',
            background: 'rgba(22, 33, 62, 0.97)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Scrollable tools */}
          <div
            className="mobile-toolbar-scroll"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              overflowX: 'auto',
              padding: '0 4px',
              gap: 2,
            }}
          >
            {TOOLS.map((t) => (
              <MobileToolButton
                key={t.id}
                active={tool === t.id}
                label={t.label}
                onClick={() => {
                  if (t.id === 'image') {
                    handleImageClick();
                  } else {
                    setTool(t.id);
                  }
                }}
              >
                {t.icon}
              </MobileToolButton>
            ))}
          </div>

          {/* Right controls: color swatch + more */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
              flexShrink: 0,
            }}
          >
            {/* Current stroke color indicator */}
            <button
              onClick={() => setShowColorModal(true)}
              style={{
                width: 52,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Colors"
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: strokeColor,
                  border: strokeColor === '#FFFFFF' ? '2px solid rgba(255,255,255,0.3)' : '2px solid rgba(255,255,255,0.15)',
                  boxShadow: `0 0 0 2px ${strokeColor}44, 0 2px 8px rgba(0,0,0,0.4)`,
                  position: 'relative',
                }}
              >
                {/* Small fill indicator in corner */}
                {fillColor !== 'transparent' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: fillColor,
                      border: '1.5px solid rgba(22,33,62,1)',
                    }}
                  />
                )}
              </div>
            </button>

            {/* More / settings button */}
            <button
              onClick={() => setShowMore(true)}
              style={{
                width: 52,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.7)',
              }}
              title="More"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>

        {hiddenInputs}

        {/* Color Modal – full screen */}
        <AnimatePresence>
          {showColorModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 500,
                background: 'rgba(10,15,30,0.97)',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 60,
                padding: '0 20px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Colors</span>
                <button
                  onClick={() => setShowColorModal(false)}
                  style={{
                    width: 44, height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10,
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.07)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Stroke colors */}
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Stroke Color
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                  {PRESET_COLORS.map((c) => (
                    <MobileColorSwatch
                      key={c}
                      color={c}
                      active={strokeColor === c}
                      onClick={() => setStrokeColor(c)}
                    />
                  ))}
                  <button
                    title="Custom stroke color"
                    onClick={() => colorInputRef.current?.click()}
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Fill colors */}
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Fill Color
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
                  <MobileColorSwatch
                    color="transparent"
                    active={fillColor === 'transparent'}
                    onClick={() => setFillColor('transparent')}
                    isTransparent
                  />
                  {PRESET_COLORS.map((c) => (
                    <MobileColorSwatch
                      key={c}
                      color={c}
                      active={fillColor === c}
                      onClick={() => setFillColor(c)}
                    />
                  ))}
                  <button
                    title="Custom fill color"
                    onClick={() => fillInputRef.current?.click()}
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Stroke Width */}
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Stroke Width — <span style={{ color: '#fff' }}>{strokeWidth}px</span>
                </p>
                <input
                  type="range"
                  min={1}
                  max={32}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 40,
                    appearance: 'none',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: '#4F46E5',
                    marginBottom: 32,
                  } as React.CSSProperties}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* More Bottom Sheet */}
        <AnimatePresence>
          {showMore && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMore(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 400,
                  background: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0,
                  zIndex: 401,
                  background: 'rgba(22, 33, 62, 0.99)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '18px 18px 0 0',
                  padding: '0 20px',
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderBottom: 'none',
                  boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
                }}
              >
                {/* Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '12px auto 20px' }} />

                {/* Stroke Width */}
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                  Stroke Width — <span style={{ color: '#fff' }}>{strokeWidth}px</span>
                </p>
                <input
                  type="range"
                  min={1}
                  max={32}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: 40,
                    appearance: 'none',
                    background: 'rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    outline: 'none',
                    cursor: 'pointer',
                    accentColor: '#4F46E5',
                    marginBottom: 24,
                  } as React.CSSProperties}
                />

                {/* Actions grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  <MobileActionButton label="Undo" onClick={() => { onUndo(); setShowMore(false); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 00-4-4H4" />
                    </svg>
                  </MobileActionButton>
                  <MobileActionButton label="Redo" onClick={() => { onRedo(); setShowMore(false); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 014-4h12" />
                    </svg>
                  </MobileActionButton>
                  <MobileActionButton label="Save" onClick={() => { onDownload(); setShowMore(false); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </MobileActionButton>
                  <MobileActionButton label="Clear" onClick={() => { onClear(); setShowMore(false); }} danger>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </MobileActionButton>
                </div>

                {/* Image upload */}
                <button
                  onClick={handleImageClick}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Upload Image
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Desktop Layout (original) ──────────────────────────────────────────────
  const actions = [
    {
      id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 00-4-4H4" />
        </svg>
      ),
      onClick: onUndo,
    },
    {
      id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 014-4h12" />
        </svg>
      ),
      onClick: onRedo,
    },
    {
      id: 'clear', label: 'Clear Board',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      ),
      onClick: onClear,
    },
    {
      id: 'download', label: 'Download PNG', shortcut: 'Ctrl+S',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      onClick: onDownload,
    },
  ];

  return (
    <>
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          padding: '8px 6px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          width: 56,
          alignItems: 'center',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
        }}
      >
        {/* Tools */}
        {TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            active={tool === t.id}
            label={t.label}
            shortcut={t.shortcut}
            onClick={() => {
              if (t.id === 'image') {
                imageInputRef.current?.click();
              } else {
                setTool(t.id);
              }
            }}
          >
            {t.icon}
          </ToolButton>
        ))}

        <Divider />

        {/* Stroke Color */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Stroke</span>
          {PRESET_COLORS.map((c) => (
            <ColorSwatch key={c} color={c} active={strokeColor === c} onClick={() => setStrokeColor(c)} />
          ))}
          <button
            title="Custom color"
            onClick={() => colorInputRef.current?.click()}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        </div>

        <Divider />

        {/* Fill Color */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fill</span>
          <ColorSwatch color="transparent" active={fillColor === 'transparent'} onClick={() => setFillColor('transparent')} isTransparent />
          {PRESET_COLORS.slice(0, 5).map((c) => (
            <ColorSwatch key={c} color={c} active={fillColor === c} onClick={() => setFillColor(c)} />
          ))}
          <button
            title="Custom fill"
            onClick={() => fillInputRef.current?.click()}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
        </div>

        <Divider />

        {/* Stroke Width */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Width</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{strokeWidth}px</span>
          <input
            type="range"
            min={1}
            max={32}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            style={{
              width: 40,
              appearance: 'none',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              outline: 'none',
              cursor: 'pointer',
              writingMode: 'vertical-lr' as const,
              direction: 'rtl',
              height: 60,
            } as React.CSSProperties}
          />
        </div>

        <Divider />

        {/* Actions */}
        {actions.map((a) => (
          <ToolButton key={a.id} label={a.label} shortcut={a.shortcut} onClick={a.onClick}>
            {a.icon}
          </ToolButton>
        ))}
      </motion.div>

      {hiddenInputs}
    </>
  );
}

// ── Desktop sub-components ────────────────────────────────────────────────────

function ToolButton({
  children,
  active,
  label,
  shortcut,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <div style={{ position: 'relative' }} className="tool-btn-wrapper">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        onClick={onClick}
        title={shortcut ? `${label} (${shortcut})` : label}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? 'rgba(79,70,229,0.9)' : 'transparent',
          color: active ? '#fff' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {children}
        {active && (
          <motion.div
            layoutId="tool-indicator"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 10,
              background: 'rgba(79,70,229,0.9)',
              zIndex: -1,
            }}
          />
        )}
      </motion.button>
    </div>
  );
}

function ColorSwatch({
  color,
  active,
  onClick,
  isTransparent,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  isTransparent?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={isTransparent ? 'Transparent' : color}
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: isTransparent
          ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 50%, transparent 50%)'
          : color,
        border: active
          ? '2px solid #4F46E5'
          : color === '#FFFFFF'
          ? '1.5px solid rgba(255,255,255,0.3)'
          : '1.5px solid transparent',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        boxShadow: active ? '0 0 0 2px rgba(79,70,229,0.5)' : 'none',
      }}
    />
  );
}

function Divider() {
  return (
    <div style={{
      width: '80%',
      height: 1,
      background: 'rgba(255,255,255,0.08)',
      margin: '4px 0',
    }} />
  );
}

// ── Mobile sub-components ─────────────────────────────────────────────────────

function MobileToolButton({
  children,
  active,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 48,
        height: 48,
        minWidth: 48,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'rgba(79,70,229,0.9)' : 'transparent',
        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function MobileColorSwatch({
  color,
  active,
  onClick,
  isTransparent,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
  isTransparent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={isTransparent ? 'Transparent' : color}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: isTransparent
          ? 'repeating-conic-gradient(rgba(255,255,255,0.15) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px'
          : color,
        border: active
          ? '3px solid #4F46E5'
          : color === '#FFFFFF'
          ? '2px solid rgba(255,255,255,0.4)'
          : '2px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: active ? '0 0 0 3px rgba(79,70,229,0.5)' : 'none',
      }}
    />
  );
}

function MobileActionButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 64,
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
        color: danger ? '#EF4444' : 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

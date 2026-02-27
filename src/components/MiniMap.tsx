import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { motion } from 'framer-motion';

interface MiniMapProps {
  fabricRef: React.MutableRefObject<fabric.Canvas | null>;
}

const MINIMAP_W = 160;
const MINIMAP_H = 100;

export default function MiniMap({ fabricRef }: MiniMapProps) {
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const miniCtx = miniCanvasRef.current?.getContext('2d');
    if (!miniCtx) return;

    const render = () => {
      const fc = fabricRef.current;
      if (!fc) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const mainCanvas = fc.getElement();
      const mainW = fc.getWidth();
      const mainH = fc.getHeight();

      miniCtx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
      miniCtx.fillStyle = '#1A1A2E';
      miniCtx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);

      // Draw main canvas scaled down
      try {
        miniCtx.drawImage(mainCanvas, 0, 0, MINIMAP_W, MINIMAP_H);
      } catch {
        // Ignore cross-origin errors
      }

      // Viewport indicator
      const scaleX = MINIMAP_W / mainW;
      const scaleY = MINIMAP_H / mainH;
      const vpt = fc.viewportTransform;
      if (vpt) {
        const vx = (-vpt[4]) * scaleX;
        const vy = (-vpt[5]) * scaleY;
        const vw = (mainW / vpt[0]) * scaleX;
        const vh = (mainH / vpt[3]) * scaleY;

        miniCtx.strokeStyle = 'rgba(79,70,229,0.8)';
        miniCtx.lineWidth = 1.5;
        miniCtx.strokeRect(
          Math.max(0, vx),
          Math.max(0, vy),
          Math.min(MINIMAP_W, vw),
          Math.min(MINIMAP_H, vh)
        );
        miniCtx.fillStyle = 'rgba(79,70,229,0.08)';
        miniCtx.fillRect(
          Math.max(0, vx),
          Math.max(0, vy),
          Math.min(MINIMAP_W, vw),
          Math.min(MINIMAP_H, vh)
        );
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fabricRef]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 100,
        background: 'rgba(22, 33, 62, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{
        padding: '4px 8px',
        fontSize: 9,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        Overview
      </div>
      <canvas
        ref={miniCanvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        style={{ display: 'block' }}
      />
    </motion.div>
  );
}

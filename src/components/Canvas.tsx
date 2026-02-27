import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useBoardStore } from '../store/boardStore';
import { socket } from '../lib/socket';
import { getBoardId } from '../lib/user';
import { useIsMobile } from '../lib/useIsMobile';
import type { Tool } from '../types';

interface CanvasProps {
  fabricRef: React.MutableRefObject<fabric.Canvas | null>;
  myUserId: string;
}

// Extract clientX/Y from either MouseEvent or TouchEvent
function getClientPos(e: Event): { x: number; y: number } {
  if ('touches' in e) {
    const te = e as TouchEvent;
    if (te.touches.length > 0) return { x: te.touches[0].clientX, y: te.touches[0].clientY };
    if (te.changedTouches.length > 0) return { x: te.changedTouches[0].clientX, y: te.changedTouches[0].clientY };
  }
  const me = e as MouseEvent;
  return { x: me.clientX, y: me.clientY };
}

export default function Canvas({ fabricRef, myUserId }: CanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const {
    tool, strokeColor, strokeWidth, fillColor, showGrid, zoom,
    pushHistory,
  } = useBoardStore();

  // Refs to avoid stale closures
  const toolRef = useRef<Tool>(tool);
  const strokeColorRef = useRef(strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const fillColorRef = useRef(fillColor);
  const showGridRef = useRef(showGrid);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const activeShapeRef = useRef<fabric.Object | null>(null);

  // Flag: suppress outgoing canvas-sync while applying a remote update
  const isRemoteUpdateRef = useRef(false);

  // Debounce timer for canvas-sync emissions
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { strokeColorRef.current = strokeColor; }, [strokeColor]);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
  useEffect(() => { fillColorRef.current = fillColor; }, [fillColor]);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);

  // ── Grid helper (pure function, no side-effects on state) ─────────────────
  const applyGrid = useCallback((fc: fabric.Canvas, show: boolean) => {
    // Remove existing grid lines
    fc.getObjects()
      .filter((o) => (o as fabric.Object & { isGrid?: boolean }).isGrid)
      .forEach((o) => fc.remove(o));

    if (show) {
      const gridSize = 40;
      const w = fc.getWidth();
      const h = fc.getHeight();
      for (let x = 0; x <= w; x += gridSize) {
        const line = Object.assign(
          new fabric.Line([x, 0, x, h], {
            stroke: 'rgba(255,255,255,0.05)',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            excludeFromExport: true,
          }),
          { isGrid: true }
        );
        fc.add(line);
        fc.sendObjectToBack(line);
      }
      for (let y = 0; y <= h; y += gridSize) {
        const line = Object.assign(
          new fabric.Line([0, y, w, y], {
            stroke: 'rgba(255,255,255,0.05)',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            excludeFromExport: true,
          }),
          { isGrid: true }
        );
        fc.add(line);
        fc.sendObjectToBack(line);
      }
    }
    fc.renderAll();
  }, []);

  // ── Save history & emit canvas-sync (debounced) ───────────────────────────
  const saveHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    pushHistory(JSON.stringify(fc.toJSON()));
  }, [fabricRef, pushHistory]);

  const emitCanvasSync = useCallback(() => {
    if (isRemoteUpdateRef.current) return;
    const fc = fabricRef.current;
    if (!fc) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const canvasJSON = JSON.stringify(fc.toJSON());
      socket.emit('canvas-sync', { boardId: getBoardId(), canvasJSON });
      syncTimerRef.current = null;
    }, 120);
  }, [fabricRef]);

  // ── Apply a remote canvas snapshot ───────────────────────────────────────
  const applyRemoteCanvas = useCallback((canvasJSON: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    isRemoteUpdateRef.current = true;
    fc.loadFromJSON(JSON.parse(canvasJSON)).then(() => {
      fc.renderAll();
      // Re-apply local grid overlay after replacing canvas contents
      applyGrid(fc, showGridRef.current);
      isRemoteUpdateRef.current = false;
    });
  }, [fabricRef, applyGrid]);

  // ── Initialize Fabric canvas (runs once) ─────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const fc = new fabric.Canvas(canvasElRef.current, {
      width: w,
      height: h,
      backgroundColor: '#1A1A2E',
      selection: true,
      preserveObjectStacking: true,
      // Enable touch support
      allowTouchScrolling: false,
    });

    fabricRef.current = fc;

    // Free drawing brush setup
    fc.freeDrawingBrush = new fabric.PencilBrush(fc);
    fc.freeDrawingBrush.width = strokeWidthRef.current;
    fc.freeDrawingBrush.color = strokeColorRef.current;

    // Save history + sync after canvas changes
    const saveAfterAction = () => {
      if (isRemoteUpdateRef.current) return;
      saveHistory();
      emitCanvasSync();
    };
    fc.on('object:added', saveAfterAction);
    fc.on('object:modified', saveAfterAction);
    fc.on('object:removed', saveAfterAction);

    // ── Shape drawing ──────────────────────────────────────────────────────
    fc.on('mouse:down', (e) => {
      const currentTool = toolRef.current;
      if (currentTool === 'select' || currentTool === 'pen' || currentTool === 'eraser') return;
      if (currentTool === 'text') return;

      const pt = fc.getScenePoint(e.e);
      isDrawingRef.current = true;
      startPointRef.current = { x: pt.x, y: pt.y };

      let shape: fabric.Object | null = null;
      const commonProps = {
        left: pt.x,
        top: pt.y,
        stroke: strokeColorRef.current,
        strokeWidth: strokeWidthRef.current,
        fill: fillColorRef.current === 'transparent' ? 'transparent' : fillColorRef.current,
        selectable: false,
        evented: false,
        strokeUniform: true,
      };

      if (currentTool === 'rectangle') {
        shape = new fabric.Rect({ ...commonProps, width: 0, height: 0 });
      } else if (currentTool === 'circle') {
        shape = new fabric.Ellipse({ ...commonProps, rx: 0, ry: 0 });
      } else if (currentTool === 'line') {
        shape = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
          stroke: strokeColorRef.current,
          strokeWidth: strokeWidthRef.current,
          selectable: false,
          evented: false,
          strokeUniform: true,
        });
      }

      if (shape) {
        fc.add(shape);
        activeShapeRef.current = shape;
      }
    });

    fc.on('mouse:move', (e) => {
      // Emit cursor position to peers (handles both mouse & touch)
      const { x: clientX, y: clientY } = getClientPos(e.e);
      socket.emit('cursor-move', {
        boardId: getBoardId(),
        userId: myUserId,
        x: clientX,
        y: clientY,
      });

      // Shape resize while drawing
      if (!isDrawingRef.current || !activeShapeRef.current) return;
      const pt = fc.getScenePoint(e.e);
      const { x: sx, y: sy } = startPointRef.current;
      const shape = activeShapeRef.current;
      const currentTool = toolRef.current;

      if (currentTool === 'rectangle') {
        (shape as fabric.Rect).set({
          left: Math.min(pt.x, sx),
          top: Math.min(pt.y, sy),
          width: Math.abs(pt.x - sx),
          height: Math.abs(pt.y - sy),
        });
      } else if (currentTool === 'circle') {
        const rx = Math.abs(pt.x - sx) / 2;
        const ry = Math.abs(pt.y - sy) / 2;
        (shape as fabric.Ellipse).set({
          left: Math.min(pt.x, sx),
          top: Math.min(pt.y, sy),
          rx,
          ry,
        });
      } else if (currentTool === 'line') {
        (shape as fabric.Line).set({ x2: pt.x, y2: pt.y });
      }

      fc.renderAll();
    });

    fc.on('mouse:up', () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (activeShapeRef.current) {
        activeShapeRef.current.set({ selectable: true, evented: true });
        fc.setActiveObject(activeShapeRef.current);
        activeShapeRef.current = null;
        fc.renderAll();
        saveHistory();
        emitCanvasSync();
      }
    });

    // Text: double-click (or double-tap) to place
    fc.on('mouse:dblclick', (e) => {
      if (toolRef.current !== 'text') return;
      const pt = fc.getScenePoint(e.e);
      const text = new fabric.IText('Type here...', {
        left: pt.x,
        top: pt.y,
        fill: strokeColorRef.current,
        fontSize: Math.max(16, strokeWidthRef.current * 4),
        fontFamily: 'Inter, sans-serif',
        editable: true,
      });
      fc.add(text);
      fc.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      fc.renderAll();
      saveHistory();
      emitCanvasSync();
    });

    // Keyboard: delete selected
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        const active = fc.getActiveObjects();
        if (active.length > 0) {
          active.forEach((obj) => fc.remove(obj));
          fc.discardActiveObject();
          fc.renderAll();
          saveHistory();
          emitCanvasSync();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      fc.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      fc.renderAll();
    };
    window.addEventListener('resize', handleResize);

    // ── Pinch-to-zoom (native touch events) ──────────────────────────────
    let lastPinchDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0 && dist > 0) {
          const scale = dist / lastPinchDist;
          const currentZoom = fc.getZoom();
          const newZoom = Math.min(Math.max(currentZoom * scale, 0.1), 8);
          // Zoom toward midpoint of two fingers
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = container.getBoundingClientRect();
          fc.zoomToPoint(new fabric.Point(midX - rect.left, midY - rect.top), newZoom);
          fc.renderAll();
        }
        lastPinchDist = dist;
      }
    };

    const handleTouchEnd = () => { lastPinchDist = 0; };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    // ── Socket: receive remote canvas ──────────────────────────────────────
    const handleCanvasSync = ({ canvasJSON }: { canvasJSON: string }) => {
      applyRemoteCanvas(canvasJSON);
    };
    socket.on('canvas-sync', handleCanvasSync);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      socket.off('canvas-sync', handleCanvasSync);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      fc.dispose();
      fabricRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tool changes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    if (tool === 'pen') {
      fc.isDrawingMode = true;
      fc.selection = false;
      fc.freeDrawingBrush = new fabric.PencilBrush(fc);
      fc.freeDrawingBrush.color = strokeColor;
      fc.freeDrawingBrush.width = strokeWidth;
      fc.defaultCursor = 'crosshair';
    } else if (tool === 'eraser') {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'cell';
    } else if (tool === 'select') {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.defaultCursor = 'default';
      fc.getObjects().forEach((obj) => {
        obj.set({ selectable: true, evented: true });
      });
    } else if (tool === 'text') {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'text';
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
    }

    fc.renderAll();
  }, [tool, strokeColor, strokeWidth]);

  // ── Pen brush color/width ─────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc || tool !== 'pen') return;
    if (fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = strokeColor;
      fc.freeDrawingBrush.width = strokeWidth;
    }
  }, [strokeColor, strokeWidth, tool]);

  // ── Eraser: click to delete ───────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const handleEraserClick = (e: fabric.TPointerEventInfo) => {
      if (toolRef.current !== 'eraser') return;
      const target = e.target;
      if (target) {
        fc.remove(target);
        fc.renderAll();
        saveHistory();
        emitCanvasSync();
      }
    };

    fc.on('mouse:down', handleEraserClick);
    return () => { fc.off('mouse:down', handleEraserClick); };
  }, [saveHistory, emitCanvasSync]);

  // ── Grid overlay ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    applyGrid(fc, showGrid);
  }, [showGrid, applyGrid]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.setZoom(zoom / 100);
    fc.renderAll();
  }, [zoom]);

  const getCursor = () => {
    switch (tool) {
      case 'select': return 'default';
      case 'pen': return 'crosshair';
      case 'eraser': return 'cell';
      case 'text': return 'text';
      default: return 'crosshair';
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 56,
        left: isMobile ? 0 : 80,
        right: 0,
        bottom: isMobile ? 60 : 0,
        cursor: getCursor(),
        overflow: 'hidden',
        // Prevent default touch behavior so drawing works
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <canvas ref={canvasElRef} />
    </div>
  );
}

// ─── Helpers exposed to App ───────────────────────────────────────────────────

export function canvasUndo(
  fabricRef: React.MutableRefObject<fabric.Canvas | null>,
  snapshot: string | null
) {
  const fc = fabricRef.current;
  if (!fc || !snapshot) return;
  fc.loadFromJSON(JSON.parse(snapshot)).then(() => fc.renderAll());
}

export function canvasRedo(
  fabricRef: React.MutableRefObject<fabric.Canvas | null>,
  snapshot: string | null
) {
  canvasUndo(fabricRef, snapshot);
}

export function canvasClear(
  fabricRef: React.MutableRefObject<fabric.Canvas | null>,
  clearBoard: () => void
) {
  const fc = fabricRef.current;
  if (!fc) return;
  fc.clear();
  fc.backgroundColor = '#1A1A2E';
  fc.renderAll();
  clearBoard();
  // Broadcast clear to peers
  socket.emit('canvas-sync', {
    boardId: getBoardId(),
    canvasJSON: JSON.stringify(fc.toJSON()),
  });
}

export function canvasDownload(fabricRef: React.MutableRefObject<fabric.Canvas | null>) {
  const fc = fabricRef.current;
  if (!fc) return;
  const dataURL = fc.toDataURL({ format: 'png', multiplier: 2 });
  const link = document.createElement('a');
  link.download = 'collabboard.png';
  link.href = dataURL;
  link.click();
}

export function canvasSelectAll(fabricRef: React.MutableRefObject<fabric.Canvas | null>) {
  const fc = fabricRef.current;
  if (!fc) return;
  fc.discardActiveObject();
  const objs = fc.getObjects().filter((o) => !(o as fabric.Object & { isGrid?: boolean }).isGrid);
  if (objs.length === 0) return;
  const sel = new fabric.ActiveSelection(objs, { canvas: fc });
  fc.setActiveObject(sel);
  fc.renderAll();
}

export function canvasAddImage(
  fabricRef: React.MutableRefObject<fabric.Canvas | null>,
  file: File,
  onDone: () => void
) {
  const fc = fabricRef.current;
  if (!fc) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string;
    fabric.FabricImage.fromURL(src).then((img) => {
      const maxW = fc.getWidth() * 0.6;
      const maxH = fc.getHeight() * 0.6;
      const scale = Math.min(maxW / (img.width || 1), maxH / (img.height || 1), 1);
      img.scale(scale);
      img.set({
        left: fc.getWidth() / 2 - (img.width! * scale) / 2,
        top: fc.getHeight() / 2 - (img.height! * scale) / 2,
      });
      fc.add(img);
      fc.setActiveObject(img);
      fc.renderAll();
      onDone();
    });
  };
  reader.readAsDataURL(file);
}

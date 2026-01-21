import { useMemo, RefObject, useState, useCallback } from 'react';

interface HoverPos {
  x: number;
  y: number;
}

interface CanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  zoom: number;
  currentCellSize: number;
  hoverPos: HoverPos | null;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
  onZoomChange?: (newZoom: number) => void;
}

export function Canvas({
  canvasRef,
  width,
  height,
  zoom,
  currentCellSize,
  hoverPos,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onZoomChange
}: CanvasProps) {
  // Pinch zoom state for touch devices
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);

  // Calculate pinch distance
  const getPinchDistance = useCallback((t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Handle wheel event for trackpad pinch zoom (macOS sends pinch as wheel + ctrlKey)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey && onZoomChange) {
      e.preventDefault();
      // deltaY is negative when pinching out (zoom in), positive when pinching in (zoom out)
      const delta = -e.deltaY * 0.01;
      const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
      onZoomChange(newZoom);
    }
  }, [zoom, onZoomChange]);

  // Handle touch events for pinch-to-zoom (mobile/tablet)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && onZoomChange) {
      e.preventDefault();
      const distance = getPinchDistance(e.touches[0], e.touches[1]);
      setInitialPinchDistance(distance);
      setInitialPinchZoom(zoom);
    }
  }, [zoom, getPinchDistance, onZoomChange]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null && onZoomChange) {
      e.preventDefault();
      const distance = getPinchDistance(e.touches[0], e.touches[1]);
      const scale = distance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(3, initialPinchZoom * scale));
      onZoomChange(newZoom);
    }
  }, [initialPinchDistance, initialPinchZoom, getPinchDistance, onZoomChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setInitialPinchDistance(null);
    }
  }, []);

  // Memoize Rulers for Performance
  const xRuler = useMemo(() => Array.from({ length: width }), [width]);
  const yRuler = useMemo(() => Array.from({ length: height }), [height]);

  return (
    <main className="flex-1 bg-stone-100 overflow-auto relative flex flex-col items-center justify-center p-8">
      <div
        className="relative bg-white shadow-xl p-1 border border-stone-200 inline-block"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Ruler (X-Axis) */}
        <div className="flex mb-1">
          <div style={{ width: currentCellSize }} className="shrink-0" />
          <div className="flex border-b border-stone-200">
            {xRuler.map((_, i) => (
              <div
                key={i}
                style={{ width: currentCellSize }}
                className="text-[9px] text-stone-400 flex justify-center items-end pb-0.5 select-none font-mono h-5 border-r border-transparent hover:bg-stone-50 overflow-hidden"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* Left Ruler (Y-Axis) */}
          <div className="flex flex-col border-r border-stone-200 mr-1">
            {yRuler.map((_, i) => (
              <div
                key={i}
                style={{ height: currentCellSize }}
                className="text-[9px] text-stone-400 flex items-center justify-end pr-1 select-none font-mono w-[20px] hover:bg-stone-50 overflow-hidden"
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Canvas Wrapper */}
          <div
            className="relative cursor-crosshair group"
            style={{
              backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIklEQVQYV2NkYGD4z8DAwMiIAwygKmCCM4CiFmUjYiM1zQEA+0sEBQ7wsUoAAAAASUVORK5CYII=')",
              width: width * currentCellSize,
              height: height * currentCellSize
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerLeave={onPointerLeave}
              className="block touch-none"
            />

            {/* Custom Hover Cursor Overlay */}
            {hoverPos && (
              <div
                className="absolute pointer-events-none border-2 border-blue-500 z-10"
                style={{
                  left: hoverPos.x,
                  top: hoverPos.y,
                  width: currentCellSize,
                  height: currentCellSize,
                  boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-stone-400 font-mono">
        Canvas Mode • {width}x{height} • Zoom: {Math.round(zoom * 100)}% • Pinch/scroll to zoom
      </div>
    </main>
  );
}

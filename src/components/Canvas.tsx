import { useMemo, RefObject } from 'react';

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
  onPointerLeave
}: CanvasProps) {
  // Memoize Rulers for Performance
  const xRuler = useMemo(() => Array.from({ length: width }), [width]);
  const yRuler = useMemo(() => Array.from({ length: height }), [height]);

  return (
    <main className="flex-1 bg-stone-100 overflow-auto relative flex flex-col items-center justify-center p-8">
      <div className="relative bg-white shadow-xl p-1 border border-stone-200 inline-block">
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
        Canvas Mode • {width}x{height} • Zoom: {Math.round(zoom * 100)}%
      </div>
    </main>
  );
}

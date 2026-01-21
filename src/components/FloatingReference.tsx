import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Move, Maximize2 } from 'lucide-react';
import { rgbToHex } from '../utils';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface FloatingReferenceProps {
  referenceImg: string;
  setReferenceImg: (img: string | null) => void;
  setColor: (color: string) => void;
  updateHistory: (color: string) => void;
  setActiveTool: (tool: 'pencil') => void;
}

export function FloatingReference({
  referenceImg,
  setReferenceImg,
  setColor,
  updateHistory,
  setActiveTool
}: FloatingReferenceProps) {
  // Window position (draggable)
  const [position, setPosition] = useState<Position>({ x: 50, y: 100 });

  // Window size (resizable)
  const [windowSize, setWindowSize] = useState<Size>({ width: 300, height: 300 });

  // Image zoom
  const [zoom, setZoom] = useState(1);

  // Image position inside container (panning)
  const [imagePosition, setImagePosition] = useState<Position>({ x: 0, y: 0 });

  // Drag states
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Image pan states
  const [isPanningImage, setIsPanningImage] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const [imagePanStart, setImagePanStart] = useState<Position>({ x: 0, y: 0 });

  // Resize states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<Position>({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState<Size>({ width: 300, height: 300 });

  // Pinch zoom states
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Draw reference image
  useEffect(() => {
    if (referenceImg && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Set canvas to actual image size for better quality
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = referenceImg;
    }
  }, [referenceImg]);

  // Handle window dragging
  const handleWindowMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDraggingWindow(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWindow) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        setWindowSize({
          width: Math.max(200, initialSize.width + dx),
          height: Math.max(150, initialSize.height + dy)
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
      setIsResizing(false);
    };

    if (isDraggingWindow || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWindow, isResizing, dragOffset, resizeStart, initialSize]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setInitialSize({ ...windowSize });
  };

  // Handle image panning (mouse) - requires Alt key
  const handleImageMouseDown = (e: React.MouseEvent) => {
    // Only start panning with left click + Alt key
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (!e.altKey) return; // Only pan when Alt is held

    e.preventDefault();
    setIsPanningImage(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setImagePanStart({ ...imagePosition });
  };

  // Track Alt key state for cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handlePanMove = (e: MouseEvent) => {
      if (isPanningImage) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setImagePosition({
          x: imagePanStart.x + dx,
          y: imagePanStart.y + dy
        });
      }
    };

    const handlePanEnd = () => {
      setIsPanningImage(false);
    };

    if (isPanningImage) {
      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handlePanMove);
      window.removeEventListener('mouseup', handlePanEnd);
    };
  }, [isPanningImage, panStart, imagePanStart]);

  // Calculate pinch distance
  const getPinchDistance = (touches: React.TouchList | TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch events for pinch-to-zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const distance = getPinchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialPinchZoom(zoom);
    } else if (e.touches.length === 1) {
      // Single touch - start panning
      const touch = e.touches[0];
      setIsPanningImage(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
      setImagePanStart({ ...imagePosition });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = getPinchDistance(e.touches);
      const scale = distance / initialPinchDistance;
      const newZoom = Math.max(0.25, Math.min(5, initialPinchZoom * scale));
      setZoom(newZoom);
    } else if (e.touches.length === 1 && isPanningImage) {
      // Single touch pan
      const touch = e.touches[0];
      const dx = touch.clientX - panStart.x;
      const dy = touch.clientY - panStart.y;
      setImagePosition({
        x: imagePanStart.x + dx,
        y: imagePanStart.y + dy
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setInitialPinchDistance(null);
    }
    if (e.touches.length === 0) {
      setIsPanningImage(false);
    }
  };

  // Handle wheel event for trackpad pinch zoom (macOS sends pinch as wheel + ctrlKey)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      // deltaY is negative when pinching out (zoom in), positive when pinching in (zoom out)
      const delta = -e.deltaY * 0.01;
      setZoom(prev => Math.max(0.25, Math.min(5, prev + delta)));
    }
  };

  // Pick color from reference
  const pickColorFromRef = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Don't pick color while panning
    if (isPanningImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)));
    const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)));

    const p = ctx.getImageData(clampedX, clampedY, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);
    setColor(hex);
    updateHistory(hex);
    setActiveTool('pencil');
  };

  const handleZoomIn = () => setZoom(prev => Math.min(5, prev + 0.25));
  const handleZoomOut = () => setZoom(prev => Math.max(0.25, prev - 0.25));

  // Reset image position
  const handleResetView = () => {
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-stone-300 flex flex-col"
      style={{
        left: position.x,
        top: position.y,
        width: windowSize.width,
        height: windowSize.height,
        cursor: isDraggingWindow ? 'grabbing' : 'default'
      }}
      onMouseDown={handleWindowMouseDown}
    >
      {/* Header with drag handle */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 bg-stone-100 border-b border-stone-200 cursor-grab shrink-0">
        <div className="flex items-center gap-2">
          <Move size={14} className="text-stone-400" />
          <span className="text-xs font-medium text-stone-600">Reference</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-stone-400 mr-2">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-stone-200 rounded text-stone-500"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-stone-200 rounded text-stone-500"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleResetView}
            className="p-1 hover:bg-stone-200 rounded text-stone-500"
            title="Reset View"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => setReferenceImg(null)}
            className="p-1 hover:bg-red-100 rounded text-stone-400 hover:text-red-500 ml-1"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Image container with pan and pinch zoom */}
      <div
        ref={imageContainerRef}
        className="flex-1 bg-stone-50 overflow-hidden relative"
        style={{
          cursor: isPanningImage ? 'grabbing' : (isAltPressed ? 'grab' : 'crosshair')
        }}
        onMouseDown={handleImageMouseDown}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          onClick={pickColorFromRef}
          style={{
            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isPanningImage ? 'none' : 'transform 0.1s ease',
            maxWidth: 'none',
            cursor: isAltPressed ? 'grab' : 'crosshair'
          }}
          title="Click to pick color • Alt+drag to pan"
        />
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[10px] border-t border-blue-100 shrink-0">
        Click to pick color • Hold ⌥ Alt + drag to pan • Pinch/scroll to zoom
      </div>

      {/* Resize handle - bottom right corner */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-10 flex items-end justify-end p-1"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2L2 10M10 6L6 10M10 10L10 10" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

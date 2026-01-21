import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { FloatingReference } from './components/FloatingReference';
import { useCanvas } from './hooks/useCanvas';
import { useDrawing } from './hooks/useDrawing';
import { useHistory } from './hooks/useHistory';
import { createGridData, processImageToGrid } from './utils';
import { DEFAULT_SIZE, MAX_SIZE, BASE_CELL_SIZE, INITIAL_HISTORY, Tool } from './constants';

interface HoverPos {
  x: number;
  y: number;
}

interface ProjectData {
  width: number;
  height: number;
  grid: (string | null)[];
}

function App() {
  // Grid State
  const [width, setWidth] = useState(DEFAULT_SIZE);
  const [height, setHeight] = useState(DEFAULT_SIZE);

  // Use history hook for undo/redo
  const {
    state: gridData,
    setState: setGridData,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  } = useHistory<(string | null)[]>(createGridData(DEFAULT_SIZE, DEFAULT_SIZE));

  // Tool State
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState<string[]>(INITIAL_HISTORY);
  const [exportScale, setExportScale] = useState(10);
  const [confirmClear, setConfirmClear] = useState(false);

  // Zoom State
  const [zoom, setZoom] = useState(1);

  // Hover State
  const [hoverPos, setHoverPos] = useState<HoverPos | null>(null);

  // Reference Image
  const [referenceImg, setReferenceImg] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derived Values
  const currentCellSize = BASE_CELL_SIZE * zoom;

  // Update Color History
  const updateColorHistory = useCallback((newColor: string) => {
    if (!newColor) return;
    setHistory(prev => {
      if (prev.includes(newColor)) return [newColor, ...prev.filter(c => c !== newColor)];
      return [newColor, ...prev].slice(0, 10);
    });
  }, []);

  // Canvas Rendering Hook
  useCanvas({
    canvasRef,
    gridData,
    width,
    height,
    showGrid,
    currentCellSize
  });

  // Drawing Hook
  const { handlePointerAction } = useDrawing({
    gridData,
    setGridData,
    width,
    height,
    currentCellSize,
    activeTool,
    color,
    setColor,
    setActiveTool,
    updateHistory: updateColorHistory
  });

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Zoom Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Grid Management - now accepts dimensions from Header
  const resizeGrid = (newWidth: number, newHeight: number) => {
    if (newWidth > MAX_SIZE || newHeight > MAX_SIZE) {
      alert(`Max Size is ${MAX_SIZE}x${MAX_SIZE}`);
      return;
    }
    if (newWidth < 1 || newHeight < 1) {
      alert('Minimum size is 1x1');
      return;
    }
    const hasData = gridData.some(c => c !== null);
    if (hasData) {
      if (!window.confirm("Resizing will clear current canvas. Continue?")) return;
    }
    setWidth(newWidth);
    setHeight(newHeight);
    setGridData(createGridData(newWidth, newHeight), false);
    clearHistory();
  };

  const clearGrid = () => {
    if (confirmClear) {
      setGridData(createGridData(width, height));
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  // Export/Import
  const exportPNG = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * exportScale;
    tempCanvas.height = height * exportScale;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    gridData.forEach((cellColor, i) => {
      if (cellColor) {
        const x = (i % width) * exportScale;
        const y = Math.floor(i / width) * exportScale;
        ctx.fillStyle = cellColor;
        ctx.fillRect(x, y, exportScale, exportScale);
      }
    });

    const link = document.createElement('a');
    link.download = `pixelart_${width}x${height}_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  const saveJSON = () => {
    const data: ProjectData = { width, height, grid: gridData };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_${Date.now()}.json`;
    link.click();
  };

  const loadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ProjectData;
        if (data.width && data.height && data.grid) {
          setWidth(data.width);
          setHeight(data.height);
          setGridData(data.grid, false);
          clearHistory();
        }
      } catch (err) {
        console.error(err);
        alert("Invalid JSON File");
      }
    };
    reader.readAsText(file);
  };

  // Reference Image Handler
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setReferenceImg(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Image Import Handler
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use current max dimension as limit, or default to MAX_SIZE if it's too small
    const limit = Math.max(width, height);

    processImageToGrid(file, limit)
      .then(({ width: newWidth, height: newHeight, grid }) => {
          if (window.confirm(`Importing will resize grid to ${newWidth}x${newHeight} and clear current work. Continue?`)) {
            setWidth(newWidth);
            setHeight(newHeight);
            setGridData(grid, false);
            clearHistory();
          }
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to process image");
      });
  };

  // Pointer Handlers
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      handlePointerAction(e, canvas.getBoundingClientRect());
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update Hover Highlight
    const gridX = Math.floor(x / currentCellSize);
    const gridY = Math.floor(y / currentCellSize);

    if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
      setHoverPos({ x: gridX * currentCellSize, y: gridY * currentCellSize });
    } else {
      setHoverPos(null);
    }

    if (isDrawing) {
      handlePointerAction(e, rect);
    }
  };

  // Global Mouse Up
  useEffect(() => {
    const handleUp = () => setIsDrawing(false);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-stone-700 font-sans flex flex-col">
      <Header
        width={width}
        height={height}
        zoom={zoom}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        confirmClear={confirmClear}
        clearGrid={clearGrid}
        saveJSON={saveJSON}
        loadJSON={loadJSON}
        exportPNG={exportPNG}
        exportScale={exportScale}
        setExportScale={setExportScale}
        resizeGrid={resizeGrid}
        handleReferenceUpload={handleReferenceUpload}
        handleImageImport={handleImageImport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          color={color}
          setColor={setColor}
          updateHistory={updateColorHistory}
          history={history}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
        />

        <Canvas
          canvasRef={canvasRef}
          width={width}
          height={height}
          zoom={zoom}
          currentCellSize={currentCellSize}
          hoverPos={hoverPos}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerLeave={() => setHoverPos(null)}
          onZoomChange={setZoom}
        />
      </div>

      {/* Floating Reference Image */}
      {referenceImg && (
        <FloatingReference
          referenceImg={referenceImg}
          setReferenceImg={setReferenceImg}
          setColor={setColor}
          updateHistory={updateColorHistory}
          setActiveTool={() => setActiveTool('pencil')}
        />
      )}
    </div>
  );
}

export default App;

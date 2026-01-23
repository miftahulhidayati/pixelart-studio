import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { FloatingReference } from './components/FloatingReference';
import { useCanvas } from './hooks/useCanvas';
import { useDrawing } from './hooks/useDrawing';
import { useHistory } from './hooks/useHistory';
import { createGridData, processImageToGrid, getPixelsInsidePolygon, getPixelsInsideRect } from './utils';
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

interface Point {
  x: number;
  y: number;
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

  // Lasso & Selection State
  const [selection, setSelection] = useState<Set<number> | null>(null);
  const [selectionPath, setSelectionPath] = useState<Point[]>([]); // For lasso or rect start/end
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'all' | 'content'>('all');
  const [selectionShape, setSelectionShape] = useState<'rect' | 'freehand'>('rect');

  // Move/Drag State
  const [isMoving, setIsMoving] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [moveOffset, setMoveOffset] = useState<Point>({ x: 0, y: 0 });
  const [floatingBuffer, setFloatingBuffer] = useState<Map<number, string> | null>(null);

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
    currentCellSize,
    selection,
    lassoPath: selectionPath, // reuse prop but it might need renaming in useCanvas too, for now mapped
    isRectSelection: selectionShape === 'rect',
    moveOffset,
    floatingBuffer
  });

  // Drawing Hook
  const { handlePointerAction, getIndexFromCoords } = useDrawing({
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

  // Keyboard shortcuts for undo/redo & delete
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

      // Delete selection
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selection && selection.size > 0 && !isMoving) {
           const newGrid = [...gridData];
           selection.forEach(idx => {
             newGrid[idx] = null;
           });
           setGridData(newGrid);
           setSelection(null); // Clear selection after delete? Or keep it? Usually keep selection but empty pixels.
        }
      }

      // Escape to cancel selection
      if (e.key === 'Escape') {
          if (isSelecting) {
              setIsSelecting(false);
              setSelectionPath([]);
          } else if (isMoving) {
              // Cancel move - restore pixels
              // This is complex, for now just drop selection
              // Ideally: restore floating buffer to original position
               if (floatingBuffer) {
                  const newGrid = [...gridData];
                  floatingBuffer.forEach((clr, idx) => {
                      newGrid[idx] = clr;
                  });
                  setGridData(newGrid);
              }
              setIsMoving(false);
              setFloatingBuffer(null);
              setMoveOffset({ x: 0, y: 0 });
          } else {
             setSelection(null);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selection, gridData, isMoving, floatingBuffer, isSelecting]);

  // Zoom Handlers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  // Grid Management
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
    setSelection(null);
  };

  const clearGrid = () => {
    if (confirmClear) {
      setGridData(createGridData(width, height));
      setConfirmClear(false);
      setSelection(null);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  // Export/Import logic preserved...
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
          setSelection(null);
        }
      } catch (err) {
        console.error(err);
        alert("Invalid JSON File");
      }
    };
    reader.readAsText(file);
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setReferenceImg(evt.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const limit = Math.max(width, height);

    processImageToGrid(file, limit)
      .then(({ width: newWidth, height: newHeight, grid }) => {
          if (window.confirm(`Importing will resize grid to ${newWidth}x${newHeight} and clear current work. Continue?`)) {
            setWidth(newWidth);
            setHeight(newHeight);
            setGridData(grid, false);
            clearHistory();
            setSelection(null);
          }
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to process image");
      });
  };

  // --- SELECTION HANDLERS ---

  const handleSelectionDown = (e: React.PointerEvent<HTMLCanvasElement>, rect: DOMRect) => {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const index = getIndexFromCoords(x, y);

      // Check if clicking inside existing selection (to Move)
      if (selection && index !== null && selection.has(index)) {
          // Prepare to move
          setIsMoving(true);
          setDragStart({ x: e.clientX, y: e.clientY });

          // Cut pixels to buffer
          const buffer = new Map<number, string>();
          const newGrid = [...gridData];

          selection.forEach(idx => {
              const color = gridData[idx];
              if (color) {
                  buffer.set(idx, color);
                  newGrid[idx] = null; // Clear from grid
              }
          });

          setFloatingBuffer(buffer);
          setGridData(newGrid, false); // Don't save history yet, wait for commit
      } else {
          // Start new selection
          setSelection(null);
          setIsSelecting(true);
          setSelectionPath([{ x, y }]); // Start point
      }
  };

  const handleSelectionMove = (e: React.PointerEvent<HTMLCanvasElement>, rect: DOMRect) => {
      if (isMoving && dragStart) {
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          setMoveOffset({ x: dx, y: dy });
      } else if (isSelecting) {
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          if (selectionShape === 'rect') {
               // For Rect: [Start, Current]
               setSelectionPath(prev => [prev[0], { x, y }]);
          } else {
               // For Freehand: Append
               setSelectionPath(prev => [...prev, { x, y }]);
          }
      }
  };

  const handleSelectionUp = () => {
      if (isMoving && floatingBuffer) {
           // Commit Move
           const moveGridX = Math.round(moveOffset.x / currentCellSize);
           const moveGridY = Math.round(moveOffset.y / currentCellSize);

           const newGrid = [...gridData];
           const newSelection = new Set<number>();

           floatingBuffer.forEach((color, oldIdx) => {
               const oldX = oldIdx % width;
               const oldY = Math.floor(oldIdx / width);

               const newX = oldX + moveGridX;
               const newY = oldY + moveGridY;

               if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                   const newIdx = newY * width + newX;
                   newGrid[newIdx] = color;
                   newSelection.add(newIdx);
               }
           });

           setGridData(newGrid); // Commit this state to history?
           setSelection(newSelection);

           // cleanup
           setIsMoving(false);
           setFloatingBuffer(null);
           setDragStart(null);
           setMoveOffset({ x: 0, y: 0 });

      } else if (isSelecting) {
          setIsSelecting(false);

          let indices: number[] = [];

          if (selectionShape === 'rect' && selectionPath.length >= 2) {
              indices = getPixelsInsideRect(selectionPath[0], selectionPath[selectionPath.length - 1], width, height, currentCellSize);
          } else if (selectionShape === 'freehand') {
              indices = getPixelsInsidePolygon(selectionPath, width, height, currentCellSize);
          }

          if (selectionMode === 'content') {
            indices = indices.filter(idx => gridData[idx] !== null);
          }

          if (indices.length > 0) {
              setSelection(new Set(indices));
          }
           setSelectionPath([]);
      }
  };

  // Wrapper for all Pointer logic
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (activeTool === 'select') {
        handleSelectionDown(e, rect);
    } else {
        // If we have a selection and use another tool
        // If we click inside selection with Fill, constrain to selection?
        // For now, let's say standard tools ignore selection mask (simple MVP)
        // OR: Deselect on tool use?
        // Let's keep selection until explicitly cleared or tool behavior uses it.
        // Actually user request: "ubah warna".

        // MVP: If fill tool is used and selection exists, only fill inside selection?
        // That requires deep integration into useDrawing.

        // For now, let's just clear selection if drawing starts outside lasso mode?
        // Or keep it. Let's keep it.
        setIsDrawing(true);
        handlePointerAction(e, rect);
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

    if (activeTool === 'select') {
        handleSelectionMove(e, rect);
    } else if (isDrawing) {
      handlePointerAction(e, rect);
    }
  };

  useEffect(() => {
    const handleUp = () => {
        if (activeTool === 'select') {
            handleSelectionUp();
        } else {
            setIsDrawing(false);
        }
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [activeTool, isSelecting, isMoving, moveOffset, floatingBuffer, selectionPath, gridData, selectionShape, selectionMode]);

  // Handle Fill Selection Action
  const fillSelection = () => {
      if (!selection || selection.size === 0) return;
      const newGrid = [...gridData];
      selection.forEach(idx => {
          newGrid[idx] = color;
      });
      setGridData(newGrid);
  };

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
          selectionMode={activeTool === 'select' ? selectionMode : undefined}
          setSelectionMode={activeTool === 'select' ? setSelectionMode : undefined}
          selectionShape={activeTool === 'select' ? selectionShape : undefined}
          setSelectionShape={activeTool === 'select' ? setSelectionShape : undefined}
        />

        {/* Selection Context Actions (Visible when selection exists) */}
        {selection && selection.size > 0 && (
             <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-xl flex gap-4 z-50 border border-stone-200">
                <span className="font-bold text-sm self-center">{selection.size} px selected</span>
                <button onClick={fillSelection} className="bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded text-sm transition-colors">
                    Fill
                </button>
                 <button onClick={() => {
                     const newGrid = [...gridData];
                     selection.forEach(idx => newGrid[idx] = null);
                     setGridData(newGrid);
                 }} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-sm transition-colors">
                    Delete
                </button>
                <button onClick={() => setSelection(null)} className="text-stone-400 hover:text-stone-600 text-sm">
                    Cancel
                </button>
             </div>
        )}

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

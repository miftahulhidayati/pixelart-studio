import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Grid3X3,
  Download,
  Trash2,
  Save,
  Upload,
  Check,
  Image as ImageIcon,
  X,
  ZoomIn, // Import Icon Zoom
  ZoomOut
} from 'lucide-react';

// --- Constants & Config ---

const MAX_SIZE = 256;
const DEFAULT_SIZE = 32;
const BASE_CELL_SIZE = 20; // Ukuran dasar pixel sebelum di-zoom

const PALETTES = {
  'Classic': ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'],
  'Pastel': ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#EECBFF', '#D4A5A5', '#C3B1E1'],
  'Earth': ['#6B4423', '#8B5A2B', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3', '#FFF8DC', '#556B2F'],
  'Retro': ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179'],
  'Bone': ['#F9F6F0', '#EBE5CE', '#D6CFC7', '#BFB5A9', '#8C857B', '#57534E', '#292524', '#1C1917']
};

const INITIAL_HISTORY = ['#000000', '#FFFFFF', '#FF5733', '#33FF57', '#3357FF'];

// --- Helper Functions ---

const createGridData = (w, h) => {
  return new Array(w * h).fill(null);
};

const rgbToHex = (r, g, b) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// --- Main Component ---

export default function PixelPatternStudio() {
  // -- State --
  const [width, setWidth] = useState(DEFAULT_SIZE);
  const [height, setHeight] = useState(DEFAULT_SIZE);

  // Grid Data (Source of Truth)
  const [gridData, setGridData] = useState(() => createGridData(DEFAULT_SIZE, DEFAULT_SIZE));

  const [activeTool, setActiveTool] = useState('pencil');
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [exportScale, setExportScale] = useState(10);
  const [confirmClear, setConfirmClear] = useState(false);

  // Zoom State
  const [zoom, setZoom] = useState(1); // 1 = 100% (20px)

  // Hover State for Cursor Highlight
  const [hoverPos, setHoverPos] = useState(null);

  // Reference Image
  const [referenceImg, setReferenceImg] = useState(null);

  // Refs
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const refImgInputRef = useRef(null);
  const referenceCanvasRef = useRef(null);

  // Derived Values
  const currentCellSize = BASE_CELL_SIZE * zoom; // Hitung ukuran cell berdasarkan zoom

  // -- Canvas Rendering Engine --

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set Dimensions based on Zoom
    canvas.width = width * currentCellSize;
    canvas.height = height * currentCellSize;

    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Pixels
    gridData.forEach((cellColor, i) => {
      if (cellColor) {
        const x = (i % width) * currentCellSize;
        const y = Math.floor(i / width) * currentCellSize;
        ctx.fillStyle = cellColor;
        ctx.fillRect(x, y, currentCellSize, currentCellSize);
      }
    });

    // 3. Draw Grid Lines
    if (showGrid) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;

      // Vertical Lines
      for (let x = 0; x <= width; x++) {
        ctx.moveTo(x * currentCellSize, 0);
        ctx.lineTo(x * currentCellSize, height * currentCellSize);
      }
      // Horizontal Lines
      for (let y = 0; y <= height; y++) {
        ctx.moveTo(0, y * currentCellSize);
        ctx.lineTo(width * currentCellSize, y * currentCellSize);
      }
      ctx.stroke();
    }

  }, [gridData, width, height, showGrid, currentCellSize]); // Tambahkan currentCellSize ke dependency

  // -- Interaction Logic --

  const getIndexFromCoords = (pixelX, pixelY) => {
    // Sesuaikan kalkulasi koordinat dengan ukuran cell saat ini (zoom)
    const x = Math.floor(pixelX / currentCellSize);
    const y = Math.floor(pixelY / currentCellSize);
    if (x < 0 || x >= width || y < 0 || y >= height) return null;
    return y * width + x;
  };

  const updateHistory = (newColor) => {
    if (!newColor) return;
    setHistory(prev => {
      if (prev.includes(newColor)) return [newColor, ...prev.filter(c => c !== newColor)];
      return [newColor, ...prev].slice(0, 10);
    });
  };

  const setPixel = (index, value) => {
    if (index === null || index < 0 || index >= gridData.length) return;
    if (gridData[index] === value) return;

    const newGrid = [...gridData];
    newGrid[index] = value;
    setGridData(newGrid);
  };

  const floodFill = (startIndex, targetColor, replacementColor) => {
    if (startIndex === null || targetColor === replacementColor) return;

    const newGrid = [...gridData];
    const stack = [startIndex];
    const w = parseInt(width);
    const h = parseInt(height);

    while (stack.length > 0) {
      const idx = stack.pop();
      const x = idx % w;
      const y = Math.floor(idx / w);

      if (x < 0 || x >= w || y < 0 || y >= h) continue;

      if (newGrid[idx] === targetColor) {
        newGrid[idx] = replacementColor;

        if (y > 0) stack.push((y - 1) * w + x); // Up
        if (y < h - 1) stack.push((y + 1) * w + x); // Down
        if (x > 0) stack.push(y * w + (x - 1)); // Left
        if (x < w - 1) stack.push(y * w + (x + 1)); // Right
      }
    }
    setGridData(newGrid);
  };

  const handlePointerAction = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const index = getIndexFromCoords(x, y);

    if (index === null) return;

    // Tool Logic
    if (activeTool === 'picker') {
      const picked = gridData[index];
      if (picked) {
        setColor(picked);
        updateHistory(picked);
        setActiveTool('pencil');
      }
      return;
    }

    if (activeTool === 'fill') {
      if (e.type === 'pointerdown') {
        const targetColor = gridData[index];
        floodFill(index, targetColor, color);
        updateHistory(color);
      }
      return;
    }

    if (e.buttons === 1 || e.type === 'pointerdown') {
       const paintColor = activeTool === 'eraser' ? null : color;
       if (activeTool === 'pencil') updateHistory(color);
       setPixel(index, paintColor);
    }
  };

  const handlePointerMove = (e) => {
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
      handlePointerAction(e);
    }
  };

  // Global Mouse Up
  useEffect(() => {
    const handleUp = () => setIsDrawing(false);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  // -- Zoom Handlers --
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3)); // Max 3x
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5)); // Min 0.5x


  // -- Grid Management --

  const resizeGrid = () => {
    if (width > MAX_SIZE || height > MAX_SIZE) {
      alert(`Max Size is ${MAX_SIZE}x${MAX_SIZE}`);
      return;
    }
    const hasData = gridData.some(c => c !== null);
    if (hasData) {
      if (!window.confirm("Resizing will clear current canvas. Continue?")) return;
    }
    setGridData(createGridData(width, height));
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

  // -- Export/Import --

  const exportPNG = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * exportScale;
    tempCanvas.height = height * exportScale;
    const ctx = tempCanvas.getContext('2d');

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
    const data = { width, height, grid: gridData };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_${Date.now()}.json`;
    link.click();
  };

  const loadJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.width && data.height && data.grid) {
          setWidth(data.width);
          setHeight(data.height);
          setGridData(data.grid);
        }
      } catch (err) {
        console.error(err);
        alert("Invalid JSON File");
      }
    };
    reader.readAsText(file);
  };

  // -- Ref Image --
  const handleReferenceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setReferenceImg(evt.target.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (referenceImg && referenceCanvasRef.current) {
       const canvas = referenceCanvasRef.current;
       const ctx = canvas.getContext('2d');
       const img = new Image();
       img.onload = () => {
         const MAX_W = 220;
         const scale = MAX_W / img.width;
         canvas.width = MAX_W;
         canvas.height = img.height * scale;
         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       };
       img.src = referenceImg;
    }
  }, [referenceImg]);

  const pickColorFromRef = (e) => {
    const canvas = referenceCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    const p = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);
    setColor(hex);
    updateHistory(hex);
    setActiveTool('pencil');
  };

  // -- Memoize Rulers for Performance --
  const xRuler = useMemo(() => Array.from({length: width}), [width]);
  const yRuler = useMemo(() => Array.from({length: height}), [height]);


  return (
    <div className="min-h-screen bg-[#F9F6F0] text-stone-700 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center text-[#F9F6F0] font-bold">Px</div>
          <h1 className="text-xl font-bold text-stone-800">Pixel Studio</h1>
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 font-medium">Canvas Engine</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Dimension Controls */}
          <div className="flex items-center gap-2 text-sm bg-stone-50 p-1.5 rounded-lg border border-stone-200">
            <span className="text-stone-400 px-1 text-xs uppercase font-bold">Grid</span>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-12 p-1 bg-white border border-stone-200 rounded text-center" />
            <span className="text-stone-400">x</span>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-12 p-1 bg-white border border-stone-200 rounded text-center" />
            <button onClick={resizeGrid} className="px-3 py-1 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold">Set</button>
          </div>

          <div className="h-6 w-px bg-stone-300 hidden md:block" />

           {/* Zoom Controls */}
           <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-stone-200">
            <button onClick={handleZoomOut} className="p-1 hover:bg-stone-200 rounded text-stone-600" title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono w-10 text-center text-stone-500">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-1 hover:bg-stone-200 rounded text-stone-600" title="Zoom In">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-stone-300 hidden md:block" />

          {/* Action Buttons */}
          <div className="flex gap-2">
             <label className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md text-sm cursor-pointer">
              <ImageIcon size={16} /> <span className="hidden sm:inline">Ref</span>
              <input type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
            </label>
            <button
              onClick={clearGrid}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors border ${
                confirmClear ? 'bg-red-600 text-white' : 'text-red-600 hover:bg-red-50 border-transparent'
              }`}
            >
              {confirmClear ? <Check size={16} /> : <Trash2 size={16} />}
              <span className="hidden sm:inline">{confirmClear ? 'Confirm?' : 'Clear'}</span>
            </button>
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md text-sm cursor-pointer">
              <Upload size={16} /> <span className="hidden sm:inline">Load</span>
              <input type="file" accept=".json" onChange={loadJSON} className="hidden" />
            </label>
            <button onClick={saveJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md text-sm">
              <Save size={16} /> <span className="hidden sm:inline">Save</span>
            </button>
            <div className="relative group">
              <button onClick={exportPNG} className="flex items-center gap-1.5 px-4 py-1.5 bg-stone-800 text-[#F9F6F0] rounded-md text-sm font-medium shadow-sm hover:bg-stone-700">
                <Download size={16} /> Export
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-200 shadow-xl rounded-lg p-3 hidden group-hover:block z-50">
                <label className="block text-xs font-semibold text-stone-500 mb-1">Scale: {exportScale}x</label>
                <input type="range" min="1" max="50" value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))} className="w-full accent-stone-700" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Toolbar */}
        <aside className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col gap-6 overflow-y-auto z-10 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'pencil', icon: Pencil, label: 'Pencil' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
              { id: 'fill', icon: PaintBucket, label: 'Fill' },
              { id: 'picker', icon: Pipette, label: 'Pick' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                title={t.label}
                className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                  activeTool === t.id ? 'bg-stone-800 text-white scale-105 shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
              >
                <t.icon size={20} />
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase">Color</h3>
            <div className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
              <input type="color" value={color} onChange={(e) => { setColor(e.target.value); updateHistory(e.target.value); }} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
              <div className="flex flex-col">
                <span className="text-xs text-stone-500 font-mono">{color.toUpperCase()}</span>
                <span className="text-[10px] text-stone-400">Selected</span>
              </div>
            </div>
          </div>

          {history.length > 0 && (
             <div className="space-y-3">
             <h3 className="text-xs font-bold text-stone-400 uppercase">History</h3>
             <div className="flex flex-wrap gap-2">
               {history.map((c, i) => (
                 <button key={i} onClick={() => setColor(c)} className="w-6 h-6 rounded-md border border-stone-200 shadow-sm hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
               ))}
             </div>
           </div>
          )}

          <hr className="border-stone-100" />

          <div className="space-y-4">
             {Object.entries(PALETTES).map(([name, colors]) => (
                <div key={name}>
                  <div className="text-xs text-stone-600 mb-1.5 font-medium">{name}</div>
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {colors.map((c, idx) => (
                      <button key={idx} onClick={() => { setColor(c); updateHistory(c); }} className="w-5 h-5 rounded-full border border-stone-200 flex-shrink-0 hover:scale-110" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-auto pt-4 border-t border-stone-200 flex justify-between items-center">
             <span className="text-xs font-medium text-stone-500">Show Grid</span>
             <button onClick={() => setShowGrid(!showGrid)} className={`w-10 h-5 rounded-full p-0.5 transition-colors ${showGrid ? 'bg-stone-800' : 'bg-stone-300'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition ${showGrid ? 'translate-x-5' : 'translate-x-0'}`} />
             </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 bg-stone-100 overflow-auto relative flex flex-col items-center justify-center p-8">
           <div className="relative bg-white shadow-xl p-1 border border-stone-200 inline-block">

              {/* Top Ruler (X-Axis) - Adjusted for Zoom */}
              <div className="flex mb-1">
                 <div style={{width: currentCellSize}} className="shrink-0" /> {/* Spacer for corner */}
                 <div className="flex border-b border-stone-200">
                    {xRuler.map((_, i) => (
                       <div key={i} style={{width: currentCellSize}} className="text-[9px] text-stone-400 flex justify-center items-end pb-0.5 select-none font-mono h-5 border-r border-transparent hover:bg-stone-50 overflow-hidden">
                          {i + 1}
                       </div>
                    ))}
                 </div>
              </div>

              <div className="flex">
                {/* Left Ruler (Y-Axis) - Adjusted for Zoom */}
                <div className="flex flex-col border-r border-stone-200 mr-1">
                   {yRuler.map((_, i) => (
                      <div key={i} style={{height: currentCellSize}} className="text-[9px] text-stone-400 flex items-center justify-end pr-1 select-none font-mono w-[20px] hover:bg-stone-50 overflow-hidden">
                         {i + 1}
                      </div>
                   ))}
                </div>

                {/* Canvas Wrapper */}
                <div className="relative cursor-crosshair group"
                     style={{
                       backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIklEQVQYV2NkYGD4z8DAwMiIAwygKmCCM4CiFmUjYiM1zQEA+0sEBQ7wsUoAAAAASUVORK5CYII=')",
                       width: width * currentCellSize,
                       height: height * currentCellSize
                     }}
                >
                  <canvas
                    ref={canvasRef}
                    onPointerDown={(e) => { setIsDrawing(true); handlePointerAction(e); }}
                    onPointerMove={handlePointerMove}
                    onPointerLeave={() => setHoverPos(null)}
                    className="block touch-none"
                  />

                  {/* Custom Hover Cursor Overlay - Scaled with Zoom */}
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

        {/* Right Reference */}
        {referenceImg && (
          <aside className="w-64 bg-white border-l border-stone-200 p-4 flex flex-col z-10 shadow-lg shrink-0">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xs font-bold text-stone-400 uppercase">Reference</h3>
               <button onClick={() => setReferenceImg(null)} className="text-stone-400 hover:text-red-500"><X size={16}/></button>
             </div>
             <div className="flex-1 overflow-auto bg-stone-50 rounded-lg border border-stone-200 p-2 flex items-start justify-center">
               <canvas ref={referenceCanvasRef} onClick={pickColorFromRef} className="max-w-full cursor-crosshair shadow-sm" title="Click to pick color" />
             </div>
             <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
               Click image to pick color.
             </div>
          </aside>
        )}
      </div>
    </div>
  );
}
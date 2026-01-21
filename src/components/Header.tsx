import { useState } from 'react';
import {
  Download,
  Trash2,
  Save,
  FolderOpen,
  Check,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  ImagePlus
} from 'lucide-react';
import { MAX_SIZE } from '../constants';

interface HeaderProps {
  width: number;
  height: number;
  zoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  confirmClear: boolean;
  clearGrid: () => void;
  saveJSON: () => void;
  loadJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportPNG: () => void;
  exportScale: number;
  setExportScale: (scale: number) => void;
  resizeGrid: (newWidth: number, newHeight: number) => void;
  handleReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function Header({
  width,
  height,
  zoom,
  handleZoomIn,
  handleZoomOut,
  confirmClear,
  clearGrid,
  saveJSON,
  loadJSON,
  exportPNG,
  exportScale,
  setExportScale,
  resizeGrid,
  handleReferenceUpload,
  handleImageImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: HeaderProps) {
  // Staged grid dimensions - only apply when Set is clicked
  const [stagedWidth, setStagedWidth] = useState(width);
  const [stagedHeight, setStagedHeight] = useState(height);

  const handleSetGrid = () => {
    resizeGrid(stagedWidth, stagedHeight);
  };

  return (
    <header className="bg-white border-b border-stone-200 px-6 py-3 flex flex-wrap items-center justify-between shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 mb-2 md:mb-0">
        <div className="w-8 h-8 bg-stone-800 rounded-lg flex items-center justify-center text-[#F9F6F0] font-bold">Px</div>
        <h1 className="text-xl font-bold text-stone-800">Pixel Studio</h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Dimension Controls - Staged */}
        <div className="flex items-center gap-2 text-sm bg-stone-50 p-1.5 rounded-lg border border-stone-200">
          <span className="text-stone-400 px-1 text-xs uppercase font-bold">Grid</span>
          <input
            type="number"
            value={stagedWidth}
            min={1}
            max={MAX_SIZE}
            onChange={(e) => setStagedWidth(Number(e.target.value))}
            className="w-12 p-1 bg-white border border-stone-200 rounded text-center"
          />
          <span className="text-stone-400">x</span>
          <input
            type="number"
            value={stagedHeight}
            min={1}
            max={MAX_SIZE}
            onChange={(e) => setStagedHeight(Number(e.target.value))}
            className="w-12 p-1 bg-white border border-stone-200 rounded text-center"
          />
          <button
            onClick={handleSetGrid}
            className="px-3 py-1 bg-stone-200 hover:bg-stone-300 rounded text-xs font-semibold"
          >
            Set
          </button>
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

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-stone-200">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded ${canUndo ? 'hover:bg-stone-200 text-stone-600' : 'text-stone-300 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded ${canRedo ? 'hover:bg-stone-200 text-stone-600' : 'text-stone-300 cursor-not-allowed'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
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
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md text-sm cursor-pointer" title="Open saved project (.json)">
            <FolderOpen size={16} /> <span className="hidden sm:inline">Open</span>
            <input type="file" accept=".json" onChange={loadJSON} className="hidden" />
          </label>
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-md text-sm cursor-pointer" title="Import Image to Pixel Art">
            <ImagePlus size={16} /> <span className="hidden sm:inline">Import</span>
            <input type="file" accept="image/*" onChange={handleImageImport} className="hidden" />
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
              <input
                type="range"
                min="1"
                max="50"
                value={exportScale}
                onChange={(e) => setExportScale(Number(e.target.value))}
                className="w-full accent-stone-700"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

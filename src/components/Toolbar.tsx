import { Pencil, Eraser, PaintBucket, Pipette, MousePointer2, RectangleHorizontal, Lasso } from 'lucide-react';
import { PALETTES, Tool } from '../constants';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  color: string;
  setColor: (color: string) => void;
  updateHistory: (color: string) => void;
  history: string[];
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  selectionMode?: 'all' | 'content';
  setSelectionMode?: (mode: 'all' | 'content') => void;
  selectionShape?: 'rect' | 'freehand';
  setSelectionShape?: (shape: 'rect' | 'freehand') => void;
}


const TOOLS = [
  { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
  { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
  { id: 'fill' as Tool, icon: PaintBucket, label: 'Fill' },
  { id: 'picker' as Tool, icon: Pipette, label: 'Pick' },
  { id: 'select' as Tool, icon: MousePointer2, label: 'Select' }
];


export function Toolbar({
  activeTool,
  setActiveTool,
  color,
  setColor,
  updateHistory,
  history,
  showGrid,
  setShowGrid,
  selectionMode,
  setSelectionMode,
  selectionShape,
  setSelectionShape
}: ToolbarProps) {

  return (
    <aside className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col gap-6 overflow-y-auto z-10 shrink-0">
      {/* Tools */}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
            className={`p-3 rounded-xl flex items-center justify-center transition-all ${
              activeTool === t.id ? 'bg-stone-800 text-white scale-105 shadow-md' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
            } flex-1 min-w-[3rem]`}
          >
            <t.icon size={20} />
          </button>
        ))}
      </div>

      {/* Selection Options */}
      {selectionMode && setSelectionMode && selectionShape && setSelectionShape && (
         <div className="space-y-3">
             <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-2">
                 <h3 className="text-xs font-bold text-stone-400 uppercase">Input Shape</h3>
                 <div className="flex gap-1 bg-stone-200 p-1 rounded-lg">
                     <button
                        onClick={() => setSelectionShape('rect')}
                        className={`flex-1 py-1.5 px-2 flex justify-center items-center rounded-md transition-all ${
                            selectionShape === 'rect' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
                        }`}
                        title="Rectangle"
                     >
                        <RectangleHorizontal size={16} />
                     </button>
                     <button
                        onClick={() => setSelectionShape('freehand')}
                        className={`flex-1 py-1.5 px-2 flex justify-center items-center rounded-md transition-all ${
                            selectionShape === 'freehand' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
                        }`}
                        title="Freehand (Lasso)"
                     >
                        <Lasso size={16} />
                     </button>
                 </div>
             </div>

             <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-2">
                 <h3 className="text-xs font-bold text-stone-400 uppercase">Selection Mode</h3>
                 <div className="flex gap-1 bg-stone-200 p-1 rounded-lg">
                     <button
                        onClick={() => setSelectionMode('all')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                            selectionMode === 'all' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
                        }`}
                     >
                        Normal
                     </button>
                     <button
                        onClick={() => setSelectionMode('content')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                            selectionMode === 'content' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
                        }`}
                     >
                        Smart
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* Color Picker */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase">Color</h3>
        <div className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); updateHistory(e.target.value); }}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
          />
          <div className="flex flex-col">
            <span className="text-xs text-stone-500 font-mono">{color.toUpperCase()}</span>
            <span className="text-[10px] text-stone-400">Selected</span>
          </div>
        </div>
      </div>

      {/* Color History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-stone-400 uppercase">History</h3>
          <div className="flex flex-wrap gap-2">
            {history.map((c, i) => (
              <button
                key={i}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-md border border-stone-200 shadow-sm hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      <hr className="border-stone-100" />

      {/* Palettes */}
      <div className="space-y-4">
        {Object.entries(PALETTES).map(([name, colors]) => (
          <div key={name}>
            <div className="text-xs text-stone-600 mb-1.5 font-medium">{name}</div>
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {colors.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => { setColor(c); updateHistory(c); }}
                  className="w-5 h-5 rounded-full border border-stone-200 flex-shrink-0 hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Toggle */}
      <div className="mt-auto pt-4 border-t border-stone-200 flex justify-between items-center">
        <span className="text-xs font-medium text-stone-500">Show Grid</span>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`w-10 h-5 rounded-full p-0.5 transition-colors ${showGrid ? 'bg-stone-800' : 'bg-stone-300'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition ${showGrid ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </aside>
  );
}

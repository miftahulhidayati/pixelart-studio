import { Pencil, Eraser, PaintBucket, Pipette } from 'lucide-react';
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
}

const TOOLS = [
  { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil' },
  { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
  { id: 'fill' as Tool, icon: PaintBucket, label: 'Fill' },
  { id: 'picker' as Tool, icon: Pipette, label: 'Pick' }
];

export function Toolbar({
  activeTool,
  setActiveTool,
  color,
  setColor,
  updateHistory,
  history,
  showGrid,
  setShowGrid
}: ToolbarProps) {
  return (
    <aside className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col gap-6 overflow-y-auto z-10 shrink-0">
      {/* Tools */}
      <div className="grid grid-cols-4 gap-2">
        {TOOLS.map(t => (
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

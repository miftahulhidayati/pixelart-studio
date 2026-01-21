import { useEffect, RefObject } from 'react';
import { X } from 'lucide-react';
import { rgbToHex } from '../utils';

interface ReferencePanelProps {
  referenceImg: string;
  referenceCanvasRef: RefObject<HTMLCanvasElement | null>;
  setReferenceImg: (img: string | null) => void;
  setColor: (color: string) => void;
  updateHistory: (color: string) => void;
  setActiveTool: (tool: 'pencil') => void;
}

export function ReferencePanel({
  referenceImg,
  referenceCanvasRef,
  setReferenceImg,
  setColor,
  updateHistory,
  setActiveTool
}: ReferencePanelProps) {
  useEffect(() => {
    if (referenceImg && referenceCanvasRef.current) {
      const canvas = referenceCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

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
  }, [referenceImg, referenceCanvasRef]);

  const pickColorFromRef = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = referenceCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(p[0], p[1], p[2]);
    setColor(hex);
    updateHistory(hex);
    setActiveTool('pencil');
  };

  return (
    <aside className="w-64 bg-white border-l border-stone-200 p-4 flex flex-col z-10 shadow-lg shrink-0">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-stone-400 uppercase">Reference</h3>
        <button onClick={() => setReferenceImg(null)} className="text-stone-400 hover:text-red-500">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-stone-50 rounded-lg border border-stone-200 p-2 flex items-start justify-center">
        <canvas
          ref={referenceCanvasRef}
          onClick={pickColorFromRef}
          className="max-w-full cursor-crosshair shadow-sm"
          title="Click to pick color"
        />
      </div>
      <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
        Click image to pick color.
      </div>
    </aside>
  );
}

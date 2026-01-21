import { useCallback } from 'react';
import type { Tool } from '../constants';

interface UseDrawingProps {
    gridData: (string | null)[];
    setGridData: React.Dispatch<React.SetStateAction<(string | null)[]>>;
    width: number;
    height: number;
    currentCellSize: number;
    activeTool: Tool;
    color: string;
    setColor: (color: string) => void;
    setActiveTool: (tool: Tool) => void;
    updateHistory: (color: string) => void;
}

export function useDrawing({
    gridData,
    setGridData,
    width,
    height,
    currentCellSize,
    activeTool,
    color,
    setColor,
    setActiveTool,
    updateHistory
}: UseDrawingProps) {
    const getIndexFromCoords = useCallback((pixelX: number, pixelY: number): number | null => {
        const x = Math.floor(pixelX / currentCellSize);
        const y = Math.floor(pixelY / currentCellSize);
        if (x < 0 || x >= width || y < 0 || y >= height) return null;
        return y * width + x;
    }, [currentCellSize, width, height]);

    const setPixel = useCallback((index: number | null, value: string | null) => {
        if (index === null || index < 0 || index >= gridData.length) return;
        if (gridData[index] === value) return;

        const newGrid = [...gridData];
        newGrid[index] = value;
        setGridData(newGrid);
    }, [gridData, setGridData]);

    const floodFill = useCallback((startIndex: number | null, targetColor: string | null, replacementColor: string) => {
        if (startIndex === null || targetColor === replacementColor) return;

        const newGrid = [...gridData];
        const stack = [startIndex];
        const w = width;
        const h = height;

        while (stack.length > 0) {
            const idx = stack.pop()!;
            const x = idx % w;
            const y = Math.floor(idx / w);

            if (x < 0 || x >= w || y < 0 || y >= h) continue;

            if (newGrid[idx] === targetColor) {
                newGrid[idx] = replacementColor;

                if (y > 0) stack.push((y - 1) * w + x);
                if (y < h - 1) stack.push((y + 1) * w + x);
                if (x > 0) stack.push(y * w + (x - 1));
                if (x < w - 1) stack.push(y * w + (x + 1));
            }
        }
        setGridData(newGrid);
    }, [gridData, setGridData, width, height]);

    const handlePointerAction = useCallback((
        e: React.PointerEvent<HTMLCanvasElement>,
        canvasRect: DOMRect
    ) => {
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
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
    }, [activeTool, color, getIndexFromCoords, gridData, floodFill, setColor, setActiveTool, setPixel, updateHistory]);

    return {
        getIndexFromCoords,
        handlePointerAction
    };
}

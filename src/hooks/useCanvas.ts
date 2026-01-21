import { useEffect, RefObject } from 'react';

interface UseCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    gridData: (string | null)[];
    width: number;
    height: number;
    showGrid: boolean;
    currentCellSize: number;
}

export function useCanvas({
    canvasRef,
    gridData,
    width,
    height,
    showGrid,
    currentCellSize
}: UseCanvasProps) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
    }, [canvasRef, gridData, width, height, showGrid, currentCellSize]);
}

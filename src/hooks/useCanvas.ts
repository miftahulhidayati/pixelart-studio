import { useEffect, RefObject } from 'react';

interface Point {
    x: number;
    y: number;
}

interface UseCanvasProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    gridData: (string | null)[];
    width: number;
    height: number;
    showGrid: boolean;
    currentCellSize: number;
    selection?: Set<number> | null;
    lassoPath?: Point[];
    isRectSelection?: boolean;
    moveOffset?: Point;
    floatingBuffer?: Map<number, string> | null;
}

export function useCanvas({
    canvasRef,
    gridData,
    width,
    height,
    showGrid,
    currentCellSize,
    selection,
    lassoPath,
    isRectSelection,
    moveOffset,
    floatingBuffer
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

        // 2. Draw Static Pixels (Grid Data)
        gridData.forEach((cellColor, i) => {
            if (cellColor) {
                const x = (i % width) * currentCellSize;
                const y = Math.floor(i / width) * currentCellSize;
                ctx.fillStyle = cellColor;
                ctx.fillRect(x, y, currentCellSize, currentCellSize);
            }
        });

        // 3. Draw Floating Buffer (Moved Pixels)
        if (floatingBuffer && moveOffset) {
            floatingBuffer.forEach((color, i) => {
                const globalX = (i % width) * currentCellSize;
                const globalY = Math.floor(i / width) * currentCellSize;

                const x = globalX + moveOffset.x;
                const y = globalY + moveOffset.y;

                ctx.fillStyle = color;
                // Snap to pixel grid visual or smooth?
                // Pixel art usually snaps, but smooth drag feels better.
                // Let's use smooth for drag, snap on drop.
                ctx.fillRect(x, y, currentCellSize, currentCellSize);
            });
        }

        // 4. Draw Grid Lines
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

        // 5. Draw Selection Overlay
        if (selection) {
            ctx.fillStyle = 'rgba(50, 150, 255, 0.2)';
            ctx.strokeStyle = 'rgba(50, 150, 255, 0.8)';
            ctx.lineWidth = 1;

            // Optimization: Iterate only selection
            // We need to handle the "floating" selection position if moving.
            // If moving, the selection box should move with the cursor?
            // Usually, the "ants" stay on the source or move with content?
            // If we are "moving content", valid pixels separate from "selection region".
            // Typically selection marquee moves IF you are moving the SELECTION itself,
            // but if you are moving PIXELS, does the marquee move?
            // In Photoshop, moving pixels moves the marquee too.

            selection.forEach(i => {
                let x = (i % width) * currentCellSize;
                let y = Math.floor(i / width) * currentCellSize;

                if (moveOffset && floatingBuffer) {
                    x += moveOffset.x;
                    y += moveOffset.y;
                }

                ctx.fillRect(x, y, currentCellSize, currentCellSize);
                ctx.strokeRect(x, y, currentCellSize, currentCellSize);
            });
        }

        // 6. Draw Selection Path (Lasso or Rect)
        if (lassoPath && lassoPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#3399ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line

            if (isRectSelection && lassoPath.length >= 2) {
                // Draw Rectangle
                const start = lassoPath[0];
                const current = lassoPath[lassoPath.length - 1]; // Use last point as current

                const x = Math.min(start.x, current.x);
                const y = Math.min(start.y, current.y);
                const w = Math.abs(current.x - start.x);
                const h = Math.abs(current.y - start.y);

                ctx.strokeRect(x, y, w, h);
            } else {
                // Draw Polygon (Lasso)
                ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
                for (let i = 1; i < lassoPath.length; i++) {
                    ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
                }
                ctx.stroke();
            }

            ctx.setLineDash([]); // Reset
        }

    }, [canvasRef, gridData, width, height, showGrid, currentCellSize, selection, lassoPath, isRectSelection, moveOffset, floatingBuffer]);
}

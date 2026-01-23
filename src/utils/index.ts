// --- Helper Functions ---

export const createGridData = (w: number, h: number): (string | null)[] => {
    return new Array(w * h).fill(null);
};

export const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const processImageToGrid = (
    file: File,
    imgSizeLimit: number
): Promise<{ width: number; height: number; grid: (string | null)[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down if larger than limit, preserving aspect ratio
                if (width > imgSizeLimit || height > imgSizeLimit) {
                    const scale = imgSizeLimit / Math.max(width, height);
                    width = Math.floor(width * scale);
                    height = Math.floor(height * scale);
                }

                // Ensure at least 1x1
                width = Math.max(1, width);
                height = Math.max(1, height);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                const grid: (string | null)[] = [];

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a < 128) {
                        grid.push(null); // Transparent
                    } else {
                        grid.push(rgbToHex(r, g, b));
                    }
                }

                resolve({ width, height, grid });
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

interface Point {
    x: number;
    y: number;
}

export const getPixelsInsidePolygon = (
    polygon: Point[],
    width: number,
    height: number,
    cellSize: number
): number[] => {
    if (polygon.length < 3) return [];

    const selectedIndices: number[] = [];

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of polygon) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    // Convert pixels to grid coordinates range
    const startCol = Math.max(0, Math.floor(minX / cellSize));
    const endCol = Math.min(width - 1, Math.floor(maxX / cellSize));
    const startRow = Math.max(0, Math.floor(minY / cellSize));
    const endRow = Math.min(height - 1, Math.floor(maxY / cellSize));

    for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
            // Check center of the cell
            const pointX = x * cellSize + cellSize / 2;
            const pointY = y * cellSize + cellSize / 2;

            if (isPointInPolygon({ x: pointX, y: pointY }, polygon)) {
                selectedIndices.push(y * width + x);
            }
        }
    }

    return selectedIndices;
};

// Ray-casting algorithm
const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
    }
    return inside;
};

export const getPixelsInsideRect = (
    start: Point,
    end: Point,
    width: number,
    height: number,
    cellSize: number
): number[] => {
    const startX = Math.min(start.x, end.x);
    const endX = Math.max(start.x, end.x);
    const startY = Math.min(start.y, end.y);
    const endY = Math.max(start.y, end.y);

    const startCol = Math.max(0, Math.floor(startX / cellSize));
    const endCol = Math.min(width - 1, Math.floor(endX / cellSize));
    const startRow = Math.max(0, Math.floor(startY / cellSize));
    const endRow = Math.min(height - 1, Math.floor(endY / cellSize));

    const indices: number[] = [];

    for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
            indices.push(y * width + x);
        }
    }
    return indices;
};

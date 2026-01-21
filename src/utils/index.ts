// --- Helper Functions ---

export const createGridData = (w: number, h: number): (string | null)[] => {
    return new Array(w * h).fill(null);
};

export const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

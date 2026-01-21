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

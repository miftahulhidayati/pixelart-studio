// --- Constants & Config ---

export const MAX_SIZE = 256;
export const DEFAULT_SIZE = 32;
export const BASE_CELL_SIZE = 20;

export const PALETTES: Record<string, string[]> = {
    'Classic': ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'],
    'Pastel': ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#EECBFF', '#D4A5A5', '#C3B1E1'],
    'Earth': ['#6B4423', '#8B5A2B', '#A0522D', '#CD853F', '#DEB887', '#F5DEB3', '#FFF8DC', '#556B2F'],
    'Retro': ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#257179'],
    'Bone': ['#F9F6F0', '#EBE5CE', '#D6CFC7', '#BFB5A9', '#8C857B', '#57534E', '#292524', '#1C1917']
};

export const INITIAL_HISTORY = ['#000000', '#FFFFFF', '#FF5733', '#33FF57', '#3357FF'];

export type Tool = 'pencil' | 'eraser' | 'fill' | 'picker';

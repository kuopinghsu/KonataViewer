// =====================================================================
// CONSTANTS
// =====================================================================

const LABEL_WIDTH = 260;
const RULER_HEIGHT = 32;
const ROW_HEIGHT = 22;
const DEF_PX_CYCLE = 20.0;
const MIN_PX_CYCLE = 0.002;
const MAX_PX_CYCLE = 300.0;

// Stage colors (official Konata - only stalls have fixed colors)
const STAGE_COLORS = {
    'stl':  '#808080',  // Stall - grey
    'st':   '#808080',
    'f':    '#808080',  // Flush/stall
};

// Helper: Convert HSL to RGB hex
function hslToHex(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Stage level mapping for HSL coloring
const STAGE_LEVELS = {
    'f': 0, 'fetch': 0,
    'd': 1, 'decode': 1, 'dec': 1,
    'r': 2, 'rn': 2, 'rnm': 2, 'rename': 2,
    'dp': 3, 'ds': 3, 'disp': 3, 'dispatch': 3,
    'is': 4, 'iss': 4, 'issue': 4,
    'rs': 5, 'rsc': 5, 'reserve': 5,
    'e': 6, 'ex': 6, 'exe': 6, 'exec': 6, 'execute': 6,
    'x': 7, 'xam': 7, 'xbm': 7, 'xlu': 7, 'xlm': 7,
    'm': 8, 'ma': 8, 'mem': 8, 'memory': 8,
    'w': 9, 'wb': 9, 'wbk': 9, 'writeback': 9,
    'c': 10, 'cm': 10, 'cmt': 10, 'commit': 10,
};


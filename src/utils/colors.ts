export type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToCss({ r, g, b }: RGB, a = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

/** Bilinear interpolation between 4 corners. u,v in [0,1]. */
export function bilinear(
  tl: RGB,
  tr: RGB,
  bl: RGB,
  br: RGB,
  u: number,
  v: number,
): RGB {
  const top = lerpRgb(tl, tr, u);
  const bot = lerpRgb(bl, br, u);
  return lerpRgb(top, bot, v);
}

/** Multi-point gradient: weighted by inverse-distance from each control point. */
export type ControlPoint = { x: number; y: number; color: RGB };
export function multiPoint(points: ControlPoint[], u: number, v: number): RGB {
  let wr = 0, wg = 0, wb = 0, ws = 0;
  for (const p of points) {
    const dx = u - p.x;
    const dy = v - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-6) return p.color;
    const w = 1 / (d2 * d2); // sharper falloff
    wr += p.color.r * w;
    wg += p.color.g * w;
    wb += p.color.b * w;
    ws += w;
  }
  return { r: wr / ws, g: wg / ws, b: wb / ws };
}

export function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export type Palette = {
  name: string;
  tl: string; tr: string; bl: string; br: string;
  /** Optional extra interior control points (u,v in [0,1]). */
  extras?: { u: number; v: number; hex: string }[];
};

export type Difficulty = "beginner" | "casual" | "master";

export type LevelDef = {
  id: string;
  name: string;
  difficulty: Difficulty;
  cols: number;
  rows: number;
  palette: Palette;
  /** Extra anchor cells beyond the 4 corners, as [col,row]. */
  extraAnchors?: [number, number][];
};

export const LEVELS: LevelDef[] = [
  // Beginner — 4x4 / 5x5
  { id: "l1", name: "Sunset Breeze", difficulty: "beginner", cols: 4, rows: 4,
    palette: { name: "Sunset Breeze", tl: "#FFD89B", tr: "#FF7E5F", bl: "#FEB47B", br: "#C04848" } },
  { id: "l2", name: "Mint Lagoon", difficulty: "beginner", cols: 5, rows: 5,
    palette: { name: "Mint Lagoon", tl: "#A8FFCE", tr: "#5BC0BE", bl: "#3FC1C9", br: "#0B4F6C" } },
  { id: "l3", name: "Lavender Dawn", difficulty: "beginner", cols: 5, rows: 5,
    palette: { name: "Lavender Dawn", tl: "#F5C6FF", tr: "#FBC2EB", bl: "#A18CD1", br: "#5B6CFF" } },
  { id: "l4", name: "Peach Whisper", difficulty: "beginner", cols: 5, rows: 5,
    palette: { name: "Peach Whisper", tl: "#FFE5D9", tr: "#FFB5A7", bl: "#FCD5CE", br: "#F08080" } },

  // Casual — 6x6 / 7x7
  { id: "l5", name: "Forest Canopy", difficulty: "casual", cols: 6, rows: 6,
    palette: { name: "Forest Canopy", tl: "#DCE35B", tr: "#45B649", bl: "#134E5E", br: "#71B280" } },
  { id: "l6", name: "Ocean Depths", difficulty: "casual", cols: 7, rows: 7,
    palette: { name: "Ocean Depths", tl: "#43CEA2", tr: "#185A9D", bl: "#0F2027", br: "#2C5364" } },
  { id: "l7", name: "Berry Bloom", difficulty: "casual", cols: 6, rows: 6,
    palette: { name: "Berry Bloom", tl: "#FF9A9E", tr: "#FAD0C4", bl: "#A18CD1", br: "#FBC2EB" } },
  { id: "l8", name: "Golden Hour", difficulty: "casual", cols: 7, rows: 7,
    palette: { name: "Golden Hour", tl: "#FFE259", tr: "#FFA751", bl: "#F7971E", br: "#C0392B" } },

  // Master — 9x9 / 10x10 with extras and interior anchors
  { id: "l9", name: "Aurora Borealis", difficulty: "master", cols: 9, rows: 9,
    palette: { name: "Aurora Borealis", tl: "#00C9A7", tr: "#845EC2", bl: "#0F2027", br: "#4D8076",
      extras: [{ u: 0.5, v: 0.4, hex: "#B0FFB0" }, { u: 0.8, v: 0.7, hex: "#5BD9C9" }] },
    extraAnchors: [[4, 4]] },
  { id: "l10", name: "Neon Cyberpunk", difficulty: "master", cols: 9, rows: 9,
    palette: { name: "Neon Cyberpunk", tl: "#FF006E", tr: "#8338EC", bl: "#3A86FF", br: "#06FFA5",
      extras: [{ u: 0.4, v: 0.6, hex: "#FFBE0B" }] },
    extraAnchors: [[3, 6]] },
  { id: "l11", name: "Cosmic Drift", difficulty: "master", cols: 10, rows: 10,
    palette: { name: "Cosmic Drift", tl: "#2E3192", tr: "#1BFFFF", bl: "#D4145A", br: "#FBB03B",
      extras: [{ u: 0.6, v: 0.3, hex: "#9D50BB" }, { u: 0.3, v: 0.8, hex: "#6E48AA" }] },
    extraAnchors: [[4, 3]] },
  { id: "l12", name: "Volcanic Embers", difficulty: "master", cols: 10, rows: 10,
    palette: { name: "Volcanic Embers", tl: "#1A1A2E", tr: "#FF4E50", bl: "#16213E", br: "#F9D423",
      extras: [{ u: 0.5, v: 0.5, hex: "#FC913A" }] },
    extraAnchors: [[3, 3], [6, 6]] },
];

/** Compute the target color for tile (col,row) based on level palette. */
export function targetColor(level: LevelDef, col: number, row: number): RGB {
  const u = level.cols === 1 ? 0 : col / (level.cols - 1);
  const v = level.rows === 1 ? 0 : row / (level.rows - 1);
  const tl = hexToRgb(level.palette.tl);
  const tr = hexToRgb(level.palette.tr);
  const bl = hexToRgb(level.palette.bl);
  const br = hexToRgb(level.palette.br);
  if (level.palette.extras && level.palette.extras.length > 0) {
    const pts: ControlPoint[] = [
      { x: 0, y: 0, color: tl },
      { x: 1, y: 0, color: tr },
      { x: 0, y: 1, color: bl },
      { x: 1, y: 1, color: br },
      ...level.palette.extras.map((e) => ({ x: e.u, y: e.v, color: hexToRgb(e.hex) })),
    ];
    return multiPoint(pts, u, v);
  }
  return bilinear(tl, tr, bl, br, u, v);
}

/** Anchor coordinates (always the 4 corners + extras). */
export function anchorSet(level: LevelDef): Set<string> {
  const s = new Set<string>();
  s.add(`0,0`);
  s.add(`${level.cols - 1},0`);
  s.add(`0,${level.rows - 1}`);
  s.add(`${level.cols - 1},${level.rows - 1}`);
  for (const [c, r] of level.extraAnchors ?? []) s.add(`${c},${r}`);
  return s;
}
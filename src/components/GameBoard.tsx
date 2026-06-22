import { useEffect, useRef } from "react";
import {
  type LevelDef,
  type RGB,
  anchorSet,
  colorDistance,
  rgbToCss,
  targetColor,
} from "../utils/colors";
import { playDragHum, playSwap, playTap, unlockAudio } from "../utils/audio";
import { haptics } from "../utils/haptics";

type Tile = {
  /** Logical grid coords */
  col: number;
  row: number;
  /** Animated display position (in tile units, may differ during lerp) */
  dx: number;
  dy: number;
  /** Lerp source (when animating) */
  lerpFromX?: number;
  lerpFromY?: number;
  lerpToX?: number;
  lerpToY?: number;
  lerpStart?: number;
  lerpDur?: number;
  /** The color this tile currently shows. */
  color: RGB;
  /** The "home" target color the tile must return to. */
  targetIndex: number; // index into the target color list (the original col*rows+row)
  anchor: boolean;
};

export type GameBoardProps = {
  level: LevelDef;
  colorBlind: boolean;
  onProgress: (pct: number) => void;
  onMove: () => void;
  onComplete: () => void;
  hintToken: number; // increments to trigger a hint
  resetToken: number; // increments to reshuffle
};

const ANIM_MS = 150;

export function GameBoard({
  level,
  colorBlind,
  onProgress,
  onMove,
  onComplete,
  hintToken,
  resetToken,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tilesRef = useRef<Tile[]>([]);
  const targetsRef = useRef<RGB[]>([]);
  const sizeRef = useRef({ cssSize: 0, dpr: 1, tile: 0, pad: 12 });
  const dragRef = useRef<{
    pointerId: number;
    tileIdx: number;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
    hoverIdx: number | null;
    hum: { stop: () => void } | null;
  } | null>(null);
  const hintRef = useRef<{ idx: number; start: number } | null>(null);
  const completedRef = useRef(false);

  // Build / rebuild tiles when level or resetToken changes
  useEffect(() => {
    const targets: RGB[] = [];
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        targets.push(targetColor(level, c, r));
      }
    }
    targetsRef.current = targets;

    const anchors = anchorSet(level);
    const tiles: Tile[] = [];
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const idx = r * level.cols + c;
        tiles.push({
          col: c,
          row: r,
          dx: c,
          dy: r,
          color: targets[idx],
          targetIndex: idx,
          anchor: anchors.has(`${c},${r}`),
        });
      }
    }
    // Shuffle colors of non-anchor tiles (Fisher-Yates) by swapping their `color` and `targetIndex`
    const movable = tiles.filter((t) => !t.anchor);
    for (let i = movable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = movable[i];
      const b = movable[j];
      [a.color, b.color] = [b.color, a.color];
      [a.targetIndex, b.targetIndex] = [b.targetIndex, a.targetIndex];
    }
    // Ensure not already solved
    if (movable.every((t) => t.targetIndex === t.row * level.cols + t.col) && movable.length >= 2) {
      const [a, b] = movable;
      [a.color, b.color] = [b.color, a.color];
      [a.targetIndex, b.targetIndex] = [b.targetIndex, a.targetIndex];
    }
    tilesRef.current = tiles;
    completedRef.current = false;
    hintRef.current = null;
    reportProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level.id, resetToken]);

  // Hint
  useEffect(() => {
    if (hintToken === 0) return;
    const tiles = tilesRef.current;
    const wrong = tiles.findIndex((t) => !t.anchor && t.targetIndex !== t.row * level.cols + t.col);
    if (wrong >= 0) {
      const t = tiles[wrong];
      // Show where t needs to go: it should be at coord matching targetIndex
      hintRef.current = { idx: wrong, start: performance.now() };
      haptics.light();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintToken]);

  // Resize / DPR
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect();
      const cssSize = Math.min(rect.width, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssSize * dpr);
      canvas.height = Math.floor(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      const pad = 12;
      const tile = (cssSize - pad * 2) / Math.max(level.cols, level.rows);
      sizeRef.current = { cssSize, dpr, tile, pad };
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [level.cols, level.rows]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const draw = () => {
      const { cssSize, dpr, tile, pad } = sizeRef.current;
      if (cssSize === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssSize, cssSize);

      const now = performance.now();
      const tiles = tilesRef.current;
      const drag = dragRef.current;

      // Update lerps
      for (const t of tiles) {
        if (t.lerpStart != null && t.lerpDur && t.lerpFromX != null && t.lerpFromY != null && t.lerpToX != null && t.lerpToY != null) {
          const k = Math.min(1, (now - t.lerpStart) / t.lerpDur);
          const e = easeOut(k);
          t.dx = t.lerpFromX + (t.lerpToX - t.lerpFromX) * e;
          t.dy = t.lerpFromY + (t.lerpToY - t.lerpFromY) * e;
          if (k >= 1) {
            t.dx = t.lerpToX;
            t.dy = t.lerpToY;
            t.lerpStart = undefined;
          }
        }
      }

      // Draw board glow background
      const grad = ctx.createRadialGradient(cssSize / 2, cssSize / 2, cssSize * 0.1, cssSize / 2, cssSize / 2, cssSize * 0.7);
      grad.addColorStop(0, "rgba(255,255,255,0.04)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssSize, cssSize);

      // Draw stationary tiles first (skip dragged tile, draw last on top)
      let dragTile: Tile | null = null;
      let hoverIdx: number | null = drag?.hoverIdx ?? null;

      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (drag && i === drag.tileIdx) {
          dragTile = t;
          continue;
        }
        const x = pad + t.dx * tile;
        const y = pad + t.dy * tile;
        let scale = 1;
        if (hoverIdx === i) scale = 0.9;
        drawTile(ctx, x, y, tile, t, scale, level, colorBlind, false);
      }

      // Hint glow
      if (hintRef.current) {
        const hi = hintRef.current;
        const age = now - hi.start;
        if (age < 2200) {
          const t = tiles[hi.idx];
          // target position
          const targetCoord = indexToCoord(t.targetIndex, level.cols);
          const x = pad + targetCoord.c * tile;
          const y = pad + targetCoord.r * tile;
          const pulse = 0.5 + 0.5 * Math.sin(age / 120);
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + 0.5 * pulse})`;
          ctx.lineWidth = 3;
          roundRect(ctx, x + 2, y + 2, tile - 4, tile - 4, 10);
          ctx.stroke();
          ctx.restore();
        } else {
          hintRef.current = null;
        }
      }

      // Draw dragged tile on top, following finger
      if (dragTile && drag) {
        const x = drag.curX - tile / 2;
        const y = drag.curY - tile / 2;
        drawTile(ctx, x, y, tile, dragTile, 1.08, level, colorBlind, true);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [level, colorBlind]);

  function reportProgress() {
    const tiles = tilesRef.current;
    if (tiles.length === 0) return;
    let placed = 0;
    let movable = 0;
    for (const t of tiles) {
      if (t.anchor) continue;
      movable++;
      if (t.targetIndex === t.row * level.cols + t.col) placed++;
    }
    const pct = movable === 0 ? 1 : placed / movable;
    onProgress(pct);
    if (pct >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }

  function indexToCoord(idx: number, cols: number) {
    return { c: idx % cols, r: Math.floor(idx / cols) };
  }

  function tileAt(px: number, py: number): number {
    const { pad, tile } = sizeRef.current;
    const tiles = tilesRef.current;
    // Relaxed centroid proximity check with 12px padding
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const cx = pad + t.dx * tile + tile / 2;
      const cy = pad + t.dy * tile + tile / 2;
      const dx = px - cx;
      const dy = py - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    // Accept if within tile/2 + 12px slack
    if (best >= 0 && bestD <= sizeRef.current.tile / 2 + 12) return best;
    return -1;
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    unlockAudio();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const idx = tileAt(px, py);
    if (idx < 0) return;
    const t = tilesRef.current[idx];
    if (t.anchor) {
      playTap();
      haptics.light();
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    haptics.touch();
    playTap();
    const hum = playDragHum();
    dragRef.current = {
      pointerId: e.pointerId,
      tileIdx: idx,
      startX: px,
      startY: py,
      curX: px,
      curY: py,
      hoverIdx: null,
      hum,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    drag.curX = px;
    drag.curY = py;
    const idx = tileAt(px, py);
    drag.hoverIdx = idx >= 0 && idx !== drag.tileIdx ? idx : null;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    drag.hum?.stop();
    const canvas = canvasRef.current!;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const tiles = tilesRef.current;
    const a = tiles[drag.tileIdx];
    const dropIdx = drag.hoverIdx;
    dragRef.current = null;
    if (dropIdx == null || dropIdx === drag.tileIdx) {
      // snap back
      animateTile(a, a.col, a.row);
      return;
    }
    const b = tiles[dropIdx];
    if (b.anchor) {
      animateTile(a, a.col, a.row);
      playTap();
      return;
    }
    // swap colors + targetIndex; keep grid positions, animate visually as if tiles moved
    // Visually: animate from b's pos -> a's pos and a's pos -> b's pos, then snap back logical.
    // Simpler/clearer: swap entire tile structs in array — keep col/row constant per slot.
    // We'll swap color + targetIndex between a and b; dragged tile is `a` which animates from current curXY back to a.col,a.row.
    [a.color, b.color] = [b.color, a.color];
    [a.targetIndex, b.targetIndex] = [b.targetIndex, a.targetIndex];
    // animate
    animateTile(a, a.col, a.row);
    // give b a tiny bump
    b.lerpFromX = b.col;
    b.lerpFromY = b.row - 0.05;
    b.lerpToX = b.col;
    b.lerpToY = b.row;
    b.lerpStart = performance.now();
    b.lerpDur = ANIM_MS;
    playSwap();
    haptics.swap();
    onMove();
    reportProgress();
  }

  function animateTile(t: Tile, toCol: number, toRow: number) {
    const { pad, tile } = sizeRef.current;
    // current visual unit coords if mid-drag, derive from t.dx/dy or curX/curY (use curX if mid-drag was just released)
    const fromX = (dragRef.current ? (dragRef.current.curX - pad - tile / 2) / tile : t.dx);
    const fromY = (dragRef.current ? (dragRef.current.curY - pad - tile / 2) / tile : t.dy);
    t.lerpFromX = isFinite(fromX) ? fromX : t.dx;
    t.lerpFromY = isFinite(fromY) ? fromY : t.dy;
    t.lerpToX = toCol;
    t.lerpToY = toRow;
    t.lerpStart = performance.now();
    t.lerpDur = ANIM_MS;
  }

  function onPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.hum?.stop();
    const a = tilesRef.current[drag.tileIdx];
    dragRef.current = null;
    animateTile(a, a.col, a.row);
  }

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full max-w-[min(92vw,560px)] touch-none select-none"
      role="application"
      aria-label={`ChromaWeave board: ${level.name}`}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="block h-full w-full rounded-3xl"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tile: Tile,
  scale: number,
  level: LevelDef,
  colorBlind: boolean,
  floating: boolean,
) {
  const inset = size * (1 - scale) * 0.5 + 2;
  const px = x + inset;
  const py = y + inset;
  const ps = size - inset * 2;
  const radius = Math.max(6, ps * 0.14);

  ctx.save();
  if (floating) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  roundRect(ctx, px, py, ps, ps, radius);
  ctx.fillStyle = rgbToCss(tile.color);
  ctx.fill();
  ctx.restore();

  // Subtle inner highlight
  ctx.save();
  roundRect(ctx, px, py, ps, ps, radius);
  ctx.clip();
  const g = ctx.createLinearGradient(px, py, px, py + ps);
  g.addColorStop(0, "rgba(255,255,255,0.18)");
  g.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(px, py, ps, ps);
  ctx.restore();

  if (tile.anchor) {
    // elegant center pin
    const cx = px + ps / 2;
    const cy = py + ps / 2;
    const lum = 0.299 * tile.color.r + 0.587 * tile.color.g + 0.114 * tile.color.b;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, ps * 0.06), 0, Math.PI * 2);
    ctx.fillStyle = lum > 140 ? "rgba(15,15,22,0.55)" : "rgba(255,255,255,0.7)";
    ctx.fill();
  }

  // Color blind assist: target symbol/coords
  if (colorBlind) {
    const targetCoord = { c: tile.targetIndex % level.cols, r: Math.floor(tile.targetIndex / level.cols) };
    const label = `${targetCoord.c + 1},${targetCoord.r + 1}`;
    const lum = 0.299 * tile.color.r + 0.587 * tile.color.g + 0.114 * tile.color.b;
    ctx.fillStyle = lum > 140 ? "rgba(15,15,22,0.85)" : "rgba(255,255,255,0.9)";
    ctx.font = `${Math.max(10, ps * 0.22)}px Outfit, Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, px + ps / 2, py + ps / 2);
  }

  // Correctness check ring (subtle)
  const correctIdx = tile.row * level.cols + tile.col;
  if (!tile.anchor && tile.targetIndex === correctIdx) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    roundRect(ctx, px + 1, py + 1, ps - 2, ps - 2, radius - 1);
    ctx.stroke();
    ctx.restore();
  }
}

/** Tiny gradient preview as a data URL — useful for the Level Gallery. */
export function generatePreview(level: LevelDef, sizePx = 128): string {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = sizePx;
  c.height = sizePx;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const cell = sizePx / Math.max(level.cols, level.rows);
  for (let r = 0; r < level.rows; r++) {
    for (let cIdx = 0; cIdx < level.cols; cIdx++) {
      ctx.fillStyle = rgbToCss(targetColor(level, cIdx, r));
      ctx.fillRect(cIdx * cell, r * cell, cell + 1, cell + 1);
    }
  }
  return c.toDataURL("image/png");
}

export { colorDistance };
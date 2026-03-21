/**
 * Renders a 10×10 board grid to a small PNG data URL for home "Resume" preview.
 * Colors align with `MiniBoardPreview` / game board styling.
 */

import { BOARD_SIZE, normalizeBoardState } from "@/lib/boardUtils";

const DARK = "#3b2200";
const LIGHT = "#e6c3a5";
const P1_FILL = "#ff8c1a";
const P1_INNER = "#ffd699";
const P2_FILL = "#1a2cff";
const P2_INNER = "#66ccff";

export function boardStateToThumbnailDataUrl(
  board: number[][],
  sizePx = 150,
): string | null {
  if (typeof document === "undefined") return null;
  const grid = normalizeBoardState(board);
  const canvas = document.createElement("canvas");
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const tile = sizePx / BOARD_SIZE;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const isDark = (r + c) % 2 === 0;
      ctx.fillStyle = isDark ? DARK : LIGHT;
      ctx.fillRect(c * tile, r * tile, tile + 0.5, tile + 0.5);

      const cell = grid[r]?.[c] ?? 0;
      if (cell === 0) continue;

      const cx = c * tile + tile / 2;
      const cy = r * tile + tile / 2;
      const rad = tile * 0.34;
      const isP1 = cell === 1 || cell === 3;
      const isKing = cell === 3 || cell === 4;

      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = isP1 ? P1_FILL : P2_FILL;
      ctx.shadowColor = isP1 ? "rgba(255,140,26,0.55)" : "rgba(26,44,255,0.45)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = isP1 ? P1_INNER : P2_INNER;
      ctx.fill();

      if (isKing) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `${Math.max(8, tile * 0.45)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♔", cx, cy + 1);
      }
    }
  }

  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

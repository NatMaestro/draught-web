/** Cell values match `apps/board_engine/engine.py`. */
export type PlayerId = 1 | 2;

export const BOARD_SIZE = 10;

const P1_PIECE = 1;
const P2_PIECE = 2;

/** Starting position — mirrors `create_initial_board()` in the Django engine. */
export function createInitialBoard(): number[][] {
  const board = emptyBoard();
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 0) board[row][col] = P2_PIECE;
    }
  }
  for (let row = 6; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 0) board[row][col] = P1_PIECE;
    }
  }
  return board;
}

/** Default board spin duration (ms) when no latency sample exists yet. */
export const DEFAULT_BOARD_ROTATION_MS = 1350;

/** Min/max spin duration when syncing to measured API/WebSocket latency. */
export const BOARD_ROTATION_MS_MIN = 600;
export const BOARD_ROTATION_MS_MAX = 4500;

/** Delay between jumps when animating a multi-capture chain (only if motion is allowed). */
export const MULTI_CAPTURE_STEP_MS = 420;

/** Faster step when animating the bot’s multi-capture (vs AI only — human moves keep `MULTI_CAPTURE_STEP_MS`). */
export const AI_MULTI_CAPTURE_STEP_MS = 55;

/** Empty 10×10 grid — safe default when API data is missing or malformed. */
export function emptyBoard(): number[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 0),
  );
}

/**
 * Coerce any server/client payload into a valid 10×10 number grid.
 * Prevents render crashes from null rows or `[...undefined]` in clone helpers.
 */
export function normalizeBoardState(board: unknown): number[][] {
  if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
    return emptyBoard();
  }
  return board.map((row) => {
    if (!Array.isArray(row)) {
      return Array.from({ length: BOARD_SIZE }, () => 0);
    }
    const cells = row.map((c) => {
      if (typeof c === "number" && Number.isFinite(c)) return c;
      if (typeof c === "string" && c.trim() !== "") {
        const n = Number(c);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    });
    while (cells.length < BOARD_SIZE) cells.push(0);
    return cells.slice(0, BOARD_SIZE);
  }) as number[][];
}

export function countMaterial(
  board: number[][],
  player: PlayerId,
): { men: number; kings: number; total: number } {
  let men = 0;
  let kings = 0;
  for (const row of board) {
    if (!Array.isArray(row)) continue;
    for (const c of row) {
      if (player === 1) {
        if (c === 1) men++;
        else if (c === 3) kings++;
      } else {
        if (c === 2) men++;
        else if (c === 4) kings++;
      }
    }
  }
  return { men, kings, total: men + kings };
}

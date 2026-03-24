/**
 * Client-side mirror of `apps.board_engine.engine.apply_move` for hybrid UI:
 * apply immediately after legal-moves validation, reconcile with server response.
 */

import { applyCaptureSequence } from "@/lib/clientLegalMoves";

/** Matches `GET .../legal-moves/` entries (destination + captured squares). */
export type LegalDestination = {
  toRow: number;
  toCol: number;
  captured: Array<{ row: number; col: number }>;
};

const EMPTY = 0;
const P1_PIECE = 1;
const P2_PIECE = 2;
const P1_KING = 3;
const P2_KING = 4;
const BOARD_SIZE = 10;

function cloneBoard(b: number[][]): number[][] {
  return b.map((row) => [...row]);
}

/**
 * Apply one move using captured squares from the legal-moves API (same as server).
 */
export function applyOptimisticMove(
  board: number[][],
  from: [number, number],
  to: [number, number],
  captured: Array<{ row: number; col: number }>,
): number[][] {
  const [fr, fc] = from;
  const [tr, tc] = to;
  if (
    fr < 0 ||
    fr >= BOARD_SIZE ||
    fc < 0 ||
    fc >= BOARD_SIZE ||
    tr < 0 ||
    tr >= BOARD_SIZE ||
    tc < 0 ||
    tc >= BOARD_SIZE
  ) {
    return cloneBoard(board);
  }
  if (captured.length > 0) {
    try {
      return applyCaptureSequence(board, from, to, captured);
    } catch {
      return cloneBoard(board);
    }
  }
  const b = cloneBoard(board);
  const cell = b[fr][fc];
  b[tr][tc] = cell;
  b[fr][fc] = EMPTY;
  if (cell === P1_PIECE && tr === 0) {
    b[tr][tc] = P1_KING;
  } else if (cell === P2_PIECE && tr === BOARD_SIZE - 1) {
    b[tr][tc] = P2_KING;
  }
  return b;
}

/** Next turn after `player` moves (matches server `apply_move`). */
export function nextTurnAfter(player: 1 | 2): 1 | 2 {
  return player === 1 ? 2 : 1;
}

/**
 * Landing squares for each jump in a capture chain: [start, after jump 1, …, final].
 * For each captured square `cap`, landing is `(2*cap.row - r, 2*cap.col - c)` from current `(r,c)`.
 */
export function computeCaptureJumpWaypoints(
  from: [number, number],
  captured: Array<{ row: number; col: number }>,
  to: [number, number],
): [number, number][] {
  const waypoints: [number, number][] = [from];
  let [r, c] = from;
  for (const cap of captured) {
    const nr = 2 * cap.row - r;
    const nc = 2 * cap.col - c;
    waypoints.push([nr, nc]);
    r = nr;
    c = nc;
  }
  const last = waypoints[waypoints.length - 1];
  if (last[0] !== to[0] || last[1] !== to[1]) {
    if (import.meta.env.DEV) {
      console.warn("[computeCaptureJumpWaypoints] last landing != to", {
        waypoints,
        to,
      });
    }
  }
  return waypoints;
}

/**
 * Infer move endpoints from board before/after a single ply (for AI / server moves
 * that don't include from_row/to_row in the JSON).
 */
export function inferMoveEndpointsFromBoardDiff(
  boardBefore: number[][],
  boardAfter: number[][],
  mover: 1 | 2,
  captured: Array<{ row: number; col: number }>,
): { from: [number, number] | null; to: [number, number] | null } {
  const own = mover === 1 ? new Set([P1_PIECE, P1_KING]) : new Set([P2_PIECE, P2_KING]);
  const capSet = new Set(captured.map((c) => `${c.row},${c.col}`));
  let from: [number, number] | null = null;
  let to: [number, number] | null = null;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (
        own.has(boardBefore[r][c]) &&
        boardAfter[r][c] === EMPTY &&
        !capSet.has(`${r},${c}`)
      ) {
        from = [r, c];
      }
      if (own.has(boardAfter[r][c]) && boardBefore[r][c] === EMPTY) {
        to = [r, c];
      }
    }
  }
  return { from, to };
}

/** Map Django legal-moves response to `LegalDestination[]`. */
export function mapApiLegalMoves(
  moves:
    | Array<{
        to_row: number;
        to_col: number;
        captured?: Array<{ row: number; col: number }>;
      }>
    | undefined,
): LegalDestination[] {
  if (!moves || !Array.isArray(moves)) return [];
  return moves.map((m) => ({
    toRow: m.to_row,
    toCol: m.to_col,
    captured: Array.isArray(m.captured) ? m.captured : [],
  }));
}

/**
 * Client-side legal move generation — mirrors `draught-be/apps/board_engine/engine.py`
 * so selected-piece highlights appear instantly without waiting for GET /legal-moves/.
 * Server still validates on move; this is for UX only.
 *
 * Men slide forward only; captures (and multi-jumps) use all four diagonals, including backward.
 * Kings: flying slides and flying captures.
 */

import type { LegalDestination } from "@/lib/optimisticBoard";
import { BOARD_SIZE } from "@/lib/boardUtils";

const EMPTY = 0;
const P1_PIECE = 1;
const P2_PIECE = 2;
const P1_KING = 3;
const P2_KING = 4;

const P1_FORWARD: Array<[number, number]> = [
  [-1, -1],
  [-1, 1],
];
const P2_FORWARD: Array<[number, number]> = [
  [1, -1],
  [1, 1],
];
const BOTH: Array<[number, number]> = [...P1_FORWARD, ...P2_FORWARD];

function deepCloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function isPlayableTile(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isPlayer1(cell: number): boolean {
  return cell === P1_PIECE || cell === P1_KING;
}

function isPlayer2(cell: number): boolean {
  return cell === P2_PIECE || cell === P2_KING;
}

function isKingCell(cell: number): boolean {
  return cell === P1_KING || cell === P2_KING;
}

function getDirections(cell: number): Array<[number, number]> {
  if (cell === P1_KING || cell === P2_KING) return BOTH;
  if (cell === P1_PIECE) return P1_FORWARD;
  return P2_FORWARD;
}

function getOpponentPieces(cell: number): Set<number> {
  if (isPlayer1(cell)) return new Set([P2_PIECE, P2_KING]);
  return new Set([P1_PIECE, P1_KING]);
}

function applyCapture(
  board: number[][],
  start: [number, number],
  dest: [number, number],
  captured: Array<[number, number]>,
): number[][] {
  const b = deepCloneBoard(board);
  const [r0, c0] = start;
  const [r1, c1] = dest;
  const cell = b[r0][c0];
  b[r1][c1] = cell;
  b[r0][c0] = EMPTY;
  for (const [r, c] of captured) {
    b[r][c] = EMPTY;
  }
  // Crown only after full move ends on promotion row (applyCaptureSequence applies that).
  return b;
}

/**
 * Replay a full capture chain hop-by-hop (matches Django `apply_move` for multi-jumps).
 * Crowning only when the chain's final landing square is on the promotion rank.
 */
export function applyCaptureSequence(
  board: number[][],
  from: [number, number],
  to: [number, number],
  captured: Array<{ row: number; col: number }>,
): number[][] {
  const rest = captured.map((c) => ({ row: c.row, col: c.col }));

  function recurse(
    b: number[][],
    pos: [number, number],
    caps: Array<{ row: number; col: number }>,
  ): number[][] {
    if (caps.length === 0) {
      if (pos[0] !== to[0] || pos[1] !== to[1]) {
        throw new Error("capture chain does not end at declared destination");
      }
      return b;
    }
    const want = caps[0];
    const hops = getNextCaptureHops(b, pos);
    for (const h of hops) {
      if (h.captured.length !== 1) continue;
      const [cr, cc] = h.captured[0];
      if (cr !== want.row || cc !== want.col) continue;
      const b2 = applyCapture(b, pos, h.dest, h.captured);
      try {
        return recurse(b2, h.dest, caps.slice(1));
      } catch {
        continue;
      }
    }
    throw new Error("illegal capture chain");
  }

  const bDone = recurse(deepCloneBoard(board), from, rest);
  const [tr, tc] = to;
  const out = deepCloneBoard(bDone);
  const cell = out[tr][tc];
  if (cell === P1_PIECE && tr === 0) out[tr][tc] = P1_KING;
  else if (cell === P2_PIECE && tr === BOARD_SIZE - 1) out[tr][tc] = P2_KING;
  return out;
}

type MoveEntry = { dest: [number, number]; captured: Array<[number, number]> };

function enumerateKingFlyingHops(board: number[][], fr: [number, number]): MoveEntry[] {
  const [r, c] = fr;
  const cell = board[r][c];
  if (!isKingCell(cell)) return [];
  const opponent = getOpponentPieces(cell);
  const captures: MoveEntry[] = [];
  for (const [dr, dc] of BOTH) {
    let k = 1;
    for (;;) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (!inBounds(nr, nc)) break;
      const here = board[nr][nc];
      if (opponent.has(here)) {
        let lr = nr + dr;
        let lc = nc + dc;
        while (
          inBounds(lr, lc) &&
          board[lr][lc] === EMPTY &&
          isPlayableTile(lr, lc)
        ) {
          captures.push({ dest: [lr, lc], captured: [[nr, nc]] });
          lr += dr;
          lc += dc;
        }
        break;
      }
      if (here !== EMPTY) break;
      k += 1;
    }
  }
  return captures;
}

function enumerateMenAdjacentHops(board: number[][], fr: [number, number]): MoveEntry[] {
  const [r, c] = fr;
  const cell = board[r][c];
  if (cell !== P1_PIECE && cell !== P2_PIECE) return [];
  const opponent = getOpponentPieces(cell);
  const captures: MoveEntry[] = [];
  for (const [dr, dc] of BOTH) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    const ncell = board[nr][nc];
    if (opponent.has(ncell)) {
      const jr = nr + dr;
      const jc = nc + dc;
      if (
        inBounds(jr, jc) &&
        board[jr][jc] === EMPTY &&
        isPlayableTile(jr, jc)
      ) {
        captures.push({ dest: [jr, jc], captured: [[nr, nc]] });
      }
    }
  }
  return captures;
}

function getNextCaptureHops(board: number[][], pos: [number, number]): MoveEntry[] {
  const [r, c] = pos;
  const cell = board[r][c];
  if (cell === EMPTY) return [];
  if (isKingCell(cell)) return enumerateKingFlyingHops(board, pos);
  return enumerateMenAdjacentHops(board, pos);
}

function enumerateKingQuietSlides(board: number[][], fr: [number, number]): MoveEntry[] {
  const [r, c] = fr;
  const cell = board[r][c];
  if (!isKingCell(cell)) return [];
  const moves: MoveEntry[] = [];
  for (const [dr, dc] of BOTH) {
    let k = 1;
    for (;;) {
      const nr = r + dr * k;
      const nc = c + dc * k;
      if (!inBounds(nr, nc)) break;
      if (board[nr][nc] !== EMPTY || !isPlayableTile(nr, nc)) break;
      moves.push({ dest: [nr, nc], captured: [] });
      k += 1;
    }
  }
  return moves;
}

function extendGenericCaptures(
  board: number[][],
  start: [number, number],
  partial: MoveEntry[],
): MoveEntry[] {
  const result: MoveEntry[] = [];
  for (const { dest, captured } of partial) {
    const b2 = applyCapture(board, start, dest, captured);
    const nextHops = getNextCaptureHops(b2, dest);
    if (nextHops.length === 0) {
      result.push({ dest, captured });
      continue;
    }
    for (const nh of nextHops) {
      const newCap: Array<[number, number]> = [...captured, ...nh.captured];
      const extended = extendGenericCaptures(b2, dest, [
        { dest: nh.dest, captured: newCap },
      ]);
      result.push(...extended);
    }
  }
  return result;
}

function getKingLegalMoves(
  board: number[][],
  fr: [number, number],
  mustCapture: boolean,
): MoveEntry[] {
  const [row, col] = fr;
  const cell = board[row][col];
  if (!isKingCell(cell)) return [];
  const captures = enumerateKingFlyingHops(board, fr);
  if (captures.length > 0) {
    return extendGenericCaptures(board, fr, captures);
  }
  if (mustCapture) return [];
  return enumerateKingQuietSlides(board, fr);
}

function anyCapturesAvailable(board: number[][], player: 1 | 2): boolean {
  const cells =
    player === 1
      ? new Set([P1_PIECE, P1_KING])
      : new Set([P2_PIECE, P2_KING]);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!cells.has(board[r][c])) continue;
      const moves = getLegalMovesRaw(board, [r, c], false);
      if (moves.some((m) => m.captured.length > 0)) return true;
    }
  }
  return false;
}

function getLegalMovesRaw(
  board: number[][],
  fr: [number, number],
  mustCapture: boolean,
): MoveEntry[] {
  const [row, col] = fr;
  const cell = board[row][col];
  if (cell === EMPTY) return [];
  if (isKingCell(cell)) {
    return getKingLegalMoves(board, fr, mustCapture);
  }
  const slideDirs = getDirections(cell);
  const captures = enumerateMenAdjacentHops(board, fr);
  const simpleMoves: MoveEntry[] = [];
  for (const [dr, dc] of slideDirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (!inBounds(nr, nc)) continue;
    const ncell = board[nr][nc];
    if (ncell === EMPTY && isPlayableTile(nr, nc)) {
      if (!mustCapture) {
        simpleMoves.push({ dest: [nr, nc], captured: [] });
      }
    }
  }
  if (captures.length > 0) {
    return extendGenericCaptures(board, fr, captures);
  }
  if (mustCapture) return [];
  return simpleMoves;
}

/**
 * Legal destinations for the piece at (row, col), matching Django `get_moves_for_piece`.
 */
export function computeLegalDestinations(
  board: number[][],
  currentTurn: 1 | 2,
  row: number,
  col: number,
): LegalDestination[] {
  if (!inBounds(row, col)) return [];
  const cell = board[row]?.[col] ?? 0;
  if (cell === EMPTY) return [];
  if (currentTurn === 1 && !isPlayer1(cell)) return [];
  if (currentTurn === 2 && !isPlayer2(cell)) return [];

  const mustCapture = anyCapturesAvailable(board, currentTurn);
  const moves = getLegalMovesRaw(board, [row, col], mustCapture);
  return moves.map((m) => ({
    toRow: m.dest[0],
    toCol: m.dest[1],
    captured: m.captured.map(([r, c]) => ({ row: r, col: c })),
  }));
}

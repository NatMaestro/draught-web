/**
 * Authoritative local game rules for offline play — built on the same move
 * graph as `clientLegalMoves.ts` / Django `board_engine.engine`.
 */

import { BOARD_SIZE } from "@/lib/boardUtils";
import { computeLegalDestinations } from "@/lib/clientLegalMoves";
import { applyOptimisticMove } from "@/lib/optimisticBoard";

const P1_PIECE = 1;
const P2_PIECE = 2;
const P1_KING = 3;
const P2_KING = 4;

function countPieces(board: number[][], player: 1 | 2): number {
  const set =
    player === 1
      ? new Set([P1_PIECE, P1_KING])
      : new Set([P2_PIECE, P2_KING]);
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (set.has(board[r]?.[c] ?? 0)) n++;
    }
  }
  return n;
}

/**
 * Win by material: opponent has at most one piece left.
 * Returns the **winning** player seat (matches `check_win_loss` in Python).
 */
export function checkWinLoss(board: number[][]): 1 | 2 | null {
  const p1c = countPieces(board, 1);
  const p2c = countPieces(board, 2);
  if (p1c <= 1) return 2;
  if (p2c <= 1) return 1;
  return null;
}

function playerHasAnyLegalMove(board: number[][], player: 1 | 2): boolean {
  const cells =
    player === 1
      ? new Set([P1_PIECE, P1_KING])
      : new Set([P2_PIECE, P2_KING]);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!cells.has(board[r]?.[c] ?? 0)) continue;
      const dests = computeLegalDestinations(board, player, r, c);
      if (dests.length > 0) return true;
    }
  }
  return false;
}

/**
 * After `board` is updated, `playerToMove` is the side that must reply
 * (matches `get_game_status` in `engine.py`).
 */
export function getWinnerIfAny(
  board: number[][],
  playerToMove: 1 | 2,
): 1 | 2 | null {
  const mat = checkWinLoss(board);
  if (mat != null) return mat;
  if (!playerHasAnyLegalMove(board, playerToMove)) {
    return playerToMove === 1 ? 2 : 1;
  }
  return null;
}

export type LocalMoveResult = {
  board: number[][];
  capturedSquares: Array<{ row: number; col: number }>;
  /** Piece cell values (1–4) removed from those squares before the move. */
  capturedPieceValues: number[];
};

/**
 * If `from` → `to` is legal for `player`, return the new board and capture metadata.
 */
export function tryApplyLocalMove(
  board: number[][],
  player: 1 | 2,
  from: [number, number],
  to: [number, number],
): LocalMoveResult | null {
  const [fr, fc] = from;
  const dests = computeLegalDestinations(board, player, fr, fc);
  const hit = dests.find((d) => d.toRow === to[0] && d.toCol === to[1]);
  if (!hit) return null;
  const capturedPieceValues = hit.captured.map(({ row, col }) => {
    return board[row]?.[col] ?? 0;
  });
  const next = applyOptimisticMove(board, from, to, hit.captured);
  return {
    board: next,
    capturedSquares: hit.captured,
    capturedPieceValues,
  };
}

/**
 * Practice-only AI for offline play — not guaranteed to match Django `get_ai_move`.
 */

import { computeLegalDestinations } from "@/lib/clientLegalMoves";
import { nextTurnAfter } from "@/lib/optimisticBoard";
import { getWinnerIfAny, tryApplyLocalMove } from "@/lib/offlineEngine";
import type { LegalDestination } from "@/lib/optimisticBoard";
import { BOARD_SIZE } from "@/lib/boardUtils";

const P1_PIECE = 1;
const P2_PIECE = 2;
const P1_KING = 3;
const P2_KING = 4;

export type OfflineAiDifficulty = "easy" | "medium" | "hard";

export function normalizeOfflineAiDifficulty(
  raw: string | null | undefined,
): OfflineAiDifficulty {
  const d = (raw ?? "medium").toLowerCase().trim();
  if (d === "easy" || d === "beginner" || d === "novice") return "easy";
  if (
    d === "hard" ||
    d === "expert" ||
    d === "advanced" ||
    d === "master" ||
    d === "top_players" ||
    d === "top"
  ) {
    return "hard";
  }
  return "medium";
}

export type OfflineAiMove = {
  from: [number, number];
  to: [number, number];
  chosen: LegalDestination;
};

function enumerateAiMoves(
  board: number[][],
  player: 1 | 2,
): OfflineAiMove[] {
  const cells =
    player === 1
      ? new Set([P1_PIECE, P1_KING])
      : new Set([P2_PIECE, P2_KING]);
  const out: OfflineAiMove[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!cells.has(board[r]?.[c] ?? 0)) continue;
      const dests = computeLegalDestinations(board, player, r, c);
      for (const chosen of dests) {
        out.push({
          from: [r, c],
          to: [chosen.toRow, chosen.toCol],
          chosen,
        });
      }
    }
  }
  return out;
}

/** Static evaluation from Black / P2’s perspective (higher = better for the AI). */
export function evaluateOfflineBoard(board: number[][]): number {
  let s = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      const centerDist = Math.abs(r - 4.5) + Math.abs(c - 4.5);
      const kingCenter = (10 - centerDist) * 0.035;
      if (cell === P1_PIECE) {
        s -= 1 + (0.14 * (9 - r)) / 9;
      } else if (cell === P1_KING) {
        s -= 2.2 + kingCenter;
      } else if (cell === P2_PIECE) {
        s += 1 + (0.14 * r) / 9;
      } else if (cell === P2_KING) {
        s += 2.2 + kingCenter;
      }
    }
  }
  return s;
}

function isHeavyHardEngineKey(k: string | undefined): boolean {
  if (!k?.trim()) return false;
  const d = k.trim().toLowerCase();
  return (
    d === "expert" ||
    d === "master" ||
    d === "top_players" ||
    d === "top"
  );
}

function minimaxScore(
  board: number[][],
  playerToMove: 1 | 2,
  depth: number,
  alpha: number,
  beta: number,
  deadlineMs: number,
): number {
  if (Date.now() > deadlineMs) {
    return evaluateOfflineBoard(board);
  }

  const terminal = getWinnerIfAny(board, playerToMove);
  if (terminal != null) {
    return terminal === 2 ? 10_000 : -10_000;
  }
  if (depth === 0) {
    return evaluateOfflineBoard(board);
  }

  const moves = enumerateAiMoves(board, playerToMove);
  if (moves.length === 0) {
    return playerToMove === 2 ? -10_000 : 10_000;
  }

  if (playerToMove === 2) {
    let v = -Infinity;
    for (const m of moves) {
      const ap = tryApplyLocalMove(board, 2, m.from, m.to);
      if (!ap) continue;
      const next = nextTurnAfter(2);
      const sc = minimaxScore(ap.board, next, depth - 1, alpha, beta, deadlineMs);
      v = Math.max(v, sc);
      alpha = Math.max(alpha, v);
      if (beta <= alpha) break;
    }
    return v;
  }

  let v = Infinity;
  for (const m of moves) {
    const ap = tryApplyLocalMove(board, 1, m.from, m.to);
    if (!ap) continue;
    const next = nextTurnAfter(1);
    const sc = minimaxScore(ap.board, next, depth - 1, alpha, beta, deadlineMs);
    v = Math.min(v, sc);
    beta = Math.min(beta, v);
    if (beta <= alpha) break;
  }
  return v;
}

/**
 * Pick a legal move for player 2 (the AI). Returns null only if there are no moves.
 * @param rosterEngineKey — optional `BotDef.engineKey`; expert/master/top get deeper minimax.
 */
export function pickOfflineAiMove(
  board: number[][],
  difficulty: OfflineAiDifficulty,
  random: () => number,
  rosterEngineKey?: string,
): OfflineAiMove | null {
  const moves = enumerateAiMoves(board, 2);
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    return moves[Math.floor(random() * moves.length)]!;
  }

  if (difficulty === "medium") {
    const caps = moves.filter((m) => m.chosen.captured.length > 0);
    const pool = caps.length > 0 ? caps : moves;
    return pool[Math.floor(random() * pool.length)]!;
  }

  const heavy = isHeavyHardEngineKey(rosterEngineKey);
  const lookahead = heavy ? 3 : 2;
  const deadlineMs = Date.now() + (heavy ? 165 : 95);
  let best: OfflineAiMove = moves[0]!;
  let bestScore = -Infinity;

  for (const m of moves) {
    const ap = tryApplyLocalMove(board, 2, m.from, m.to);
    if (!ap) continue;
    const next = nextTurnAfter(2);
    const instant = getWinnerIfAny(ap.board, next);
    if (instant === 2) {
      return m;
    }
    const score = minimaxScore(
      ap.board,
      next,
      lookahead,
      -Infinity,
      Infinity,
      deadlineMs,
    );
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }

  return best;
}

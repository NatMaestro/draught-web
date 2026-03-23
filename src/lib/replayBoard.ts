import { createInitialBoard } from "@/lib/boardUtils";
import { applyOptimisticMove } from "@/lib/optimisticBoard";
import type { GameMoveApi } from "@/lib/api";

/**
 * Board position after applying the first `moveCount` plies from the start.
 */
export function boardAfterPlyCount(
  moves: GameMoveApi[],
  moveCount: number,
): number[][] {
  let board = createInitialBoard();
  const n = Math.max(0, Math.min(moveCount, moves.length));
  for (let i = 0; i < n; i++) {
    const m = moves[i]!;
    const captured =
      "captured" in m && Array.isArray(m.captured) ? m.captured : [];
    board = applyOptimisticMove(
      board,
      [m.from_row, m.from_col],
      [m.to_row, m.to_col],
      captured,
    );
  }
  return board;
}

/** Side to move on the board after `pliesApplied` plies have been played (0 = P1 opens). */
export function nextTurnAfterPlyCount(pliesApplied: number): 1 | 2 {
  return pliesApplied % 2 === 0 ? 1 : 2;
}

import { describe, expect, it } from "vitest";
import { createInitialBoard } from "@/lib/boardUtils";
import {
  checkWinLoss,
  getWinnerIfAny,
  tryApplyLocalMove,
} from "@/lib/offlineEngine";

describe("offlineEngine", () => {
  it("starting position: no winner, both sides can move", () => {
    const b = createInitialBoard();
    expect(checkWinLoss(b)).toBeNull();
    expect(getWinnerIfAny(b, 1)).toBeNull();
  });

  it("tryApplyLocalMove rejects illegal slide", () => {
    const b = createInitialBoard();
    const r = tryApplyLocalMove(b, 1, [9, 1], [7, 1]);
    expect(r).toBeNull();
  });

  it("tryApplyLocalMove applies a legal P1 quiet move", () => {
    const b = createInitialBoard();
    const r = tryApplyLocalMove(b, 1, [6, 0], [5, 1]);
    expect(r).not.toBeNull();
    expect(r!.board[6][0]).toBe(0);
    expect(r!.board[5][1]).toBe(1);
    expect(r!.capturedPieceValues).toEqual([]);
  });

  it("material win: one side reduced to one piece", () => {
    const b = createInitialBoard();
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        b[r][c] = 0;
      }
    }
    b[5][5] = 1;
    b[4][4] = 2;
    expect(checkWinLoss(b)).toBe(2);
  });

});

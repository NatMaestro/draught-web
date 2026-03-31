import { describe, expect, it } from "vitest";
import { createInitialBoard } from "@/lib/boardUtils";
import {
  evaluateOfflineBoard,
  normalizeOfflineAiDifficulty,
  pickOfflineAiMove,
} from "@/lib/offlineAi";

describe("offlineAi", () => {
  it("normalizeOfflineAiDifficulty maps aliases", () => {
    expect(normalizeOfflineAiDifficulty("expert")).toBe("hard");
    expect(normalizeOfflineAiDifficulty("beginner")).toBe("easy");
    expect(normalizeOfflineAiDifficulty(null)).toBe("medium");
  });

  it("starting position: symmetric eval near zero", () => {
    const b = createInitialBoard();
    const e = evaluateOfflineBoard(b);
    expect(Math.abs(e)).toBeLessThan(0.5);
  });

  it("pickOfflineAiMove returns a legal P2 move from standard start", () => {
    const b = createInitialBoard();
    const rng = () => 0.42;
    const m = pickOfflineAiMove(b, "easy", rng);
    expect(m).not.toBeNull();
    expect(m!.from[0]).toBeGreaterThanOrEqual(0);
    expect(m!.to[0]).toBeGreaterThan(m!.from[0]);
  });

  it("pickOfflineAiMove accepts optional roster engine key for hard mode", () => {
    const b = createInitialBoard();
    const rng = () => 0.42;
    const m = pickOfflineAiMove(b, "hard", rng, "expert");
    expect(m).not.toBeNull();
  });
});

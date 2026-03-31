import type { OfflineAiDifficulty } from "@/lib/offlineAi";

export const DEFAULT_OFFLINE_MATCH_TARGET = 5;

/** Passed from PlayLocal → Offline via router state (+ optional session mirror). */
export type OfflineMatchSetup = {
  p1Name: string;
  p2Name: string;
  aiMode: boolean;
  /** Ignored when `aiMode` is false. */
  aiDifficulty: OfflineAiDifficulty;
  /** Roster id from `aiBots` — persona, banter tier, and optional deeper search. */
  offlineBotId?: string;
  matchTargetWins: number;
};

export type OfflineMiniResult = {
  winner: 1 | 2;
  /** Plies in that board (after it finished). */
  plyCount: number;
};

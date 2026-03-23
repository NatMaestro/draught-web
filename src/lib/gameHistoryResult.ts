import type { GameHistoryItem } from "@/lib/api";

function winnerUserId(game: GameHistoryItem): number | null {
  const w = game.winner;
  if (w == null) return null;
  if (typeof w === "number" && Number.isFinite(w)) return w;
  if (typeof w === "string") {
    const n = Number.parseInt(w, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Outcome for the signed-in user from a finished game row.
 */
export function historyResultForUser(
  game: GameHistoryItem,
  userId: number,
): "win" | "loss" | "draw" {
  if (game.is_local_2p) return "draw";
  const wid = winnerUserId(game);
  if (wid == null) return "draw";
  if (wid === userId) return "win";
  return "loss";
}

export function opponentLabel(
  game: GameHistoryItem,
  userId: number,
): string {
  if (game.is_ai_game) return "AI";
  if (game.is_local_2p) return "Local 2P";
  const p1 = game.player_one;
  const p2 = game.player_two;
  const p1id = p1?.id;
  const p2id = p2?.id;
  if (p1id === userId && p2?.username) return p2.username;
  if (p2id === userId && p1?.username) return p1.username;
  return "Opponent";
}

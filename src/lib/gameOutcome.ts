import type { GameDetail, GamePlayerPublic } from "@/lib/api";

function parseWinnerId(
  w: GameDetail["winner"],
): number | null {
  if (w == null || w === "") return null;
  if (typeof w === "number") {
    if (w === 1 || w === 2) return w;
    return w;
  }
  if (typeof w === "object" && w !== null && "id" in w) {
    const id = Number((w as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  if (typeof w === "string") {
    if (w === "1" || w === "2") return Number(w);
    const n = Number(w);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Normalize API `winner` (1, 2, or user id) to seat 1 | 2 for UI.
 */
export function winnerSeatFromGameDetail(data: GameDetail): 1 | 2 | null {
  const st = data.status ?? "active";
  if (st !== "finished" && st !== "abandoned") return null;

  const raw = parseWinnerId(data.winner);
  if (raw === 1 || raw === 2) return raw;

  const p1 = data.player_one;
  const p2 = data.player_two;
  const id1 =
    p1 && typeof p1 === "object" && "id" in p1
      ? (p1 as GamePlayerPublic).id
      : null;
  const id2 =
    p2 && typeof p2 === "object" && "id" in p2
      ? (p2 as GamePlayerPublic).id
      : null;
  if (raw != null && Number.isFinite(raw)) {
    if (id1 != null && raw === id1) return 1;
    if (id2 != null && raw === id2) return 2;
  }
  return null;
}

export type GameOutcomeCopy = {
  /** Main headline */
  title: string;
  /** Secondary line (e.g. resignation) */
  subtitle: string | null;
  /** For styling: win / lose / neutral */
  tone: "win" | "lose" | "neutral";
};

export type GameOutcomeContext = {
  winnerSeat: 1 | 2 | null;
  endedByResign: boolean;
  /** Loss on time (flag / clock). */
  endedByTimeout?: boolean;
  isAiGame: boolean;
  isLocal2p: boolean;
  isOnlinePvp: boolean;
  mySeat: 1 | 2 | null;
  /** Display name for local P1 / you in AI */
  username: string | null;
  opponentUsername: string | null;
  /** Match ended without the loser winning any mini-game (e.g. 5–0). */
  matchIsRaw?: boolean;
};

/**
 * Person-friendly game over copy for the current viewer.
 */
export function getGameOutcomeCopy(ctx: GameOutcomeContext): GameOutcomeCopy {
  const {
    winnerSeat,
    endedByResign,
    endedByTimeout = false,
    isAiGame,
    isLocal2p,
    isOnlinePvp,
    mySeat,
  } = ctx;

  if (winnerSeat == null) {
    return {
      title: "Game over",
      subtitle: null,
      tone: "neutral",
    };
  }

  if (isAiGame) {
    const humanWon = winnerSeat === 1;
    return {
      title: humanWon ? "You won!" : "AI wins",
      subtitle: endedByTimeout
        ? humanWon
          ? "AI ran out of time."
          : "You ran out of time."
        : humanWon
          ? endedByResign
            ? "The AI resigned."
            : "Great game!"
          : endedByResign
            ? "You resigned."
            : "Better luck next time!",
      tone: humanWon ? "win" : "lose",
    };
  }

  if (isLocal2p) {
    const label = winnerSeat === 1 ? "Player 1" : "Player 2";
    return {
      title: `${label} wins!`,
      subtitle: endedByTimeout
        ? "The other player ran out of time."
        : endedByResign
          ? "Game ended by resignation."
          : "Same device — nice match!",
      tone: "neutral",
    };
  }

  if (isOnlinePvp && mySeat != null) {
    const iWon = winnerSeat === mySeat;
    const oppName = ctx.opponentUsername?.trim() || "Opponent";
    const rawNote = ctx.matchIsRaw
      ? iWon
        ? " They never took a mini-game."
        : " They won every mini-game."
      : "";
    if (iWon) {
      const sub = endedByTimeout
        ? `${oppName} ran out of time.`
        : endedByResign
          ? `${oppName} resigned.`
          : "Victory is yours!";
      return {
        title: "You won!",
        subtitle: sub + rawNote,
        tone: "win",
      };
    }
    const sub2 = endedByTimeout
      ? "You ran out of time."
      : endedByResign
        ? "You resigned."
        : `${oppName} took the win.`;
    return {
      title: "You lost",
      subtitle: sub2 + rawNote,
      tone: "lose",
    };
  }

  // Fallback (online seat unknown, etc.)
  return {
    title: winnerSeat === 1 ? "Player 1 wins!" : "Player 2 wins!",
    subtitle: endedByTimeout ? "Time ran out." : null,
    tone: "neutral",
  };
}

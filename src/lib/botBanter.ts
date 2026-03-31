/**
 * Lightweight persona lines for vs-AI — no server; makes the wait feel intentional.
 */

export type BotBanterContext = {
  /** Squares the human captured this ply (0 if none). */
  captureCount: number;
  /** Server move_count after the human's move (P1 plies are odd). */
  moveCountAfterHuman: number;
  /** Backend ai_difficulty / engine key. */
  engineKey: string;
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const OPENING = [
  "Let's see what you've got.",
  "Your move — I'm watching.",
  "Interesting start.",
  "Okay, we're rolling.",
] as const;

const QUIET = [
  "Hmm…",
  "Let me think.",
  "Working through it.",
  "One moment.",
  "Right…",
] as const;

const AFTER_CAPTURE = [
  "Sharp — I'll have to respect that.",
  "Nice take. I noticed.",
  "That's going to leave a mark.",
  "Bold capture.",
  "Okay, you came to play.",
] as const;

const AFTER_BIG_HIT = [
  "Ouch. I'll need to tighten up.",
  "That's a lot of material — interesting.",
  "You don't miss those. Fair enough.",
] as const;

const TAUNT_LOW = [
  "I'll find something here.",
  "Still plenty of board left.",
  "Not over yet.",
] as const;

const EXPERTISH = [
  "Let me calculate a reply.",
  "Tactical noise — I like it.",
  "Depth time.",
] as const;

function strengthTier(engineKey: string): "soft" | "mid" | "hard" {
  const k = engineKey.trim().toLowerCase();
  if (
    k === "expert" ||
    k === "master" ||
    k === "top_players" ||
    k === "top"
  ) {
    return "hard";
  }
  if (k === "hard" || k === "advanced") {
    return "mid";
  }
  return "soft";
}

/**
 * Returns a short line to show in the bot speech bubble after the human plays.
 */
export function pickBotBanter(ctx: BotBanterContext): string {
  const { captureCount, moveCountAfterHuman, engineKey } = ctx;
  const tier = strengthTier(engineKey);

  if (moveCountAfterHuman <= 1) {
    return pick(OPENING);
  }

  if (captureCount >= 2) {
    return pick(AFTER_BIG_HIT);
  }
  if (captureCount >= 1) {
    return pick(AFTER_CAPTURE);
  }

  if (tier === "hard") {
    if (Math.random() < 0.4) return pick(EXPERTISH);
    return pick(QUIET);
  }
  if (tier === "mid") {
    if (Math.random() < 0.35) return pick(TAUNT_LOW);
    return pick(QUIET);
  }
  return pick(QUIET);
}

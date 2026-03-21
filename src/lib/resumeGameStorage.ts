/**
 * Persists the last in-progress game for "Resume" on the home screen + client-only
 * capture tallies (server GET does not return cumulative captures).
 *
 * Single slot: starting a new game overwrites the previous resume entry.
 */

/** Exported for `storage` event listeners (e.g. Home refresh). */
export const RESUME_STORAGE_KEY = "draught:resume:v1";

export type ResumeGameSnapshot = {
  gameId: string;
  updatedAt: number;
  isAiGame: boolean;
  /** Last known server status (e.g. active, finished). */
  status: string;
  p1CapturedPieces: number[];
  p2CapturedPieces: number[];
  /** PNG data URL of the board (small). */
  thumbnailDataUrl?: string;
};

function safeParse(raw: string | null): ResumeGameSnapshot | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as ResumeGameSnapshot;
    if (!o || typeof o.gameId !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function loadResumeSnapshot(): ResumeGameSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    return safeParse(localStorage.getItem(RESUME_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveResumeSnapshot(
  patch: Partial<ResumeGameSnapshot> & { gameId: string },
): void {
  if (typeof window === "undefined") return;
  try {
    const prev = safeParse(localStorage.getItem(RESUME_STORAGE_KEY));
    const next: ResumeGameSnapshot = {
      gameId: patch.gameId,
      updatedAt: Date.now(),
      isAiGame: patch.isAiGame ?? prev?.isAiGame ?? false,
      status: patch.status ?? prev?.status ?? "active",
      p1CapturedPieces: patch.p1CapturedPieces ?? prev?.p1CapturedPieces ?? [],
      p2CapturedPieces: patch.p2CapturedPieces ?? prev?.p2CapturedPieces ?? [],
      thumbnailDataUrl: patch.thumbnailDataUrl ?? prev?.thumbnailDataUrl,
    };
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function clearResumeSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch {
    /* */
  }
}

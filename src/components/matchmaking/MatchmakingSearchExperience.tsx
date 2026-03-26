import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Simulated “players in the pool” — not real API data; UX only. */
const MOCK_PROFILES = [
  { id: "a", name: "Alex", rating: 1380 },
  { id: "b", name: "Sam", rating: 1424 },
  { id: "c", name: "Jordan", rating: 1355 },
  { id: "d", name: "Riley", rating: 1460 },
  { id: "e", name: "Casey", rating: 1310 },
  { id: "f", name: "Morgan", rating: 1395 },
  { id: "g", name: "Quinn", rating: 1442 },
  { id: "h", name: "Jamie", rating: 1372 },
] as const;

const STATUS_CASUAL = [
  "Scanning who’s online right now…",
  "Checking casual queues in your region…",
  "Looking for players with similar time settings…",
  "Almost there — balancing wait time vs a fair match…",
  "Still searching — good games are worth a short wait…",
] as const;

const STATUS_RANKED = [
  "Scanning ranked players near your rating…",
  "Checking ELO bands — we start close, then widen slightly…",
  "Comparing your rating with active opponents…",
  "Searching for a competitive, fair pairing…",
  "Still matching — ranked games prioritize rating fit…",
] as const;

const PROFILE_CYCLE_MS = 950;
const MESSAGE_CYCLE_MS = 3200;
const ELAPSED_TICK_MS = 1000;

type Props = {
  ranked: boolean;
  /** User’s rating when known (ranked UI); optional for casual. */
  userRating: number | null;
  onCancel: () => void;
};

/**
 * Full-screen search panel: simulated profile scan, rotating status copy, elapsed timer.
 * Timeout is handled by the parent (`PlayMatchmakingPage`).
 */
export function MatchmakingSearchExperience({
  ranked,
  userRating,
  onCancel,
}: Props) {
  const [profileIdx, setProfileIdx] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  const messages = ranked ? STATUS_RANKED : STATUS_CASUAL;

  useEffect(() => {
    const id = window.setInterval(() => {
      setProfileIdx((i) => (i + 1) % MOCK_PROFILES.length);
    }, PROFILE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % messages.length);
    }, MESSAGE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [messages.length]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, ELAPSED_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const statusLine = messages[msgIdx % messages.length];

  const ring = useMemo(
    () =>
      userRating != null && ranked
        ? `Near your ${userRating} rating`
        : "Online matchmaking",
    [userRating, ranked],
  );

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-header/25 bg-gradient-to-b from-sheet/95 to-cream/90 shadow-card"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="border-b border-header/15 bg-header/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Matchmaking
        </p>
        <p className="mt-0.5 text-sm font-bold text-text">Finding you an opponent</p>
        <p className="mt-1 text-xs text-muted">{ring}</p>
      </div>

      <div className="relative px-3 py-5">
        <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
          Scanning player pool
        </p>

        <div className="relative mx-auto flex h-[150px] max-w-sm items-center justify-center">
          {([-1, 0, 1] as const).map((slot) => {
            const i =
              (profileIdx + slot + MOCK_PROFILES.length) % MOCK_PROFILES.length;
            const p = MOCK_PROFILES[i];
            const isCenter = slot === 0;
            const x = slot === 0 ? 0 : slot === 1 ? 92 : -92;
            const scale = isCenter ? 1 : 0.82;
            const opacity = isCenter ? 1 : 0.42;

            return (
              <motion.div
                key={slot}
                layout
                initial={false}
                animate={{ x, scale, opacity }}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="absolute flex w-[min(44%,148px)] flex-col items-center rounded-2xl border border-header/20 bg-cream px-3 py-3 shadow-md"
                style={{ zIndex: isCenter ? 10 : 1 }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-text ring-2 ring-header/30"
                  style={{ backgroundColor: "#F5E6A8" }}
                  aria-hidden
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-2 w-full truncate text-center text-xs font-bold text-text">
                  {p.name}
                </p>
                <p className="text-[10px] text-muted">{p.rating} ELO</p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-muted/90">
                  {isCenter ? "Checking…" : "—"}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mx-auto mt-4 min-h-[3rem] max-w-md px-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusLine}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-center text-sm leading-snug text-text"
            >
              {statusLine}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-600"
            aria-hidden
          />
          <span className="tabular-nums">
            Searching — {Math.floor(elapsedSec / 60)}:
            {(elapsedSec % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <p className="mt-3 text-center text-[10px] text-muted/80">
          Profile cards are illustrative — your real match comes from the live queue.
        </p>
      </div>

      <div className="border-t border-header/15 px-4 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-header/35 bg-cream py-3 text-sm font-semibold text-text transition hover:bg-sheet"
        >
          Cancel search
        </button>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DEFAULT_OFFLINE_MATCH_TARGET,
  type OfflineMatchSetup,
} from "@/lib/offlineMatchTypes";

const STORAGE_KEY = "draughtOfflineSetup";

function normalizeName(raw: string, fallback: string): string {
  const t = raw.trim();
  return t.length > 0 ? t.slice(0, 48) : fallback;
}

/**
 * Pass &amp; play on one device only — no server, no AI.
 * Device AI lives under Play with a bot → “This device”.
 */
export function PlayLocalPage() {
  const navigate = useNavigate();
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");

  const targetWins = DEFAULT_OFFLINE_MATCH_TARGET;

  const canStart = useMemo(() => {
    return (
      normalizeName(p1Name, "Player 1").length > 0 &&
      normalizeName(p2Name, "Player 2").length > 0
    );
  }, [p1Name, p2Name]);

  const startPassAndPlay = () => {
    const setup: OfflineMatchSetup = {
      p1Name: normalizeName(p1Name, "Player 1"),
      p2Name: normalizeName(p2Name, "Player 2"),
      aiMode: false,
      aiDifficulty: "medium",
      matchTargetWins: targetWins,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
    } catch {
      /* quota / private */
    }
    navigate("/play/offline", { state: setup });
  };

  return (
    <div className="min-h-[100dvh] bg-cream bg-mesh-radial safe-x pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-mesh-radial-dark">
      <Link to="/play" className="text-sm font-semibold text-text hover:underline">
        ← Back
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-8 max-w-md"
      >
        <h1 className="font-display text-3xl text-text">Pass &amp; play</h1>
        <p className="mt-2 text-sm text-muted">
          Two humans on this device — no account or server. The board stays
          fixed (Player 1 at the bottom, Player 2 at the top). Match is first to{" "}
          <strong className="font-semibold text-text">{targetWins}</strong>{" "}
          board wins. For practice against the computer, use{" "}
          <Link to="/play/ai" className="font-semibold text-text underline">
            Play with a bot
          </Link>{" "}
          and choose <strong className="font-semibold text-text">This device</strong>.
        </p>

        <div className="mt-8 space-y-4 rounded-2xl border border-header/15 bg-sheet/70 p-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Player 1 name (bottom)
            </span>
            <input
              type="text"
              value={p1Name}
              onChange={(e) => setP1Name(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-header/25 bg-cream px-3 py-2.5 text-sm text-text"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Player 2 name (top)
            </span>
            <input
              type="text"
              value={p2Name}
              onChange={(e) => setP2Name(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-header/25 bg-cream px-3 py-2.5 text-sm text-text"
              autoComplete="off"
            />
          </label>
        </div>

        <motion.button
          type="button"
          disabled={!canStart}
          whileTap={{ scale: 0.98 }}
          onClick={startPassAndPlay}
          className="mt-8 flex w-full items-center justify-center rounded-2xl bg-active py-4 text-base font-bold text-text shadow-md disabled:opacity-50"
        >
          Start match
        </motion.button>
      </motion.div>
    </div>
  );
}

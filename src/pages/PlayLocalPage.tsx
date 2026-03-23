import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { gamesApi } from "@/lib/api";

function parseMinutes(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 120 ? n : null;
}

export function PlayLocalPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const minutesHint = useMemo(
    () => parseMinutes(searchParams.get("minutes")),
    [searchParams],
  );
  const useClockFromHub = useMemo(
    () => searchParams.get("clock") !== "off",
    [searchParams],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.create({
        isLocal2p: true,
        useClock: useClockFromHub,
        ...(useClockFromHub &&
          minutesHint != null && {
            timeControlSec: minutesHint * 60,
          }),
      });
      navigate(`/play/game/${data.id}`, { replace: true });
    } catch {
      setError("Could not start game. Check the API and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream bg-mesh-radial safe-x pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link to="/play" className="text-sm font-semibold text-text hover:underline">
        ← Back
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-10 max-w-md"
      >
        <h1 className="font-display text-3xl text-text">Play in person</h1>
        <p className="mt-2 text-sm text-muted">
          Same device, alternating turns — pass the phone or tablet. The board
          can rotate so the active player is at the bottom (see in-game
          settings).
        </p>
        {minutesHint != null ? (
          <p className="mt-3 rounded-xl border border-header/15 bg-sheet/70 px-3 py-2 text-xs text-muted">
            Move clock from play menu:{" "}
            <strong className="text-text">{minutesHint} min</strong> — for your
            reference; not enforced in this mode yet.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <motion.button
          type="button"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          onClick={() => void startGame()}
          className="mt-10 w-full rounded-2xl py-4 text-base font-bold text-text shadow-md disabled:opacity-50"
          style={{ backgroundColor: "#EFCA83" }}
        >
          {loading ? "Creating…" : "Start game"}
        </motion.button>
      </motion.div>
    </div>
  );
}

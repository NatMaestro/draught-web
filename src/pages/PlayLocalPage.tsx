import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gamesApi } from "@/lib/api";

export function PlayLocalPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.create({ isLocal2p: true });
      navigate(`/play/game/${data.id}`, { replace: true });
    } catch {
      setError("Could not start game. Check the API and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream px-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <Link to="/play" className="text-sm font-semibold text-text hover:underline">
        ← Back
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-10 max-w-md"
      >
        <h1 className="font-display text-3xl text-text">Local 2 player</h1>
        <p className="mt-2 text-sm text-muted">
          Same device, alternating turns. The board can rotate so the active
          player is at the bottom (see in-game settings).
        </p>
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

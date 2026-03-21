import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { gamesApi } from "@/lib/api";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function PlayAIPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (difficulty: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.create({ isAi: true, aiDifficulty: difficulty });
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
        <h1 className="font-display text-3xl text-text">Play vs AI</h1>
        <p className="mt-2 text-sm text-muted">
          You are Player 1. The AI responds after each of your moves.
        </p>
        {error ? (
          <p className="mt-4 text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          {DIFFICULTIES.map((d) => (
            <motion.button
              key={d}
              type="button"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              onClick={() => void start(d)}
              className="rounded-2xl py-4 text-center text-base font-bold capitalize text-text shadow-md disabled:opacity-50"
              style={{ backgroundColor: "#D8A477" }}
            >
              {loading ? "…" : d}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

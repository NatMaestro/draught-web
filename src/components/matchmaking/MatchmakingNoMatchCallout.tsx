import { Link } from "react-router-dom";
import { motion } from "framer-motion";

type Props = {
  onTryAgain: () => void;
};

/**
 * Shown when the matchmaking search hits the client-side timeout (no opponent found in time).
 */
export function MatchmakingNoMatchCallout({ onTryAgain }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-header/25 bg-sheet/90 px-5 py-8 text-center shadow-card"
      role="status"
    >
      <p className="font-display text-xl font-bold text-text">No one available right now</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        We searched for a full minute and couldn&apos;t match you with another player — the queue
        may be quiet. Keep practicing, then try again in a little while when more people are online.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-xl bg-header py-3 text-sm font-bold text-text shadow-md"
        >
          Try again
        </button>
        <Link
          to="/play"
          className="rounded-xl border border-header/35 bg-cream py-3 text-center text-sm font-semibold text-text"
        >
          Back to play menu
        </Link>
      </div>
    </motion.div>
  );
}

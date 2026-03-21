import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export function PuzzlePage() {
  return (
    <div className="px-4 pb-28 pt-6 md:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl rounded-3xl border border-header/15 bg-white/50 p-8 shadow-card backdrop-blur-sm xl:max-w-none"
      >
        <h1 className="font-display text-3xl text-text">Puzzles</h1>
        <p className="mt-2 text-muted">
          Spot the winning sequence — coming soon to web. Same backend, same
          spirit.
        </p>
        <Link
          to="/home"
          className="mt-8 inline-block rounded-full px-6 py-3 font-semibold text-text shadow-sm"
          style={{ backgroundColor: "#EFCA83" }}
        >
          Back to home
        </Link>
      </motion.div>
    </div>
  );
}

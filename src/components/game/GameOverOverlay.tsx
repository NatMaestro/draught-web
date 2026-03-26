import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { GameOutcomeCopy } from "@/lib/gameOutcome";

type Props = {
  open: boolean;
  copy: GameOutcomeCopy;
  onNavigatePlay: (e: React.MouseEvent) => void;
};

/**
 * Full-screen game over celebration / commiseration with motion + light “toast” feel.
 */
export function GameOverOverlay({ open, copy, onNavigatePlay }: Props) {
  const tone = copy.tone;
  const panelClass =
    tone === "win"
      ? "border-emerald-500/40 bg-gradient-to-b from-emerald-50 via-sheet to-cream shadow-lg dark:from-emerald-950/95 dark:via-cream dark:to-cream dark:shadow-[0_0_60px_rgba(16,185,129,0.25)]"
      : tone === "lose"
        ? "border-header/30 bg-gradient-to-b from-rose-50/90 via-sheet to-cream dark:from-rose-950/40 dark:via-cream dark:to-cream"
        : "border-header/30 bg-sheet";

  const titleClass =
    tone === "win"
      ? "bg-gradient-to-r from-emerald-200 via-amber-100 to-emerald-200 bg-clip-text text-transparent"
      : tone === "lose"
        ? "text-amber-100/95"
        : "text-text";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/65 px-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Soft celebratory blobs (win) */}
          {tone === "win" ? (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden
            >
              <motion.div
                className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              />
              <motion.div
                className="absolute -right-16 bottom-1/4 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 18,
                  delay: 0.08,
                }}
              />
            </div>
          ) : null}

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-over-title"
            className={`relative z-10 w-full max-w-md rounded-2xl border-2 p-6 text-center shadow-2xl sm:p-8 ${panelClass}`}
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <motion.div
              className="mb-2 flex justify-center text-5xl"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.05,
              }}
              aria-hidden
            >
              {tone === "win" ? "🏆" : tone === "lose" ? "🎲" : "♟️"}
            </motion.div>

            <motion.h2
              id="game-over-title"
              className={`font-display text-3xl font-bold tracking-tight sm:text-4xl ${titleClass}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
            >
              {copy.title}
            </motion.h2>

            {copy.subtitle ? (
              <motion.p
                className="mt-3 text-sm text-muted sm:text-base dark:text-cream/85"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.35 }}
              >
                {copy.subtitle}
              </motion.p>
            ) : null}

            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.3 }}
            >
              <Link
                to="/play"
                onClick={onNavigatePlay}
                className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-active px-8 py-3.5 text-sm font-bold text-text shadow-lg transition hover:brightness-105 active:scale-[0.98]"
              >
                Back to menu
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

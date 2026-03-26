import { motion } from "framer-motion";
import { Link } from "react-router-dom";

type Props = {
  open: boolean;
  onPlayAsGuest: () => void;
  /**
   * Where to send the user after login/register (path only, e.g. `/play` or `/play/game/uuid`).
   */
  returnToPath?: string;
};

/**
 * Shown on `/play` when the user is not signed in — choose account or guest (Play hub only).
 */
export function PlayEntryAuthModal({
  open,
  onPlayAsGuest,
  returnToPath = "/play",
}: Props) {
  if (!open) return null;

  const returnTo = encodeURIComponent(returnToPath);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="play-entry-title"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-hidden
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-md rounded-3xl border border-black/10 bg-sheet p-6 text-text shadow-2xl dark:border-white/10 dark:bg-cream dark:text-white sm:mb-0"
      >
        <h2
          id="play-entry-title"
          className="font-display text-center text-xl tracking-wide text-text dark:text-white"
        >
          How do you want to play?
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Sign in to save games and resume later. Guests can play but progress
          isn&apos;t kept on your profile.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to={`/auth/login?returnTo=${returnTo}`}
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-active to-header py-3.5 text-base font-bold text-text shadow-lg transition hover:opacity-95"
          >
            Log in
          </Link>
          <Link
            to={`/auth/register?returnTo=${returnTo}`}
            className="flex w-full items-center justify-center rounded-2xl border border-black/15 bg-black/[0.04] py-3.5 text-base font-semibold text-text transition hover:bg-black/[0.08] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Create account
          </Link>
          <button
            type="button"
            onClick={onPlayAsGuest}
            className="w-full rounded-2xl border border-header/35 bg-header/10 py-3.5 text-base font-semibold text-text transition hover:bg-header/15 dark:border-cyan-500/35 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/15"
          >
            Play as guest
          </button>
        </div>
      </motion.div>
    </div>
  );
}

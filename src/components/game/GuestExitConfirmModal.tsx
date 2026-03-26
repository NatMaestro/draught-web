import { motion } from "framer-motion";
import { DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

type Props = {
  open: boolean;
  onStay: () => void;
  onLeaveAndForfeit: () => void;
  busy: boolean;
};

/**
 * Confirms leaving an in-progress game as a guest (forfeit — no saved progress).
 */
export function GuestExitConfirmModal({
  open,
  onStay,
  onLeaveAndForfeit,
  busy,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guest-exit-title"
      aria-describedby="guest-exit-desc"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border border-black/10 bg-sheet p-6 text-text shadow-2xl dark:border-white/15 dark:bg-cream dark:text-white"
      >
        <h2 id="guest-exit-title" className="font-display text-xl text-text dark:text-white">
          Leave game?
        </h2>
        <p id="guest-exit-desc" className="mt-2 text-sm leading-relaxed text-muted">
          You&apos;re playing as a guest. Leaving now will{" "}
          <strong className="text-amber-700 dark:text-amber-200">forfeit</strong> this match. Guest
          games aren&apos;t saved to a profile.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onLeaveAndForfeit}
            className="inline-flex items-center justify-center rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            <DraughtLoaderButtonContent
              loading={busy}
              loadingText="Forfeiting…"
              idleText="Leave & forfeit"
              tone="onDark"
            />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onStay}
            className="rounded-xl border border-black/15 bg-black/[0.04] px-4 py-3 text-sm font-semibold text-text transition hover:bg-black/[0.08] disabled:opacity-50 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            Stay in game
          </button>
        </div>
      </motion.div>
    </div>
  );
}

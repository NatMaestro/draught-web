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
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0f1419] p-6 text-slate-100 shadow-2xl"
      >
        <h2 id="guest-exit-title" className="font-display text-xl text-white">
          Leave game?
        </h2>
        <p id="guest-exit-desc" className="mt-2 text-sm leading-relaxed text-slate-400">
          You&apos;re playing as a guest. Leaving now will{" "}
          <strong className="text-amber-200">forfeit</strong> this match. Guest
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
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Stay in game
          </button>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ResignConfirmModalProps = {
  open: boolean;
  onCancel: () => void;
  /** Called when the user confirms — typically `void resign().then(...)` */
  onConfirm: () => void;
  /** Adjust copy for vs AI vs human opponent. */
  isAiGame?: boolean;
};

/**
 * Confirmation before resigning — avoids accidental taps on Resign.
 */
export function ResignConfirmModal({
  open,
  onCancel,
  onConfirm,
  isAiGame = false,
}: ResignConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Dismiss resign confirmation"
            className="fixed inset-0 z-[82] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          {/* Flex centering so Framer transform animations don’t strip translate(-50%,-50%) */}
          <div
            className="pointer-events-none fixed inset-0 z-[83] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 28, stiffness: 360 }}
              className="pointer-events-auto max-h-[min(90dvh,520px)] w-full max-w-[380px] overflow-y-auto rounded-2xl border border-header/30 bg-sheet p-5 shadow-2xl sm:p-6"
            >
            <h2
              id={titleId}
              className="text-lg font-bold text-text"
            >
              Resign this game?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {isAiGame
                ? "You will lose the game immediately. This cannot be undone."
                : "You will lose the game immediately. Your opponent wins."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-header/35 bg-cream px-4 py-2.5 text-sm font-semibold text-text hover:bg-sheet"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Resign
              </button>
            </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

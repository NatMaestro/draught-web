import { useEffect, useId } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ResignConfirmModalProps = {
  open: boolean;
  onCancel: () => void;
  /** Called when the user confirms — typically `void resign().then(...)` */
  onConfirm: () => void;
  /** Adjust copy for vs AI vs human opponent. */
  isAiGame?: boolean;
  /**
   * Offline (or similar) first-to-N match: offer a second action to forfeit the whole match
   * instead of only the current board. Omit or false when every game is the full match (e.g. target 1).
   */
  matchMode?: boolean;
  /** When `matchMode`, called for “resign entire match” (forfeit series). */
  onConfirmForfeitMatch?: () => void;
};

/**
 * Confirmation before resigning — avoids accidental taps on Resign.
 */
export function ResignConfirmModal({
  open,
  onCancel,
  onConfirm,
  isAiGame = false,
  matchMode = false,
  onConfirmForfeitMatch,
}: ResignConfirmModalProps) {
  const titleId = useId();
  const showMatchForfeit =
    matchMode && typeof onConfirmForfeitMatch === "function";

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
              {showMatchForfeit ? "Resign?" : "Resign this game?"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {showMatchForfeit ? (
                <>
                  <span className="font-semibold text-text">
                    This board only:
                  </span>{" "}
                  the other side wins the current game. The match continues if
                  nobody has reached the target score yet.
                  <span className="mt-3 block">
                    <span className="font-semibold text-text">
                      Entire match:
                    </span>{" "}
                    you forfeit the series; the other side wins the match now.
                    This cannot be undone.
                  </span>
                </>
              ) : isAiGame ? (
                "You will lose the game immediately. This cannot be undone."
              ) : (
                "You will lose the game immediately. Your opponent wins."
              )}
            </p>
            <div
              className={
                showMatchForfeit
                  ? "mt-6 flex flex-col gap-2"
                  : "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
              }
            >
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-header/35 bg-cream px-4 py-2.5 text-sm font-semibold text-text hover:bg-sheet"
              >
                Cancel
              </button>
              {showMatchForfeit ? (
                <>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="rounded-xl border border-red-800/50 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/60"
                  >
                    Resign this board only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onConfirmForfeitMatch();
                    }}
                    className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Resign entire match
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 sm:ml-0"
                >
                  Resign
                </button>
              )}
            </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

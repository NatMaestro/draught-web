import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Rules copy — matches `draught-be/apps/board_engine/engine.py` (10×10 draughts). */
export function GameRulesContent() {
  return (
    <ul className="space-y-2.5 text-[13px] leading-relaxed text-muted sm:text-sm">
      <li>
        <strong className="text-text">Board:</strong> 10×10. Pieces only on dark
        squares <span className="whitespace-nowrap">(row + col)</span> even —
        corner (0,0) is a dark square with a piece.
      </li>
      <li>
        <strong className="text-text">Sides:</strong> Player 1 starts in the bottom
        four rows; Player 2 in the top four. Each has 20 men.
      </li>
      <li>
        <strong className="text-text">Movement:</strong> Men move one diagonal
        step forward only (toward the opponent). Kings may slide any distance
        along a diagonal through empty squares.
      </li>
      <li>
        <strong className="text-text">Captures:</strong> Men jump over an adjacent
        enemy to the next square beyond. Men may capture in any diagonal
        direction (including backward) when a jump is available. If any capture
        is possible, you must capture (including multi-jumps in one turn when the
        engine chains them).
      </li>
      <li>
        <strong className="text-text">Kings:</strong> Promoted when a man reaches
        the far rank (P1 → row 0, P2 → row 9). A king may slide any distance
        along empty diagonals. It captures by jumping an opponent on a diagonal
        and landing on any empty square beyond it (forward, backward, or
        chained in one turn).
      </li>
      <li>
        <strong className="text-text">Win / loss:</strong> Opponent has only one
        piece left, or opponent has no legal move — you win. Resigning ends the
        game immediately.
      </li>
    </ul>
  );
}

type RulesHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RulesHelpModal({ open, onClose }: RulesHelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close rules"
            className="fixed inset-0 z-[75] bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-dialog-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-1/2 top-[max(12%,env(safe-area-inset-top))] z-[76] max-h-[min(78dvh,640px)] w-[min(92vw,400px)] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-header/25 bg-cream p-5 shadow-lift"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="rules-dialog-title"
                className="font-display text-xl font-semibold text-text"
              >
                How this game works
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-1.5 text-text hover:bg-black/10"
                aria-label="Close"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <GameRulesContent />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/** Header control — question-mark in circle. */
export function RulesHeaderIconButton({
  onClick,
  expanded,
  variant = "default",
}: {
  onClick: () => void;
  expanded: boolean;
  /** `dark` — light icon on glass/dark headers (e.g. mobile play screens). */
  variant?: "default" | "dark";
}) {
  const tone =
    variant === "dark"
      ? "bg-white/10 text-white hover:bg-white/15"
      : "bg-black/10 text-text hover:bg-black/15";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="How this game works"
      aria-expanded={expanded}
      className={`touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${tone}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </button>
  );
}

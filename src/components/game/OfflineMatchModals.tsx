import { motion, AnimatePresence } from "framer-motion";

type BoardIntermissionProps = {
  open: boolean;
  boardWinnerName: string;
  matchLabel: string;
  /** e.g. "First to 5" */
  targetLabel: string;
  nextScorePreview: string;
  onContinue: () => void;
};

/** After one board ends but the match may continue. */
export function OfflineBoardIntermissionModal({
  open,
  boardWinnerName,
  matchLabel,
  targetLabel,
  nextScorePreview,
  onContinue,
}: BoardIntermissionProps) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-board-intermission-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[85] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md rounded-2xl border border-header/20 bg-sheet p-6 shadow-xl"
        >
          <h2
            id="offline-board-intermission-title"
            className="font-display text-xl font-bold text-text"
          >
            Board complete
          </h2>
          <p className="mt-3 text-sm text-muted">
            <strong className="font-semibold text-text">{boardWinnerName}</strong>{" "}
            wins this board.
          </p>
          <p className="mt-2 text-sm text-text">{matchLabel}</p>
          <p className="mt-2 text-xs text-muted">
            After this board: <strong className="text-text">{nextScorePreview}</strong>{" "}
            · {targetLabel}
          </p>
          <button
            type="button"
            className="mt-6 w-full rounded-xl bg-active py-3 text-sm font-bold text-text shadow-md"
            onClick={onContinue}
          >
            Next board
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

type MatchEndProps = {
  open: boolean;
  title: string;
  subtitle: string;
  onSaveStats: () => void;
  onNewMatch: () => void;
};

export function OfflineMatchStatsModal({
  open,
  title,
  subtitle,
  onSaveStats,
  onNewMatch,
}: MatchEndProps) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-match-end-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md rounded-2xl border border-header/20 bg-sheet p-6 shadow-xl"
        >
          <h2
            id="offline-match-end-title"
            className="font-display text-xl font-bold text-text"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm text-muted">{subtitle}</p>
          <p className="mt-3 text-xs text-muted">
            Save downloads a JSON file you can keep (scores, boards played, moves
            per board). Nothing is uploaded.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-header/25 py-3 text-sm font-semibold text-text"
              onClick={onNewMatch}
            >
              New setup
            </button>
            <button
              type="button"
              className="rounded-xl bg-active py-3 text-sm font-bold text-text shadow-md"
              onClick={onSaveStats}
            >
              Save match stats
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

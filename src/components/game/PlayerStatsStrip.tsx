import { countMaterial, type PlayerId } from "@/lib/boardUtils";
import { CapturedPiecesRow } from "@/components/game/CapturedPiecesRow";

export type PlayerStatsStripProps = {
  board: number[][];
  player: PlayerId;
  label: string;
  /** Opponent pieces captured (cell values 1–4), for trophy row. */
  capturedPieceValues: number[];
  isActiveTurn: boolean;
  variant: "top" | "bottom";
  /** Visual theme: legacy cream page vs dark dock layout */
  theme?: "cream" | "dock";
};

export function PlayerStatsStrip({
  board,
  player,
  label,
  capturedPieceValues,
  isActiveTurn,
  variant,
  theme = "cream",
}: PlayerStatsStripProps) {
  const m = countMaterial(board, player);

  const isDock = theme === "dock";
  const ring = isDock
    ? isActiveTurn
      ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-slate-900 bg-amber-500/10"
      : "border-white/10 bg-slate-800/60"
    : isActiveTurn
      ? "ring-2 ring-active/80 ring-offset-2 ring-offset-cream bg-active/20"
      : "border-header/25 bg-sheet/80";

  return (
    <div
      className={[
        "w-full max-w-[min(92vw,720px)] border px-2.5 py-2 text-[11px] shadow-sm backdrop-blur-sm sm:text-xs",
        isDock ? "rounded-xl text-slate-200" : "text-text",
        variant === "top"
          ? isDock
            ? "mb-2 rounded-b-xl rounded-t-lg border-b-2 border-amber-900/40"
            : "mb-2 rounded-b-2xl rounded-t-lg border-b-2 border-header/30"
          : isDock
            ? "mt-2 rounded-b-lg rounded-t-xl border-t-2 border-amber-900/40"
            : "mt-2 rounded-b-lg rounded-t-2xl border-t-2 border-header/30",
        ring,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
              isDock
                ? "bg-slate-700 text-amber-100"
                : "bg-sheet text-text ring-1 ring-header/30"
            }`}
            aria-hidden
          >
            {player}
          </div>
          <div className="min-w-0">
            <p
              className={`truncate font-bold ${isDock ? "text-amber-50" : "text-text"}`}
            >
              {label}
            </p>
            <p className={isDock ? "text-slate-400" : "text-muted"}>
              <span className={isDock ? "font-semibold text-slate-200" : "font-semibold text-text"}>
                {m.total}
              </span>{" "}
              pieces
              <span className="opacity-80">
                {" "}
                ({m.men} men · {m.kings} kings)
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span
            className={`text-[10px] uppercase tracking-wide ${isDock ? "text-slate-500" : "text-muted"}`}
          >
            Captured
            {capturedPieceValues.length > 0 ? (
              <span
                className={`ml-1 tabular-nums ${isDock ? "text-slate-300" : "font-semibold text-text"}`}
              >
                ({capturedPieceValues.length})
              </span>
            ) : null}
          </span>
          <CapturedPiecesRow pieces={capturedPieceValues} />
        </div>
      </div>
    </div>
  );
}

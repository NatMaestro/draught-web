import { countMaterial, type PlayerId } from "@/lib/boardUtils";
import { CapturedPiecesRow } from "@/components/game/CapturedPiecesRow";
import {
  avatarBackgroundStyle,
  initialsFromUsername,
} from "@/lib/playerAvatar";
import { formatClock } from "@/hooks/useGameClock";

export type PlayerStatsStripProps = {
  board: number[][];
  player: PlayerId;
  label: string;
  /** Online PvP: show initials + color from username instead of "1" / "2". */
  avatarUsername?: string;
  /** Countdown (seconds remaining) — active player’s clock runs. */
  timerSeconds?: number;
  /** When false, clock is paused / grayed (not their turn). */
  timerActive?: boolean;
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
  avatarUsername,
  timerSeconds,
  timerActive,
  capturedPieceValues,
  isActiveTurn,
  variant,
  theme = "cream",
}: PlayerStatsStripProps) {
  const m = countMaterial(board, player);

  const isDock = theme === "dock";
  const ring = isDock
    ? isActiveTurn
      ? "ring-1 ring-offset-1 ring-amber-400/70 ring-offset-slate-900 bg-amber-500/10 sm:ring-2 sm:ring-offset-2"
      : "border-white/10 bg-slate-800/60"
    : isActiveTurn
      ? "ring-1 ring-offset-1 ring-active/80 ring-offset-cream bg-active/20 sm:ring-2 sm:ring-offset-2"
      : "border-header/25 bg-sheet/80";

  return (
    <div
      className={[
        "w-full max-w-[min(92vw,720px)] border px-1 py-1 text-[10px] shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-2 sm:text-xs",
        isDock ? "rounded-xl text-slate-200" : "text-text",
        variant === "top"
          ? isDock
            ? "mb-1.5 rounded-b-xl rounded-t-lg border-b-2 border-amber-900/40 sm:mb-2"
            : "mb-1.5 rounded-b-2xl rounded-t-lg border-b-2 border-header/30 sm:mb-2"
          : isDock
            ? "mt-1.5 rounded-b-lg rounded-t-xl border-t-2 border-amber-900/40 sm:mt-2"
            : "mt-1.5 rounded-b-lg rounded-t-2xl border-t-2 border-header/30 sm:mt-2",
        ring,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-9 sm:w-9 sm:text-[11px] ${
              avatarUsername
                ? ""
                : isDock
                  ? "bg-slate-700 text-amber-100"
                  : "rounded-md bg-sheet text-text ring-1 ring-header/30"
            }`}
            style={avatarUsername ? avatarBackgroundStyle(avatarUsername) : undefined}
            aria-hidden
          >
            {avatarUsername ? initialsFromUsername(avatarUsername) : player}
          </div>
          <div className="min-w-0 leading-tight">
            <p
              className={`truncate text-[11px] font-bold sm:text-sm ${isDock ? "text-amber-50" : "text-text"}`}
            >
              {label}
            </p>
            <p className={`text-[9px] sm:text-[10px] ${isDock ? "text-slate-400" : "text-muted"}`}>
              <span className={isDock ? "font-semibold text-slate-200" : "font-semibold text-text"}>
                {m.total}
              </span>{" "}
              pieces
              <span className="hidden opacity-80 sm:inline">
                {" "}
                ({m.men} men · {m.kings} kings)
              </span>
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-0 sm:flex-row sm:items-center sm:gap-3">
          {timerSeconds != null ? (
            <div
              className={`flex flex-row items-baseline gap-1 tabular-nums sm:flex-col sm:items-end sm:gap-0 ${
                timerActive
                  ? isDock
                    ? "text-amber-200"
                    : "font-semibold text-text"
                  : isDock
                    ? "text-slate-600"
                    : "text-muted opacity-70"
              }`}
              title={timerActive ? "Clock running (on move)" : "Clock paused"}
            >
              <span className="text-[8px] uppercase tracking-wide opacity-80 sm:text-[9px]">
                Time
              </span>
              <span className="text-xs font-bold tabular-nums sm:text-sm md:text-base">
                {formatClock(timerSeconds)}
              </span>
            </div>
          ) : null}
          <span
            className={`text-[9px] uppercase tracking-wide sm:text-[10px] ${isDock ? "text-slate-500" : "text-muted"}`}
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
          <div className="max-w-full shrink-0">
            <CapturedPiecesRow pieces={capturedPieceValues} />
          </div>
        </div>
      </div>
    </div>
  );
}

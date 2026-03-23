import { Link } from "react-router-dom";
import type { GameHistoryItem } from "@/lib/api";
import {
  historyResultForUser,
  opponentLabel,
} from "@/lib/gameHistoryResult";

type Props = {
  games: GameHistoryItem[];
  userId: number;
  maxRows?: number;
  showViewAll?: boolean;
};

function ResultBadge({ result }: { result: "win" | "loss" | "draw" }) {
  const cls =
    result === "win"
      ? "bg-emerald-600/90 text-white"
      : result === "loss"
        ? "bg-red-700/90 text-white"
        : "bg-header/80 text-text";
  const label = result === "win" ? "W" : result === "loss" ? "L" : "D";
  return (
    <span
      className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1.5 text-xs font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

export function GameHistorySection({
  games,
  userId,
  maxRows = 10,
  showViewAll = true,
}: Props) {
  const rows = games.slice(0, maxRows);

  if (rows.length === 0) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed border-header/25 bg-cream/50 px-4 py-6 text-center text-sm text-muted">
        No finished games yet. Play online or vs AI to build your history.
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Game history
        </p>
        {showViewAll ? (
          <Link
            to="/home/profile"
            className="text-xs font-semibold text-text underline decoration-header decoration-2"
          >
            View all
          </Link>
        ) : null}
      </div>
      <ul className="divide-y divide-header/15 overflow-hidden rounded-2xl border border-header/20 bg-sheet/80">
        {rows.map((g) => {
          const result = historyResultForUser(g, userId);
          const opp = opponentLabel(g, userId);
          const when = g.finished_at
            ? new Date(g.finished_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            : "";
          return (
            <li key={g.id}>
              <Link
                to={`/play/review/${g.id}`}
                className="flex items-center gap-3 px-3 py-3 transition hover:bg-cream/60 active:bg-cream/80"
              >
                <ResultBadge result={result} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    vs {opp}
                  </p>
                  <p className="text-[11px] text-muted">
                    {g.is_ranked ? "Ranked" : "Casual"}
                    {g.is_ai_game ? " · vs AI" : ""}
                    {when ? ` · ${when}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted">
                  {g.move_count} moves
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usersApi, type LeaderboardEntry } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { initialsFromUsername } from "@/components/friends/FriendsPlayUi";
import { DraughtLoader, DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

const PAGE_SIZE = 50;

function winPct(won: number, played: number): string {
  if (played <= 0) return "—";
  return `${Math.round((100 * won) / played)}%`;
}

export function LeaderboardPage() {
  const userId = useAuthStore((s) => s.userId);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [you, setYou] = useState<LeaderboardEntry | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (fromOffset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await usersApi.leaderboard({
        limit: PAGE_SIZE,
        offset: fromOffset,
        min_games: 1,
      });
      setYou(data.you);
      setTotal(data.count);
      setOffset(fromOffset + data.results.length);
      setEntries((prev) => (append ? [...prev, ...data.results] : data.results));
    } catch {
      setError("Could not load leaderboard.");
      if (!append) setEntries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const hasMore = entries.length < total;

  return (
    <div className="safe-x pb-28 pt-[max(0.5rem,env(safe-area-inset-top))] md:pb-10">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-header/20 bg-cream/95 px-2 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/more"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-avatar text-text transition hover:bg-header/15"
          aria-label="Back to More"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 text-center font-display text-lg font-semibold tracking-tight text-text sm:text-xl">
          Leaderboard
        </h1>
        <span className="w-10 shrink-0" aria-hidden />
      </header>

      <div className="mx-auto max-w-xl px-1 pt-4">
        <p className="px-1 text-sm text-muted">
          Ranked by Elo rating. Players need at least one rated game to appear. Tied ratings share the same rank.
        </p>

        {you ? (
          <div
            className="mt-4 rounded-2xl border border-header/25 bg-avatar px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-text/80">Your position</p>
            <p className="mt-1 font-display text-2xl font-semibold text-text">
              #{you.rank}
              <span className="ml-2 text-base font-semibold text-text/90">
                · {you.rating} rating
              </span>
            </p>
            <p className="mt-0.5 text-sm text-text/85">
              {you.games_won}W · {Math.max(0, you.games_played - you.games_won)}L · {you.games_played} games
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-4 px-1">
            <DraughtLoader variant="section" label="Loading leaderboard" className="py-4" />
          </div>
        ) : error ? (
          <p className="mt-6 px-1 text-sm text-text">{error}</p>
        ) : (
          <>
            <p className="mt-4 px-1 text-xs text-muted">
              {total === 0 ? "No players yet." : `${total} player${total === 1 ? "" : "s"}`}
            </p>
            <ul className="mt-2 space-y-1.5">
              {entries.map((row) => {
                const mine = userId != null && row.id === userId;
                return (
                  <li
                    key={`${row.id}-${row.rank}`}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                      mine
                        ? "border-text/35 bg-white/70 dark:border-header/30 dark:bg-sheet/55"
                        : "border-header/15 bg-white/45 dark:bg-sheet/40"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center font-display text-lg font-semibold tabular-nums text-text">
                      {row.rank}
                    </span>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-text ${mine ? "bg-active" : "bg-row-muted"}`}
                    >
                      {initialsFromUsername(row.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text">{row.username}</p>
                      <p className="text-xs text-muted">
                        {row.games_played} games · {winPct(row.games_won, row.games_played)} wins
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-text">
                      {row.rating}
                    </span>
                  </li>
                );
              })}
            </ul>
            {hasMore ? (
              <div className="mt-4 flex justify-center pb-4">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void load(offset, true)}
                  className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-header px-5 py-2.5 text-sm font-semibold text-text disabled:opacity-60"
                >
                  <DraughtLoaderButtonContent
                    loading={loadingMore}
                    loadingText="Loading…"
                    idleText="Load more"
                    tone="onLight"
                  />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

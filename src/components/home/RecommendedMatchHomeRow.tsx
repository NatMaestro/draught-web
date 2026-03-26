import type { RecommendedMatchResponse } from "@/lib/api";
import { MiniBoardPreview } from "@/components/home/MiniBoardPreview";

function initials(username: string): string {
  const t = username.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

type Props = {
  data: RecommendedMatchResponse;
  onPress: () => void;
};

/**
 * Chess.com-style “recommended match” strip: mini board + avatar, friend + rating, H2H W/L/D.
 */
export function RecommendedMatchHomeRow({ data, onPress }: Props) {
  const opp = data.opponent;
  if (!opp) return null;

  const { wins, losses, draws } = data.head_to_head;
  const h2hTotal = wins + losses + draws;

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center justify-between border-b border-black/[0.06] py-4 text-left transition hover:bg-black/[0.02] active:bg-black/[0.04] dark:border-white/[0.08] dark:hover:bg-white/[0.04] md:rounded-xl md:border-0 md:px-4 md:py-5 md:hover:shadow-card"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-[17px] font-bold leading-tight text-text">Recommended match</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Friend</p>
        <p className="mt-0.5 truncate text-[15px] font-semibold text-text">
          {opp.username}{" "}
          <span className="font-normal text-muted">({opp.rating})</span>
        </p>
        {!data.in_rating_band ? (
          <p className="mt-1 text-[11px] text-muted">
            Closest friend by rating — {data.rating_gap} pts apart. Add friends near your level for tighter
            matches.
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted">
            Similar rating (within your band) — great for a balanced game.
          </p>
        )}
        <p className="mt-2 text-[13px] text-muted">
          <span className="font-medium">vs: </span>
          <span className="font-semibold text-emerald-700">{wins}W</span>
          <span className="text-muted"> / </span>
          <span className="font-semibold text-red-700">{losses}L</span>
          <span className="text-muted"> / </span>
          <span className="font-semibold text-text/70">{draws}D</span>
          {h2hTotal === 0 ? (
            <span className="ml-1 text-[11px] text-muted">— first time pairing online</span>
          ) : null}
        </p>
      </div>

      <div className="relative shrink-0">
        <MiniBoardPreview variant="friend" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-white/95 bg-avatar text-sm font-bold text-text shadow-lg"
            aria-hidden
          >
            {initials(opp.username)}
          </div>
        </div>
      </div>
    </button>
  );
}

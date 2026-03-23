import { motion } from "framer-motion";

type Profile = {
  rating: number;
  games_played: number;
  games_won: number;
};

type Card = {
  id: string;
  label: string;
  value: string | number;
  sub?: string;
};

/**
 * Horizontally scrollable stat cards (ranked rating, record, puzzles placeholder).
 */
export function RatingCardsStrip({ profile }: { profile: Profile | null }) {
  if (!profile) return null;

  const lost = Math.max(0, profile.games_played - profile.games_won);
  const cards: Card[] = [
    {
      id: "ranked",
      label: "Ranked",
      value: profile.rating,
      sub: "Elo",
    },
    {
      id: "record",
      label: "Record",
      value: `${profile.games_won}W`,
      sub: `${lost}L`,
    },
    {
      id: "games",
      label: "Games",
      value: profile.games_played,
      sub: "total",
    },
  ];

  return (
    <div className="mb-4">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Your stats
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]">
        {cards.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="min-w-[112px] shrink-0 rounded-2xl border border-header/20 bg-sheet/90 px-3 py-3 shadow-sm"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {c.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text">
              {c.value}
            </p>
            {c.sub ? (
              <p className="text-[11px] font-medium text-muted">{c.sub}</p>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

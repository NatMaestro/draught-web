import { challengesApi } from "@/lib/api";
import type { GameChallenge } from "@/lib/api";

type Props = {
  challenges: GameChallenge[];
  onAccepted: (gameId: string) => void;
  onRefresh: () => void;
};

export function IncomingChallengesSection({
  challenges,
  onAccepted,
  onRefresh,
}: Props) {
  if (challenges.length === 0) return null;

  return (
    <div className="space-y-3 pb-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Game requests
      </p>
      {challenges.map((ch) => (
        <div
          key={ch.id}
          className="rounded-2xl border border-header/25 bg-sheet/90 p-4 shadow-sm"
        >
          <p className="font-semibold text-text">
            {ch.from_user.username} wants to play
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Accept to open a new casual match.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white"
              onClick={async () => {
                try {
                  const { data } = await challengesApi.accept(ch.id);
                  onAccepted(data.game_id);
                } catch {
                  onRefresh();
                }
              }}
            >
              Accept
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border border-header/40 bg-cream py-2.5 text-sm font-semibold text-text"
              onClick={async () => {
                try {
                  await challengesApi.decline(ch.id);
                } finally {
                  onRefresh();
                }
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

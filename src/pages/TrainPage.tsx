import { MoreHubLinkRow, MoreSubpageLayout } from "@/components/more/MoreSubpageLayout";

export function TrainPage() {
  return (
    <MoreSubpageLayout title="Train">
      <p className="px-1 text-sm leading-relaxed text-muted">
        Structured lessons and video drills will connect here from the product roadmap. For now, use this
        page as a quick reference and jump into practice.
      </p>

      <section className="mt-6 space-y-3 rounded-2xl border border-header/15 bg-white/45 px-4 py-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-text">Game basics</h2>
        <p className="text-sm text-muted">
          This app uses a <strong className="text-text">10×10</strong> board: pieces sit on the playable
          (checkerboard) cells. You start at the bottom; uncrowned men move forward along diagonals; kings
          slide along diagonals at any distance.
        </p>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-muted">
          <li>
            <strong className="text-text">Captures</strong> are mandatory when available — including multi-jumps.
          </li>
          <li>
            <strong className="text-text">Kings</strong> move any distance diagonally on dark squares (rules as implemented in-game).
          </li>
          <li>
            <strong className="text-text">Win</strong> by blocking the opponent or capturing all their pieces.
          </li>
        </ul>
      </section>

      <h2 className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text/55">
        Get reps in
      </h2>
      <div className="space-y-2">
        <MoreHubLinkRow
          to="/play/ai"
          title="vs computer"
          description="Adjust difficulty and replay lines until they feel natural."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="10" y="7" width="4" height="9" rx="1" />
              <path d="M6 3h12v4H6zM9 21h6" strokeLinecap="round" />
              <circle cx="12" cy="5" r="1" fill="currentColor" />
            </svg>
          }
        />
        <MoreHubLinkRow
          to="/play/matchmaking"
          title="Matchmaking"
          description="Play humans at your rating when you’re ready for real pressure."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
          }
        />
        <MoreHubLinkRow
          to="/leaderboard"
          title="Leaderboard"
          description="See how ratings work and where you stand after ranked games."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z" strokeLinejoin="round" />
              <path d="M7 7H4a2 2 0 000 4h3M17 7h3a2 2 0 010 4h-3" strokeLinecap="round" />
            </svg>
          }
        />
      </div>
    </MoreSubpageLayout>
  );
}

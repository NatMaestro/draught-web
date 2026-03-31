import { MoreHubLinkRow, MoreSubpageLayout } from "@/components/more/MoreSubpageLayout";

export function PuzzlePage() {
  return (
    <MoreSubpageLayout title="Puzzles">
      <p className="px-1 text-sm leading-relaxed text-muted">
        Interactive “find the winning sequence” puzzles are on the roadmap. Until they ship on web, use
        these modes to sharpen tactics and pattern recognition.
      </p>

      <h2 className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text/55">
        Practice meanwhile
      </h2>
      <div className="space-y-2">
        <MoreHubLinkRow
          to="/play/ai"
          title="vs computer"
          description="Try lines without time pressure — great for puzzles-style thinking."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="10" y="7" width="4" height="9" rx="1" />
              <path d="M6 3h12v4H6zM9 21h6" strokeLinecap="round" />
              <circle cx="12" cy="5" r="1" fill="currentColor" />
            </svg>
          }
        />
        <MoreHubLinkRow
          to="/play/local"
          title="Pass & play"
          description="Two players on one device — match play, no server."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 3v4M8 3v4" strokeLinecap="round" />
            </svg>
          }
        />
        <MoreHubLinkRow
          to="/home"
          title="Dashboard"
          description="Resume games and review recent history from the home tab."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <div className="mt-6 rounded-2xl border border-header/15 bg-sheet/50 px-4 py-3 text-sm text-muted">
        <p className="font-semibold text-text">Tactical tips</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Forced captures — look one move ahead for chains.</li>
          <li>Kings on a 10×10 board cover long diagonals; don’t give them open files for free.</li>
        </ul>
      </div>
    </MoreSubpageLayout>
  );
}

import { Link } from "react-router-dom";
import { MoreHubLinkRow, MoreSubpageLayout } from "@/components/more/MoreSubpageLayout";

export function TournamentPage() {
  return (
    <MoreSubpageLayout title="Tournaments">
      <p className="px-1 text-sm leading-relaxed text-muted">
        Bracket events, scheduled rounds, and prize pools are not available in the web client yet. Here’s
        what we’re building toward and what you can do today.
      </p>

      <section className="mt-6 space-y-3 rounded-2xl border border-header/15 bg-white/45 px-4 py-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-text">Planned experience</h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-muted">
          <li>Join a tournament from the play hub with the same clocks you use for rated games.</li>
          <li>Single-elimination or round-robin pairings with notifications between rounds.</li>
          <li>Results feed into your rating and appear on your profile history.</li>
        </ul>
      </section>

      <h2 className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text/55">
        Play ranked today
      </h2>
      <div className="space-y-2">
        <MoreHubLinkRow
          to="/play"
          title="Play menu"
          description="Online, matchmaking, friends — same entry as from the home tab."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="opacity-95" aria-hidden>
              <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
            </svg>
          }
        />
        <MoreHubLinkRow
          to="/play/matchmaking"
          title="Matchmaking"
          description="Closest thing to a ladder match while we ship tournaments."
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
          description="Track global standings — tournament boards will mirror this style."
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z" strokeLinejoin="round" />
              <path d="M7 7H4a2 2 0 000 4h3M17 7h3a2 2 0 010 4h-3" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      <p className="mt-6 px-1 text-center text-xs text-muted">
        Want to run an event manually? Use{" "}
        <Link to="/play/friends" className="font-semibold text-text underline-offset-2 hover:underline">
          Play a friend
        </Link>{" "}
        to challenge players and agree on times in chat elsewhere.
      </p>
    </MoreSubpageLayout>
  );
}

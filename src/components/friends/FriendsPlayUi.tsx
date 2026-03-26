import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function initialsFromUsername(username: string): string {
  if (!username?.trim()) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function QuickActionRow({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-header/20 bg-white/65 px-4 py-3.5 text-left shadow-sm transition hover:bg-white/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sheet/90 text-text shadow-inner">
        {icon}
      </span>
      <span className="font-semibold text-text">{label}</span>
    </button>
  );
}

export function ChallengeBadgeButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-text/25 bg-cream transition hover:bg-sheet active:scale-95"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-text" aria-hidden>
        <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm6 6h2v2H9v-2zm2-2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2z" />
      </svg>
    </button>
  );
}

export function FriendsStickyHeader({
  onCopyInvite,
  title = "Play a friend",
}: {
  onCopyInvite: () => void;
  title?: string;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-header/20 bg-cream/95 px-3 py-3 backdrop-blur-md"
      style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
    >
      <Link
        to="/"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text transition hover:bg-header/15"
        style={{ backgroundColor: "#F5E6A8" }}
        aria-label="Back to play menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <h1 className="min-w-0 flex-1 text-center font-display text-lg font-semibold tracking-tight text-text sm:text-xl">
        {title}
      </h1>
      <button
        type="button"
        onClick={onCopyInvite}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text transition hover:opacity-90"
        style={{ backgroundColor: "#F5E6A8" }}
        aria-label="Share or copy invite link"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  );
}

export function TrophySmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7H4a2 2 0 000 4h3M17 7h3a2 2 0 010 4h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Profile / “your stats” — distinct from `TrophySmall` (leaderboard). */
export function ProfileSmall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

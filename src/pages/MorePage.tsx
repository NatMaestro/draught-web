import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";
import { FEEDBACK_FORM_URL } from "@/lib/config";
import { subscribeToPushNotifications } from "@/lib/push";
import { useAuthStore } from "@/store/authStore";
import { DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

function MoreMenuIconWrap({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text shadow-inner ${className}`}
      aria-hidden
    >
      {children}
    </span>
  );
}

function MoreMenuRow({
  to,
  onClick,
  icon,
  label,
  description,
}: {
  to?: string;
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  description?: string;
}) {
  const inner = (
    <>
      {icon}
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-semibold text-text">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        ) : null}
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 text-muted opacity-70"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/55 active:scale-[0.99]";

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-text/55">
      {children}
    </h2>
  );
}

export function MorePage() {
  const { isAuthenticated, username, logout } = useAuthStore();
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const onEnablePush = async () => {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const r = await subscribeToPushNotifications();
      setPushMsg(
        r.ok ? "Push notifications enabled for this device." : r.error ?? "Failed.",
      );
    } finally {
      setPushBusy(false);
    }
  };

  const scrollToSettings = () => {
    document.getElementById("more-settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="safe-x pb-28 pt-[max(0.75rem,env(safe-area-inset-top))] md:pb-10 md:pt-8">
      <div className="mx-auto max-w-xl">
        <header className="px-1 pb-4 text-center">
          <div className="font-display text-2xl font-normal tracking-tight text-text sm:text-3xl">Draught</div>
          <p className="mt-0.5 text-sm text-muted">The Spirit of Africa</p>
        </header>

        <nav
          aria-label="More menu"
          className="rounded-3xl border border-header/15 bg-white/45 px-2 py-1 shadow-card backdrop-blur-sm"
        >
          <div className="pt-1">
          <MoreMenuRow
            to="/home"
            label="Stats"
            description="Dashboard, history & challenges"
            icon={
              <MoreMenuIconWrap className="bg-[#EFCA83]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/home/profile"
            label="Profile"
            description={isAuthenticated && username ? `Signed in as ${username}` : "Ratings & game record"}
            icon={
              <MoreMenuIconWrap className="bg-[#A8C97A]/85">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/play/friends"
            label="Friends"
            description="Invite, search & play together"
            icon={
              <MoreMenuIconWrap className="bg-[#8BB4E8]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          {isAuthenticated ? (
            <MoreMenuRow
              to="/play/friends#section-notifications"
              label="Notifications"
              description="Alerts & friend activity"
              icon={
                <MoreMenuIconWrap className="bg-[#E8A598]/85">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                  </svg>
                </MoreMenuIconWrap>
              }
            />
          ) : null}
          <MoreMenuRow
            onClick={scrollToSettings}
            label="Settings"
            description="Push alerts & account on this page"
            icon={
              <MoreMenuIconWrap className="bg-header/15">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          </div>

          <SectionTitle>Learn</SectionTitle>
          <MoreMenuRow
            to="/puzzle"
            label="Puzzle"
            description="Spot the winning move"
            icon={
              <MoreMenuIconWrap className="bg-[#C49AD9]/80">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
                  <path d="M10.5 4.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 6.83 9 6s.67-1.5 1.5-1.5zm-6 6c.83 0 1.5.67 1.5 1.5S5.33 13.5 4.5 13.5 3 12.83 3 12s.67-1.5 1.5-1.5zm6 6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 18.83 9 18s.67-1.5 1.5-1.5zm6-6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S15 12.83 15 12s.67-1.5 1.5-1.5zm0-6c.83 0 1.5.67 1.5 1.5S16.33 7.5 15.5 7.5 14 6.83 14 6s.67-1.5 1.5-1.5zm6 6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S20 12.83 20 12s.67-1.5 1.5-1.5z" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/train"
            label="Train"
            description="Lessons & drills"
            icon={
              <MoreMenuIconWrap className="bg-[#9BD4C9]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
                </svg>
              </MoreMenuIconWrap>
            }
          />

          <SectionTitle>Connect</SectionTitle>
          <MoreMenuRow
            to="/play"
            label="Play online"
            description="Match, clock & game modes hub"
            icon={
              <MoreMenuIconWrap className="bg-[#D8A477]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="opacity-95">
                  <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/play/matchmaking"
            label="Matchmaking"
            description="Find an opponent automatically"
            icon={
              <MoreMenuIconWrap className="bg-[#F5E6A8]/95">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/leaderboard"
            label="Leaderboard"
            description="Global rating standings"
            icon={
              <MoreMenuIconWrap className="bg-[#E8C66B]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z" strokeLinejoin="round" />
                  <path d="M7 7H4a2 2 0 000 4h3M17 7h3a2 2 0 010 4h-3" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/play/local"
            label="Local draughts"
            description="Same device, two players"
            icon={
              <MoreMenuIconWrap className="bg-[#B8A88A]/85">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 3v4M8 3v4" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/play/ai"
            label="vs computer"
            description="Practice against the engine"
            icon={
              <MoreMenuIconWrap className="bg-[#7A9E6F]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="10" y="7" width="4" height="9" rx="1" />
                  <path d="M6 3h12v4H6zM9 21h6" strokeLinecap="round" />
                  <circle cx="12" cy="5" r="1" fill="currentColor" />
                </svg>
              </MoreMenuIconWrap>
            }
          />
          <MoreMenuRow
            to="/play/tournament"
            label="Tournaments"
            description="Roadmap & how to play ranked meanwhile"
            icon={
              <MoreMenuIconWrap className="bg-[#E8C66B]/90">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 01-10 0V4z" strokeLinejoin="round" />
                  <path d="M7 7H4a2 2 0 000 4h3M17 7h3a2 2 0 010 4h-3" strokeLinecap="round" />
                </svg>
              </MoreMenuIconWrap>
            }
          />

          <SectionTitle>Account</SectionTitle>
          {isAuthenticated ? (
            <MoreMenuRow
              to="/home/profile"
              label="Membership"
              description="Your rating & stats"
              icon={
                <MoreMenuIconWrap className="bg-[#6BA3D4]/90">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="scale-90">
                    <path d="M12 2l2.4 7.4h7.8l-6.3 4.6 2.4 7.4L12 16.8 5.7 21.4l2.4-7.4L1.8 9.4h7.8z" />
                  </svg>
                </MoreMenuIconWrap>
              }
            />
          ) : null}
          <div className="py-1">
            {FEEDBACK_FORM_URL ? (
              <FeedbackLink
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-white/55"
              >
                <MoreMenuIconWrap className="bg-[#A8C97A]/90">
                  <span className="text-lg font-bold leading-none">?</span>
                </MoreMenuIconWrap>
                <span className="min-w-0 flex-1 text-left font-semibold text-text">Support & feedback</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-muted opacity-70"
                  aria-hidden
                >
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </FeedbackLink>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-dashed border-header/25 bg-sheet/40 px-3 py-3 text-sm text-muted">
                <MoreMenuIconWrap className="bg-[#A8C97A]/60">
                  <span className="text-lg font-bold leading-none text-text/80">?</span>
                </MoreMenuIconWrap>
                <span>
                  <span className="font-semibold text-text">Support & feedback</span>
                  <span className="mt-1 block text-xs leading-relaxed">
                    Set <code className="rounded bg-header/15 px-1 py-0.5 text-[11px]">VITE_FEEDBACK_FORM_URL</code>{" "}
                    in your web env to enable the external form link.
                  </span>
                </span>
              </div>
            )}
          </div>
        </nav>

        <div id="more-settings" className="scroll-mt-4 mt-6 space-y-4 rounded-3xl border border-header/15 bg-white/50 p-5 shadow-card backdrop-blur-sm">
          <h2 className="font-display text-xl text-text">Settings</h2>
          {isAuthenticated ? (
            <>
              <p className="text-sm text-muted">
                Signed in as <strong className="text-text">{username}</strong>
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full rounded-2xl bg-text px-4 py-3 text-center text-sm font-semibold text-cream transition hover:opacity-95"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to="/auth/login"
                className="flex-1 rounded-2xl px-4 py-3 text-center text-sm font-semibold text-text transition hover:opacity-95"
                style={{ backgroundColor: "#EFCA83" }}
              >
                Log in
              </Link>
              <Link
                to="/auth/register"
                className="flex-1 rounded-2xl border border-header/30 bg-sheet px-4 py-3 text-center text-sm font-semibold text-text transition hover:bg-sheet/80"
              >
                Sign up
              </Link>
            </div>
          )}

          {isAuthenticated ? (
            <div className="rounded-2xl border border-header/10 bg-sheet/50 px-4 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-text/80">Push notifications</h3>
              <p className="mt-1 text-xs text-muted">
                Browser alerts for invites and friend activity (server needs VAPID keys configured).
              </p>
              <button
                type="button"
                disabled={pushBusy}
                onClick={() => void onEnablePush()}
                className="mt-3 flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold text-text disabled:opacity-60"
                style={{ backgroundColor: "#D8A477" }}
              >
                <DraughtLoaderButtonContent
                  loading={pushBusy}
                  loadingText="Enabling…"
                  idleText="Enable push on this device"
                  tone="onLight"
                />
              </button>
              {pushMsg ? <p className="mt-2 text-xs text-text/90">{pushMsg}</p> : null}
            </div>
          ) : null}
        </div>

        <p className="mt-6 pb-4 text-center text-xs text-muted">Draught web — mobile-first, desktop-enhanced.</p>
      </div>
    </div>
  );
}

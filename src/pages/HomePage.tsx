import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { HomeRow } from "@/components/home/HomeRow";
import { MiniBoardPreview } from "@/components/home/MiniBoardPreview";
import { RatingCardsStrip } from "@/components/home/RatingCardsStrip";
import { GameHistorySection } from "@/components/home/GameHistorySection";
import { IncomingChallengesSection } from "@/components/home/IncomingChallengesSection";
import { RecommendedMatchHomeRow } from "@/components/home/RecommendedMatchHomeRow";
import {
  gamesApi,
  usersApi,
  challengesApi,
  socialApi,
  type GameHistoryItem,
  type GameChallenge,
  type RecommendedMatchResponse,
} from "@/lib/api";
import {
  loadResumeSnapshot,
  RESUME_STORAGE_KEY,
  type ResumeGameSnapshot,
} from "@/lib/resumeGameStorage";
import { DRAUGHT_SOCIAL_REFRESH_EVENT } from "@/hooks/useSocialWebSocket";

function initialsFromUsername(username: string | null): string {
  if (!username?.trim()) return "?";
  const parts = username.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return username.slice(0, 2).toUpperCase();
}

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, username, userId } = useAuthStore();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const [logoFailed, setLogoFailed] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [resume, setResume] = useState<ResumeGameSnapshot | null>(null);
  const [profile, setProfile] = useState<{
    rating: number;
    games_played: number;
    games_won: number;
  } | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [incoming, setIncoming] = useState<GameChallenge[]>([]);
  const [unreadSocial, setUnreadSocial] = useState(0);
  const [recommended, setRecommended] = useState<RecommendedMatchResponse | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [p, h, inc, unread] = await Promise.all([
        usersApi.profile(),
        gamesApi.history(),
        challengesApi.incoming().catch(() => ({ data: { results: [] as GameChallenge[] } })),
        socialApi.unreadCount().catch(() => ({ data: { count: 0 } })),
      ]);
      setProfile({
        rating: p.data.rating,
        games_played: p.data.games_played,
        games_won: p.data.games_won,
      });
      setHistory(h.data.results ?? []);
      setIncoming(inc.data.results ?? []);
      setUnreadSocial(unread.data.count ?? 0);
    } catch {
      /* ignore */
    }
    try {
      const r = await socialApi.recommendedMatch(200);
      setRecommended(r.data);
    } catch {
      setRecommended(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setResume(loadResumeSnapshot());
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key != null && e.key !== RESUME_STORAGE_KEY) return;
      setResume(loadResumeSnapshot());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  useEffect(() => {
    if (!isAuthenticated) setRecommended(null);
  }, [isAuthenticated]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshDashboard();
    };
    window.addEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onRefresh);
  }, [refreshDashboard]);

  const canResume =
    isAuthenticated &&
    resume != null &&
    resume.status === "active" &&
    resume.gameId.length > 0;

  /** iOS Safari has no Install sheet — we only pitch install where Chromium can prompt. */
  const showInstallUpsell =
    !isStandalone && !isIos && (Boolean(canPromptInstall) || Boolean(isMobile));

  const onInstall = async () => {
    if (!canPromptInstall) return;
    setInstallBusy(true);
    try {
      await promptInstall();
    } finally {
      setInstallBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream md:rounded-none md:py-0">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-header px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center justify-start">
          {isAuthenticated ? (
            <Link
              to="/home/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-avatar font-bold text-text transition hover:opacity-90"
              aria-label="Profile and game history"
            >
              {initialsFromUsername(username)}
            </Link>
          ) : (
            <Link
              to="/auth/login"
              className="text-base font-semibold text-text hover:underline"
            >
              Log In
            </Link>
          )}
        </div>
        <div className="flex min-w-0 flex-[1.4] items-center justify-center">
          {!logoFailed ? (
            <img
              src="/Game-Logo.png"
              alt="Draught"
              className="h-[60px] max-w-[min(100%,200px)] object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="font-display text-2xl font-semibold tracking-wide text-text">
              DRAUGHT
            </span>
          )}
        </div>
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center justify-end gap-2">
          {isAuthenticated ? (
            <Link
              to="/play/friends"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-avatar text-text transition hover:opacity-90"
              aria-label="Friends, invites, and notifications"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-text"
                aria-hidden
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" />
              </svg>
              {unreadSocial > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {unreadSocial > 99 ? "99+" : unreadSocial}
                </span>
              ) : null}
            </Link>
          ) : (
            <Link
              to="/auth/register"
              className="rounded-full bg-peach px-3.5 py-2 text-sm font-semibold text-text"
            >
              Sign Up
            </Link>
          )}
        </div>
      </header>

      <div className="relative flex-1 px-4 pb-32 pt-2 md:px-0 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-xl md:grid md:max-w-none md:grid-cols-2 md:gap-8 md:pt-6"
        >
          <div className="space-y-0 md:rounded-3xl md:border md:border-header/15 md:bg-white/40 md:p-6 md:shadow-card md:backdrop-blur-sm dark:md:bg-sheet/50">
            {showInstallUpsell ? (
              <div className="mb-4 rounded-2xl border border-header/15 bg-sheet/60 px-4 py-3">
                <button
                  type="button"
                  onClick={() => void onInstall()}
                  disabled={installBusy || !canPromptInstall}
                  className="w-full rounded-full bg-header px-4 py-2.5 text-sm font-semibold text-text disabled:opacity-60"
                >
                  {installBusy ? "Working…" : "Install app"}
                </button>
                {isMobile && !canPromptInstall ? (
                  <p className="mt-2 text-xs leading-snug text-muted">
                    Waiting on the Install prompt? Try your browser&apos;s ⋮ menu → Install app when it
                    appears.
                  </p>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated && incoming.length > 0 ? (
              <IncomingChallengesSection
                challenges={incoming}
                onAccepted={(gid) => {
                  navigate(`/play/game/${gid}`);
                }}
                onRefresh={() => void refreshDashboard()}
              />
            ) : null}
            {canResume && resume ? (
              <HomeRow
                title="Resume Match"
                subtitle={
                  <>
                    <span className="text-muted">
                      {resume.isAiGame ? "vs AI" : "Local / online"}
                    </span>
                    <br />
                    <span className="text-text">
                      Continue your last active game
                    </span>
                  </>
                }
                onPress={() =>
                  navigate(`/play/game/${encodeURIComponent(resume.gameId)}`)
                }
                preview={
                  <MiniBoardPreview
                    imageSrc={resume.thumbnailDataUrl}
                    alt="Saved game position"
                    variant="default"
                  />
                }
              />
            ) : null}
            {isAuthenticated && recommended?.opponent ? (
              <RecommendedMatchHomeRow
                data={recommended}
                onPress={() => {
                  const o = recommended.opponent;
                  if (!o) return;
                  navigate(`/play/friends?q=${encodeURIComponent(o.username)}`);
                }}
              />
            ) : null}
            <HomeRow
              title="Solve Puzzles"
              subtitle={<span className="text-muted">Spot the move!</span>}
              onPress={() => navigate("/puzzle")}
              preview={<MiniBoardPreview variant="puzzle" />}
            />
            <HomeRow
              title="Play with Bots"
              subtitle={<span className="text-muted">Jones — Friendly</span>}
              onPress={() => navigate("/play/ai")}
              preview={<MiniBoardPreview variant="bots" />}
            />
            <HomeRow
              title="Take your Next Lesson"
              subtitle={<span className="text-muted">Using the Crown</span>}
              onPress={() => navigate("/train")}
              preview={<MiniBoardPreview variant="lesson" />}
            />
            {isAuthenticated && profile && userId != null ? (
              <>
                <div className="mt-4 border-t border-header/10 pt-4">
                  <RatingCardsStrip profile={profile} />
                </div>
                <GameHistorySection
                  games={history}
                  userId={userId}
                  maxRows={10}
                />
              </>
            ) : null}
          </div>
          <div className="mt-8 hidden flex-col items-center justify-center rounded-3xl border border-header/20 bg-gradient-to-b from-header/20 to-cream/80 p-8 text-center shadow-lift md:flex">
            <p className="font-display text-4xl text-text">Draught</p>
            <p className="mt-2 max-w-sm text-muted">
              Sharpen your instincts on a classic grid — online, smooth, and
              built for touch or mouse.
            </p>
            <Link
              to="/play"
              className="mt-8 inline-flex rounded-full bg-active px-10 py-4 text-lg font-bold text-text shadow-md transition hover:scale-[1.02]"
            >
              Start playing
            </Link>
            {showInstallUpsell ? (
              <>
                <button
                  type="button"
                  onClick={() => void onInstall()}
                  disabled={installBusy || !canPromptInstall}
                  className="mt-3 inline-flex rounded-full bg-header px-8 py-3 text-sm font-semibold text-text shadow-md transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {installBusy ? "Working…" : "Install app"}
                </button>
                {isMobile && !canPromptInstall ? (
                  <p className="mt-2 max-w-sm text-xs text-muted">
                    If the Install prompt hasn&apos;t popped up yet, look for ⋮ → Install app in your browser.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-floating-above-tab md:hidden">
        <motion.div className="pointer-events-auto w-full max-w-xl" whileTap={{ scale: 0.98 }}>
          <Link
            to="/play"
            className="flex w-full items-center justify-center rounded-[28px] bg-header py-4 text-[22px] font-bold text-text shadow-lift"
          >
            Play
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

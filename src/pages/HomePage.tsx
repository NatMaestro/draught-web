import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { HomeRow } from "@/components/home/HomeRow";
import { MiniBoardPreview } from "@/components/home/MiniBoardPreview";
import { RatingCardsStrip } from "@/components/home/RatingCardsStrip";
import { GameHistorySection } from "@/components/home/GameHistorySection";
import { IncomingChallengesSection } from "@/components/home/IncomingChallengesSection";
import {
  gamesApi,
  usersApi,
  challengesApi,
  type GameHistoryItem,
  type GameChallenge,
} from "@/lib/api";
import {
  loadResumeSnapshot,
  RESUME_STORAGE_KEY,
  type ResumeGameSnapshot,
} from "@/lib/resumeGameStorage";

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
  const [logoFailed, setLogoFailed] = useState(false);
  const [resume, setResume] = useState<ResumeGameSnapshot | null>(null);
  const [profile, setProfile] = useState<{
    rating: number;
    games_played: number;
    games_won: number;
  } | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [incoming, setIncoming] = useState<GameChallenge[]>([]);

  const refreshDashboard = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [p, h, inc] = await Promise.all([
        usersApi.profile(),
        gamesApi.history(),
        challengesApi.incoming().catch(() => ({ data: { results: [] as GameChallenge[] } })),
      ]);
      setProfile({
        rating: p.data.rating,
        games_played: p.data.games_played,
        games_won: p.data.games_won,
      });
      setHistory(h.data.results ?? []);
      setIncoming(inc.data.results ?? []);
    } catch {
      /* ignore */
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

  const canResume =
    isAuthenticated &&
    resume != null &&
    resume.status === "active" &&
    resume.gameId.length > 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream md:rounded-none md:py-0">
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
        style={{ backgroundColor: "#D8A477" }}
      >
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center justify-start">
          {isAuthenticated ? (
            <Link
              to="/home/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-text transition hover:opacity-90"
              style={{ backgroundColor: "#F5E6A8" }}
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
        <div className="flex min-h-[40px] min-w-0 flex-1 items-center justify-end">
          {isAuthenticated ? (
            <span className="inline-block w-10" aria-hidden />
          ) : (
            <Link
              to="/auth/register"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-text"
              style={{ backgroundColor: "#E8C99A" }}
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
          <div className="space-y-0 md:rounded-3xl md:border md:border-header/15 md:bg-white/40 md:p-6 md:shadow-card md:backdrop-blur-sm">
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
            <HomeRow
              title="Solve Puzzles"
              subtitle={<span className="text-muted">Spot the move!</span>}
              onPress={() => navigate("/puzzle")}
              preview={<MiniBoardPreview variant="puzzle" />}
            />
            <HomeRow
              title="Play with Bots"
              subtitle={<span className="text-muted">Jones — Friendly</span>}
              onPress={() => navigate("/play")}
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
              className="mt-8 inline-flex rounded-full px-10 py-4 text-lg font-bold text-text shadow-md transition hover:scale-[1.02]"
              style={{ backgroundColor: "#EFCA83" }}
            >
              Start playing
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center px-4 pb-[max(5.5rem,env(safe-area-inset-bottom))] md:hidden">
        <motion.div className="pointer-events-auto w-full max-w-xl" whileTap={{ scale: 0.98 }}>
          <Link
            to="/play"
            className="flex w-full items-center justify-center rounded-[28px] py-4 text-[22px] font-bold text-text shadow-lift"
            style={{ backgroundColor: "#D8A477" }}
          >
            Play
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

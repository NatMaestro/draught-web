import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { matchmakingApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { gamePlayPath } from "@/lib/deepLink";

type Phase = "idle" | "searching";

const POLL_MS = 1500;

/**
 * Online PvP: matchmaking queue (casual or ranked). Requires auth + Redis on the API.
 */
function parseMinutes(raw: string | null): number {
  if (raw == null || raw === "") return 10;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 120 ? n : 10;
}

export function PlayMatchmakingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const minutesFromHub = useMemo(
    () => parseMinutes(searchParams.get("minutes")),
    [searchParams],
  );
  const useClockFromHub = useMemo(
    () => searchParams.get("clock") !== "off",
    [searchParams],
  );
  const loginReturnPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `/play/matchmaking?${q}` : "/play/matchmaking";
  }, [searchParams]);

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [ranked, setRanked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const rankedRef = useRef(false);
  /** Browser `setInterval` id (number); avoid Node `Timeout` typing clash. */
  const pollRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const goToGame = useCallback(
    (gameId: string) => {
      stopPolling();
      setPhase("idle");
      setError(null);
      navigate(`${gamePlayPath(gameId)}?minutes=${minutesFromHub}`, {
        replace: true,
      });
    },
    [navigate, stopPolling, minutesFromHub],
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let cancelled = false;
    void usersApi
      .profile()
      .then(({ data }) => {
        if (!cancelled) setRating(data.rating);
      })
      .catch(() => {
        if (!cancelled) setRating(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(
        `/auth/login?returnTo=${encodeURIComponent(loginReturnPath)}`,
        { replace: true },
      );
    }
  }, [authLoading, isAuthenticated, navigate, loginReturnPath]);

  useEffect(() => {
    return () => {
      stopPolling();
      const r = rankedRef.current;
      void matchmakingApi.cancel(r).catch(() => {});
    };
  }, [stopPolling]);

  const startSearch = useCallback(async () => {
    setError(null);
    rankedRef.current = ranked;
    setPhase("searching");
    try {
      const { data } = await matchmakingApi.join(ranked, {
        timeControlSec: useClockFromHub ? minutesFromHub * 60 : 600,
        useClock: useClockFromHub,
      });
      if (data.status === "matched" && data.game_id) {
        goToGame(data.game_id);
        return;
      }
      if (data.status !== "queued") {
        setError("Unexpected matchmaking response.");
        setPhase("idle");
        return;
      }
      stopPolling();
      const pollOnce = async () => {
        try {
          const { data: ready } = await matchmakingApi.ready();
          if (ready.status === "matched" && ready.game_id) {
            goToGame(ready.game_id);
          }
        } catch {
          /* network */
        }
      };
      void pollOnce();
      pollRef.current = window.setInterval(() => void pollOnce(), POLL_MS);
    } catch (e: unknown) {
      const err = e as {
        response?: {
          status?: number;
          data?: { detail?: string } | unknown;
        };
      };
      const st = err.response?.status;
      const data = err.response?.data as { detail?: string } | undefined;
      const detail =
        typeof data?.detail === "string" ? data.detail : undefined;
      if (st === 401) {
        setError("Session expired. Please log in again.");
      } else if (st === 503) {
        setError(
          detail ??
            "Matchmaking unavailable: Redis is not reachable. Start Redis and check REDIS_URL.",
        );
      } else {
        setError(
          detail ??
            "Could not join queue. Is the API running and Redis configured for matchmaking?",
        );
      }
      setPhase("idle");
    }
  }, [goToGame, ranked, stopPolling, minutesFromHub, useClockFromHub]);

  const cancelSearch = useCallback(async () => {
    stopPolling();
    try {
      await matchmakingApi.cancel(rankedRef.current);
    } catch {
      /* */
    }
    setPhase("idle");
    setError(null);
  }, [stopPolling]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream bg-mesh-radial text-muted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream bg-mesh-radial safe-x pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md flex-1">
        <Link
          to="/play"
          className="mb-4 inline-block text-sm font-semibold text-text hover:underline"
        >
          ← Play menu
        </Link>

        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl text-text"
        >
          Play online
        </motion.h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;ll be paired with another signed-in player. Choose{" "}
          <strong className="font-semibold text-text">Casual</strong> or{" "}
          <strong className="font-semibold text-text">Ranked</strong> below —
          the difference is explained under the buttons.
        </p>
        <p className="mt-3 rounded-xl border border-header/15 bg-cream/70 px-3 py-2 text-xs text-muted">
          Move clock from play menu:{" "}
          <strong className="text-text">{minutesFromHub} min</strong> per move
          (for when server-side clocks are connected).
        </p>

        {rating != null ? (
          <p className="mt-3 rounded-xl border border-header/20 bg-sheet/80 px-4 py-2 text-sm text-text">
            Your rating:{" "}
            <span className="font-bold tabular-nums">{rating}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex rounded-2xl border border-header/25 bg-sheet/60 p-1">
          <button
            type="button"
            disabled={phase === "searching"}
            onClick={() => setRanked(false)}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
              !ranked
                ? "bg-header text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Casual
          </button>
          <button
            type="button"
            disabled={phase === "searching"}
            onClick={() => setRanked(true)}
            className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
              ranked
                ? "bg-header text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Ranked
          </button>
        </div>

        <div
          className="mt-3 rounded-xl border border-header/20 bg-sheet/70 px-4 py-3 text-sm leading-relaxed"
          role="region"
          aria-live="polite"
          aria-label={ranked ? "Ranked mode" : "Casual mode"}
        >
          {ranked ? (
            <>
              <p className="font-semibold text-text">Ranked</p>
              <p className="mt-1.5 text-muted">
                Your rating (ELO) changes when the game ends — wins, losses, and
                draws all count. We look for opponents near your rating first;
                if nobody is available, the allowed rating gap widens the longer
                you wait (similar to Chess.com).
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-text">Casual</p>
              <p className="mt-1.5 text-muted">
                Your rating does not change. Use this for relaxed games,
                practice, or trying ideas without affecting your ranked standing.
              </p>
            </>
          )}
        </div>

        <div className="mt-8">
          {phase === "searching" ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-header/20 bg-white/40 px-6 py-10 text-center">
              <div
                className="h-12 w-12 animate-spin rounded-full border-2 border-header border-t-transparent"
                aria-hidden
              />
              <p className="font-semibold text-text">Looking for an opponent…</p>
              <p className="text-xs text-muted">
                {ranked
                  ? "Ranked — ratings change when the game ends."
                  : "Casual — no rating change."}
              </p>
              <button
                type="button"
                onClick={() => void cancelSearch()}
                className="mt-2 rounded-xl border border-header/30 bg-cream px-6 py-2.5 text-sm font-semibold text-text"
              >
                Cancel
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => void startSearch()}
              className="w-full rounded-[28px] py-4 text-lg font-bold text-text shadow-md disabled:opacity-50"
              style={{ backgroundColor: "#D8A477" }}
            >
              Find opponent
            </motion.button>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Finished games appear in your history (signed-in only). The server
          needs Redis for matchmaking queues.
        </p>
      </div>
    </div>
  );
}

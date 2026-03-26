import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DraughtLoader } from "@/components/ui/DraughtLoader";
import { motion } from "framer-motion";
import { gamesApi, usersApi, type GameHistoryItem } from "@/lib/api";
import { RatingCardsStrip } from "@/components/home/RatingCardsStrip";
import { GameHistorySection } from "@/components/home/GameHistorySection";
import { useAuthStore } from "@/store/authStore";

export function ProfilePage() {
  const { userId, isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<{
    rating: number;
    games_played: number;
    games_won: number;
    username: string;
  } | null>(null);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || userId == null) return;
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const [p, h] = await Promise.all([
          usersApi.profile(),
          gamesApi.history(),
        ]);
        if (cancelled) return;
        setProfile(p.data);
        setHistory(h.data.results ?? []);
      } catch {
        if (!cancelled) setError("Could not load profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-muted">Sign in to see your profile and history.</p>
        <Link
          to="/auth/login"
          className="mt-4 inline-block font-semibold text-text underline"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center text-red-700">{error}</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 pb-28 pt-4 md:pb-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-text"
          style={{ backgroundColor: "#F5E6A8" }}
        >
          {profile?.username?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="font-display text-2xl text-text">
            {profile?.username ?? "…"}
          </h1>
          <div className="text-sm text-muted">
            {profile ? (
              `${profile.games_won} wins · ${Math.max(0, profile.games_played - profile.games_won)} losses · ${profile.games_played} games`
            ) : (
              <DraughtLoader variant="inline" label="Loading profile" className="justify-start py-0" />
            )}
          </div>
        </div>
      </div>

      {profile ? <RatingCardsStrip profile={profile} /> : null}

      {userId != null ? (
        <GameHistorySection
          games={history}
          userId={userId}
          maxRows={50}
          showViewAll={false}
        />
      ) : null}

      <Link
        to="/home"
        className="mt-6 inline-flex text-sm font-semibold text-text underline decoration-header decoration-2"
      >
        ← Back to home
      </Link>
    </motion.div>
  );
}

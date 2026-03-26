import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { challengesApi } from "@/lib/api";
import { DRAUGHT_SOCIAL_REFRESH_EVENT } from "@/hooks/useSocialWebSocket";
import { useAuthStore } from "@/store/authStore";

function parseWsGameId(d: Record<string, unknown>): string | null {
  const raw = d.game_id;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

/**
 * When the other player accepts a friend game invite, the server notifies the challenger
 * over the social WebSocket. Navigate them into the same online game so both sides connect.
 * If the tab missed the WS (e.g. reconnecting), refetching outgoing challenges after the tab
 * becomes visible picks up accepted games with `game_id`.
 */
export function useNavigateWhenChallengeAccepted() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    const onSocial = (ev: Event) => {
      const ce = ev as CustomEvent<unknown>;
      const detail = ce.detail;
      if (!detail || typeof detail !== "object") return;
      const d = detail as Record<string, unknown>;
      if (d.type !== "social") return;
      if (d.action !== "challenge_accepted") return;
      const gameId = parseWsGameId(d);
      if (!gameId) return;

      const path = `/play/game/${encodeURIComponent(gameId)}`;
      if (pathRef.current === path) return;
      navigate(path);
    };

    window.addEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onSocial);
    return () => window.removeEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onSocial);
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const tryNavigateFromOutgoing = () => {
      void (async () => {
        try {
          const { data } = await challengesApi.outgoing();
          const rows = data.results ?? [];
          const accepted = rows.find(
            (c) =>
              c.status === "accepted" &&
              typeof c.game_id === "string" &&
              c.game_id.length > 0,
          );
          if (!accepted?.game_id) return;
          const path = `/play/game/${encodeURIComponent(accepted.game_id)}`;
          if (pathRef.current === path) return;
          navigate(path);
        } catch {
          /* offline / 401 */
        }
      })();
    };

    let lastHidden = document.visibilityState === "hidden";
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        lastHidden = true;
        return;
      }
      if (!lastHidden) return;
      lastHidden = false;
      tryNavigateFromOutgoing();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isAuthenticated, navigate]);
}

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DRAUGHT_SOCIAL_REFRESH_EVENT } from "@/hooks/useSocialWebSocket";

/**
 * When the other player accepts a friend game invite, the server notifies the challenger
 * over the social WebSocket. Navigate them into the same online game so both sides connect.
 */
export function useNavigateWhenChallengeAccepted() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onSocial = (ev: Event) => {
      const ce = ev as CustomEvent<unknown>;
      const detail = ce.detail;
      if (!detail || typeof detail !== "object") return;
      const d = detail as Record<string, unknown>;
      if (d.type !== "social") return;
      if (d.action !== "challenge_accepted") return;
      const gameId = d.game_id;
      if (typeof gameId !== "string" || !gameId.trim()) return;

      const path = `/play/game/${encodeURIComponent(gameId)}`;
      if (location.pathname === path) return;
      navigate(path);
    };

    window.addEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onSocial);
    return () => window.removeEventListener(DRAUGHT_SOCIAL_REFRESH_EVENT, onSocial);
  }, [navigate, location.pathname]);
}

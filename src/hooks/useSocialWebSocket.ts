import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSocialWebSocketUrl } from "@/lib/wsUrl";

/** Fired on `window` when the server pushes a social event (friend request accepted, etc.). */
export const DRAUGHT_SOCIAL_REFRESH_EVENT = "draught-social-refresh";

/**
 * While logged in, keeps one lightweight WebSocket open so friend lists / requests
 * update without a full page refresh when the other user acts.
 */
export function useSocialWebSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const url = getSocialWebSocketUrl(accessToken);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as unknown;
        window.dispatchEvent(
          new CustomEvent(DRAUGHT_SOCIAL_REFRESH_EVENT, { detail: data }),
        );
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [isAuthenticated, accessToken]);
}

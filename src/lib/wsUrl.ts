import { API_BASE_URL } from "@/lib/config";

/**
 * Build WebSocket URL for a game room.
 * - Dev (`VITE_API_BASE_URL=/api`): same host as the SPA; Vite proxies `/ws` → Django.
 * - Prod: derive from absolute `VITE_API_BASE_URL` or set `VITE_WS_BASE` (e.g. `wss://api.example.com`).
 */
export function getGameWebSocketUrl(
  gameId: string,
  accessToken: string | null,
): string {
  const path = `/ws/game/${gameId}/`;

  const explicit = import.meta.env.VITE_WS_BASE?.trim();
  if (explicit && explicit.length > 0) {
    const base = explicit.replace(/\/$/, "");
    const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
    if (accessToken) url.searchParams.set("token", accessToken);
    return url.toString();
  }

  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    try {
      const api = new URL(API_BASE_URL);
      const wsProto = api.protocol === "https:" ? "wss:" : "ws:";
      const url = new URL(path, `${wsProto}//${api.host}`);
      if (accessToken) url.searchParams.set("token", accessToken);
      return url.toString();
    } catch {
      /* fall through */
    }
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(path, `${proto}//${window.location.host}`);
    if (accessToken) url.searchParams.set("token", accessToken);
    return url.toString();
  }

  const url = new URL(path, "ws://localhost:5173");
  if (accessToken) url.searchParams.set("token", accessToken);
  return url.toString();
}

/** Same-origin rules as game WS; path `/ws/social/` for friend-request realtime. */
export function getSocialWebSocketUrl(accessToken: string | null): string {
  const path = "/ws/social/";

  const explicit = import.meta.env.VITE_WS_BASE?.trim();
  if (explicit && explicit.length > 0) {
    const base = explicit.replace(/\/$/, "");
    const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
    if (accessToken) url.searchParams.set("token", accessToken);
    return url.toString();
  }

  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    try {
      const api = new URL(API_BASE_URL);
      const wsProto = api.protocol === "https:" ? "wss:" : "ws:";
      const url = new URL(path, `${wsProto}//${api.host}`);
      if (accessToken) url.searchParams.set("token", accessToken);
      return url.toString();
    } catch {
      /* fall through */
    }
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = new URL(path, `${proto}//${window.location.host}`);
    if (accessToken) url.searchParams.set("token", accessToken);
    return url.toString();
  }

  const url = new URL(path, "ws://localhost:5173");
  if (accessToken) url.searchParams.set("token", accessToken);
  return url.toString();
}

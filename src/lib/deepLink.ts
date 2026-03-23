/**
 * Safe in-app paths for ?returnTo= after login/register (open redirect hardening).
 * Allows deep links like `/play/game/<uuid>` and `/play`.
 */
const MAX_RETURN_LEN = 512;

export function safeReturnTo(raw: string | null): string {
  if (raw == null || raw === "") return "/home";
  const t = raw.trim();
  if (t.length > MAX_RETURN_LEN) return "/home";
  if (!t.startsWith("/")) return "/home";
  if (t.startsWith("//")) return "/home";
  if (t.includes("://")) return "/home";
  if (t.includes("\\")) return "/home";
  return t;
}

/** Path to a live game (for router + returnTo). */
export function gamePlayPath(gameId: string): string {
  const id = encodeURIComponent(String(gameId).trim());
  return `/play/game/${id}`;
}

/** Full URL to share or bookmark (client-only). */
export function absoluteGameUrl(gameId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${gamePlayPath(gameId)}`;
}

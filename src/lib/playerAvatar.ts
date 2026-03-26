import type { CSSProperties } from "react";

/**
 * Deterministic avatar styling from a username (no backend avatar field yet).
 */
export function initialsFromUsername(username: string): string {
  const t = username.trim();
  if (!t) return "?";
  const parts = t.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

/** Stable hue 0–359 for HSL background. */
export function hueFromString(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function avatarBackgroundStyle(seed: string): CSSProperties {
  const h = hueFromString(seed);
  return {
    backgroundColor: `hsl(${h} 42% 38%)`,
    color: "#ffffff",
  };
}

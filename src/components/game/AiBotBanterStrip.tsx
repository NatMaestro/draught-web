export type AiBotBanterStripProps = {
  message: string;
  /** Display name (e.g. roster bot name) — for screen readers only. */
  botName: string;
  /** Shown inside the white bubble only, next to the message. */
  rosterEmoji: string;
  /** Kept for API compatibility; strip uses its own avatar. */
  avatarSeed: string;
};

/**
 * White speech bubble with left tail (points at the strip avatar). Emoji lives
 * only inside the bubble, not on a separate avatar disk.
 */
export function AiBotBanterStrip({
  message,
  botName,
  rosterEmoji,
}: AiBotBanterStripProps) {
  return (
    <div
      className="relative min-w-0 flex-1"
      aria-live="polite"
    >
      <div className="relative rounded-2xl border border-black/5 bg-white px-2.5 py-2 shadow-md sm:px-3 sm:py-2.5">
        <div
          className="absolute -left-1.5 top-[0.85rem] z-10 h-3 w-3 rotate-45 border-b border-l border-black/5 bg-white sm:top-4"
          aria-hidden
        />
        <p className="relative flex min-w-full items-start gap-2 text-left text-[12px] leading-snug text-neutral-900 sm:text-[13px]">
          <span className="shrink-0 text-base leading-none sm:text-lg" role="img" aria-hidden>
            {rosterEmoji}
          </span>
          <span className="min-w-full">
            <span className="sr-only">{botName} says: </span>
            {message}
          </span>
        </p>
      </div>
    </div>
  );
}

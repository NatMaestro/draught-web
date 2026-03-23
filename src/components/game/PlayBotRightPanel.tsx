import { useState } from "react";
import { motion } from "framer-motion";
import { ALL_BOT_TIERS, type BotDef } from "@/data/aiBots";
import { BotSelectModal } from "@/components/game/BotSelectModal";

type Props = {
  selected: BotDef;
  onSelect: (bot: BotDef) => void;
  onPlay: () => void;
  loading: boolean;
  error: string | null;
  onOpenRules?: () => void;
};

/**
 * Desktop: full-height opponent picker + Play.
 * Mobile: compact dock + `BotSelectModal` so the board stays the focus.
 */
export function PlayBotRightPanel({
  selected,
  onSelect,
  onPlay,
  loading,
  error,
  onOpenRules,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      {/* —— Desktop / tablet —— */}
      <div
        className={[
          "hidden min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden border-t border-header/20 bg-sheet/90",
          "md:flex md:border-l md:border-t-0 md:w-[min(100%,320px)] md:min-w-[280px]",
          "md:h-full md:max-h-full md:shrink-0 md:flex-none",
        ].join(" ")}
      >
        <div className="shrink-0 border-b border-header/20 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Play bots
              </p>
              <p className="text-sm font-bold text-text">Choose an opponent</p>
            </div>
            {onOpenRules ? (
              <button
                type="button"
                onClick={onOpenRules}
                className="shrink-0 rounded-lg border border-header/30 bg-cream px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-sheet"
              >
                Rules
              </button>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-b border-header/20 px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Selected
          </p>
          <p className="mt-1 text-base font-bold text-text">
            {selected.emoji} {selected.name}
          </p>
          <p className="mt-1 rounded-lg bg-cream/80 px-2 py-2 text-xs italic leading-snug text-text/90">
            “{selected.tagline}”
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2 [scrollbar-gutter:stable]">
          {ALL_BOT_TIERS.map((tier) => (
            <section key={tier.id} className="mb-4 last:mb-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <h2 className="text-xs font-bold text-text">{tier.label}</h2>
                <span className="text-[9px] font-medium uppercase text-muted">
                  {tier.bots.length} bots
                </span>
              </div>
              <p className="mb-2 text-[10px] leading-snug text-muted">
                {tier.subtitle}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {tier.bots.map((bot) => {
                  const isSel = selected.id === bot.id;
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      disabled={loading}
                      onClick={() => onSelect(bot)}
                      title={`${bot.name} — ${bot.tagline}`}
                      className={[
                        "flex aspect-square flex-col items-center justify-center rounded-xl border-2 text-center transition",
                        isSel
                          ? "border-emerald-500 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                          : "border-header/25 bg-cream/90 hover:border-header/40",
                        loading ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      <span className="text-[1.15rem] leading-none" aria-hidden>
                        {bot.emoji}
                      </span>
                      <span className="mt-0.5 line-clamp-2 px-0.5 text-[8px] font-semibold leading-tight text-text sm:text-[9px]">
                        {bot.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="shrink-0 space-y-2 border-t border-header/20 bg-sheet/90 p-3">
          <motion.button
            type="button"
            disabled={loading}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            onClick={onPlay}
            className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
            style={{ backgroundColor: "#16a34a" }}
          >
            {loading ? "Starting…" : "Play"}
          </motion.button>
          {error ? (
            <p className="text-center text-xs text-red-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <BotSelectModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={selected}
        onSelect={onSelect}
        loading={loading}
      />

      {/* —— Mobile dock —— */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 md:hidden"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="pointer-events-auto mx-auto max-w-lg pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          {error ? (
            <p
              className="mb-2 rounded-xl border border-red-400/40 bg-red-950/80 px-3 py-2 text-center text-xs text-red-100 shadow-lg backdrop-blur-sm"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex gap-2 rounded-2xl border border-white/10 bg-[#0c0f14]/92 p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <button
              type="button"
              disabled={loading}
              onClick={() => setPickerOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-cyan-500/25 bg-white/[0.06] px-3 py-2.5 text-left transition active:scale-[0.99] disabled:opacity-50"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {selected.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
                  Opponent
                </p>
                <p className="truncate text-sm font-bold text-white">
                  {selected.name}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-cyan-500/20 px-2 py-1 text-[11px] font-bold text-cyan-200">
                Change
              </span>
            </button>
            <motion.button
              type="button"
              disabled={loading}
              whileTap={{ scale: loading ? 1 : 0.97 }}
              onClick={onPlay}
              className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-50 min-h-[48px] min-w-[88px]"
              style={{
                background:
                  "linear-gradient(145deg, #22c55e 0%, #15803d 55%, #166534 100%)",
                boxShadow: "0 0 24px -4px rgba(34, 197, 94, 0.45)",
              }}
            >
              {loading ? "…" : "Play"}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { ALL_BOT_TIERS, type BotDef } from "@/data/aiBots";

type Props = {
  open: boolean;
  onClose: () => void;
  selected: BotDef;
  onSelect: (bot: BotDef) => void;
  loading?: boolean;
};

/**
 * Full-screen bottom sheet for choosing a bot — keeps the main board view uncluttered on mobile.
 */
export function BotSelectModal({
  open,
  onClose,
  selected,
  onSelect,
  loading = false,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close bot picker"
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bot-picker-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[min(88dvh,820px)] flex-col rounded-t-[1.35rem] border border-black/10 bg-sheet text-text shadow-[0_-8px_48px_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-cream dark:text-white dark:shadow-[0_-8px_48px_rgba(0,0,0,0.45)]"
            style={{
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-black/15 dark:bg-white/20" aria-hidden />
              <div className="mt-3 flex w-full items-center justify-between px-5">
                <h2
                  id="bot-picker-title"
                  className="font-display text-lg tracking-wide text-text dark:text-white"
                >
                  Choose opponent
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-cyan-300/90 hover:bg-white/10"
                >
                  Done
                </button>
              </div>
              <p className="mt-1 px-5 text-left text-xs text-muted">
                Tap a bot — strength increases by tier. Tap Done when ready.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 [scrollbar-gutter:stable]">
              {ALL_BOT_TIERS.map((tier) => (
                <section key={tier.id} className="mb-6 last:mb-2">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold tracking-wide text-header dark:text-cyan-200/90">
                      {tier.label}
                    </h3>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {tier.bots.length} bots
                    </span>
                  </div>
                  <p className="mb-3 text-[11px] leading-snug text-muted">
                    {tier.subtitle}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                            "flex flex-col items-center justify-center rounded-2xl border px-1.5 py-3 text-center transition",
                            isSel
                              ? "border-header/60 bg-header/15 shadow-[0_0_0_1px_rgba(216,164,119,0.4)] dark:border-cyan-400/60 dark:bg-cyan-500/15 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
                              : "border-black/10 bg-black/[0.03] hover:border-black/20 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.07]",
                            loading ? "opacity-50" : "",
                          ].join(" ")}
                        >
                          <span className="text-2xl leading-none" aria-hidden>
                            {bot.emoji}
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-tight text-text dark:text-slate-100">
                            {bot.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MoveRecord } from "@/hooks/useGamePlay";

function formatMove(m: MoveRecord | null | undefined, index: number): string {
  if (m == null) return `${index + 1}. (move)`;
  const from = m.from;
  const to = m.to;
  if (
    !Array.isArray(from) ||
    from.length < 2 ||
    !Array.isArray(to) ||
    to.length < 2
  ) {
    return `${index + 1}. (move)`;
  }
  const [fr, fc] = from;
  const [tr, tc] = to;
  const p = m.player === 1 ? "P1" : "P2";
  return `${index + 1}. ${p} ${fr + 1}${fc + 1}→${tr + 1}${tc + 1}`;
}

type Props = {
  turnLabel: string;
  moveError: string | null;
  moveHistory: MoveRecord[];
  hintMessage: string | null;
  showChat: boolean;
  onOpenChat?: () => void;
  chatUnreadCount?: number;
  onResign: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onHint: () => void;
  onDownload: () => void;
  onSettings: () => void;
  onOpenRules?: () => void;
  busy: boolean;
  gameOver: boolean;
};

/**
 * Mobile-only: compact bottom dock + sheet for moves, chat, and secondary actions.
 */
export function GamePlayMobileHud({
  turnLabel,
  moveError,
  moveHistory,
  hintMessage,
  showChat,
  onOpenChat,
  chatUnreadCount = 0,
  onResign,
  canUndo,
  onUndo,
  onHint,
  onDownload,
  onSettings,
  onOpenRules,
  busy,
  gameOver,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const movesForDisplay = (
    Array.isArray(moveHistory) ? moveHistory : []
  ).filter((m): m is MoveRecord => m != null);

  const undoEnabled =
    canUndo && movesForDisplay.length > 0 && !busy && !gameOver;

  return (
    <>
      {/* Bottom dock — fixed above safe area */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 pb-safe-dock md:hidden">
        <div className="pointer-events-auto mx-auto max-w-lg px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          <div className="flex touch-manipulation items-stretch gap-2 rounded-2xl border border-white/10 bg-[#0c0f14]/90 px-2 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex min-w-0 flex-1 flex-col justify-center px-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
                Status
              </p>
              <p className="truncate text-[13px] font-bold text-white">
                {turnLabel}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <IconButton
                label="Resign"
                emoji="🏳️"
                disabled={busy || gameOver}
                onClick={onResign}
              />
              <IconButton
                label="Undo"
                emoji="↩"
                disabled={!undoEnabled}
                onClick={onUndo}
                title={
                  canUndo
                    ? "Take back last move"
                    : "Undo only vs AI or local 2P"
                }
              />
              <IconButton
                label="Hint"
                emoji="💡"
                disabled={busy || gameOver}
                onClick={onHint}
              />
              {showChat && onOpenChat ? (
                <IconButtonWithBadge
                  label="Chat"
                  emoji="💬"
                  badgeCount={chatUnreadCount}
                  disabled={busy || gameOver}
                  onClick={onOpenChat}
                />
              ) : null}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex min-h-[48px] min-w-[52px] flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200/95 active:scale-[0.98]"
              >
                <span className="text-base leading-none" aria-hidden>
                  ≡
                </span>
                <span className="mt-0.5">More</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close game menu"
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 360 }}
              className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[min(88dvh,720px)] flex-col rounded-t-[1.25rem] border border-white/10 bg-[#0f1419] text-slate-100 shadow-[0_-12px_48px_rgba(0,0,0,0.5)] md:hidden"
              style={{
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
            >
              <div
                className="flex shrink-0 flex-col items-center border-b border-white/10 px-4 pt-2"
                role="presentation"
              >
                <span className="mb-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />
                <div className="flex w-full items-center justify-between pb-2">
                  <h2 className="font-display text-lg text-white">Game</h2>
                  <button
                    type="button"
                    className="touch-manipulation min-h-[44px] min-w-[44px] rounded-lg px-2 text-sm font-semibold text-cyan-300/90"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
                {moveError ? (
                  <p className="mb-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                    {moveError}
                  </p>
                ) : null}
                {hintMessage ? (
                  <p className="mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-100">
                    {hintMessage}
                  </p>
                ) : null}

                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Moves
                </p>
                {movesForDisplay.length === 0 ? (
                  <p className="text-sm text-slate-400">Starting position</p>
                ) : (
                  <ol className="space-y-1 font-mono text-[11px] text-slate-200">
                    {movesForDisplay.map((m, i) => (
                      <li key={`m-${i}`}>{formatMove(m, i)}</li>
                    ))}
                  </ol>
                )}

                <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onDownload();
                      setSheetOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-white"
                  >
                    <span aria-hidden>⬇</span>
                    Download record
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSettings();
                      setSheetOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-white"
                  >
                    <span aria-hidden>⚙</span>
                    Settings
                  </button>
                  {onOpenRules ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRules();
                        setSheetOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] py-3 text-sm font-semibold text-white"
                    >
                      Rules
                    </button>
                  ) : null}
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function IconButton({
  label,
  emoji,
  disabled,
  onClick,
  title,
}: {
  label: string;
  emoji: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`touch-manipulation flex min-h-[48px] min-w-[44px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-1.5 py-1 text-[10px] font-semibold text-slate-200 transition active:scale-[0.97] ${
        disabled
          ? "cursor-not-allowed opacity-35"
          : "hover:border-white/20 hover:bg-white/[0.08]"
      }`}
    >
      <span className="text-lg leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-0.5">{label}</span>
    </button>
  );
}

function IconButtonWithBadge({
  label,
  emoji,
  badgeCount,
  disabled,
  onClick,
}: {
  label: string;
  emoji: string;
  badgeCount: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative touch-manipulation flex min-h-[48px] min-w-[44px] flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-1 text-[10px] font-semibold text-cyan-200/95 transition active:scale-[0.97] ${
        disabled ? "cursor-not-allowed opacity-35" : "hover:border-cyan-400/50"
      }`}
    >
      {badgeCount > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: "#E85D4C" }}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
      <span className="text-lg leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-0.5">{label}</span>
    </button>
  );
}

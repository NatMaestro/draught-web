import type { MoveRecord } from "@/hooks/useGamePlay";
import type { WsChatMessage } from "@/hooks/useGameWebSocket";
import { GameChatPanel } from "@/components/game/GameChatPanel";

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
  chatMessages: WsChatMessage[];
  sendChatMessage: (text: string) => void;
  chatSenderLabel: string;
  chatDisabled: boolean;
  wsConnected: boolean;
  onResign: () => void;
  /** Server allows undo (AI / local guest games with moves). */
  canUndo: boolean;
  onUndo: () => void;
  onHint: () => void;
  onDownload: () => void;
  onSettings: () => void;
  /** Opens the rules / how-to-play modal (same as sidebar & mobile header). */
  onOpenRules?: () => void;
  busy: boolean;
  gameOver: boolean;
};

/**
 * Right of board: status, move list, chat, action toolbar (resign / undo / hint / download / settings).
 */
export function GamePlayRightPanel({
  turnLabel,
  moveError,
  moveHistory,
  hintMessage,
  showChat,
  chatMessages,
  sendChatMessage,
  chatSenderLabel,
  chatDisabled,
  wsConnected,
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
  const movesForDisplay = (
    Array.isArray(moveHistory) ? moveHistory : []
  ).filter((m): m is MoveRecord => m != null);

  const undoEnabled =
    canUndo && movesForDisplay.length > 0 && !busy && !gameOver;

  return (
    <div className="flex w-full min-w-0 flex-col border-t border-header/20 bg-sheet/90 lg:w-[min(100%,320px)] lg:border-l lg:border-t-0 xl:min-w-[300px]">
      <div className="border-b border-header/20 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Game
            </p>
            <p className="text-sm font-bold text-text">{turnLabel}</p>
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
        {moveError ? (
          <p className="mt-1 text-xs text-red-700">{moveError}</p>
        ) : null}
        {hintMessage ? (
          <p className="mt-1 rounded-md bg-active/35 px-2 py-1 text-xs text-text">
            {hintMessage}
          </p>
        ) : null}
      </div>

      {showChat ? (
        <div className="border-b border-header/20 px-2 py-2">
          <GameChatPanel
            messages={chatMessages}
            onSend={sendChatMessage}
            senderLabel={chatSenderLabel}
            disabled={chatDisabled}
            connected={wsConnected}
            variant="embedded"
          />
        </div>
      ) : null}

      <div className="min-h-[120px] flex-1 overflow-y-auto border-b border-header/20 px-3 py-2">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Moves
        </p>
        {movesForDisplay.length === 0 ? (
          <p className="text-xs text-muted">Starting position</p>
        ) : (
          <ol className="space-y-1 font-mono text-[11px] text-text/90 sm:text-xs">
            {movesForDisplay.map((m, i) => (
              <li key={`move-${i}`}>
                {formatMove(m, i)}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-auto space-y-2 p-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={busy || gameOver}
            onClick={() => void onResign()}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-red-700 py-3 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
            title="Resign"
          >
            <span className="text-lg" aria-hidden>
              🏳️
            </span>
            Resign
          </button>
          <button
            type="button"
            disabled={!undoEnabled}
            onClick={onUndo}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-header/30 py-3 text-xs font-semibold transition ${
              undoEnabled
                ? "bg-cream/90 text-text hover:bg-sheet"
                : "cursor-not-allowed bg-cream/50 text-muted"
            }`}
            title={
              canUndo
                ? "Take back the last move (vs AI or local 2P only)"
                : "Undo is only available vs bots or in local 2-player games"
            }
          >
            <span className="text-lg" aria-hidden>
              ↩
            </span>
            Undo
          </button>
          <button
            type="button"
            disabled={busy || gameOver}
            onClick={onHint}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-header py-3 text-xs font-semibold text-text transition hover:brightness-95 disabled:opacity-40"
            title="Hint"
          >
            <span className="text-lg" aria-hidden>
              💡
            </span>
            Hint
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-header/30 bg-cream py-2.5 text-xs font-semibold text-text hover:bg-sheet"
            title="Download game record (JSON)"
          >
            <span aria-hidden>⬇</span>
            Download
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-header/30 bg-cream py-2.5 text-xs font-semibold text-text hover:bg-sheet"
            title="Settings"
          >
            <span aria-hidden>⚙</span>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

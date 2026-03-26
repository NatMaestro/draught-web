import type { WsChatMessage } from "@/hooks/useGameWebSocket";
import { GameChatPanel } from "@/components/game/GameChatPanel";

type Props = {
  onClose: () => void;
  messages: WsChatMessage[];
  onSend: (text: string) => void;
  senderLabel: string;
  disabled: boolean;
  connected: boolean;
  peerTyping?: boolean;
  peerTypingName?: string | null;
  onTypingActivity?: (active: boolean) => void;
};

/**
 * md+: docked chat column — board stays visible; no full-screen dimmer.
 */
export function GameChatDesktopAside({
  onClose,
  messages,
  onSend,
  senderLabel,
  disabled,
  connected,
  peerTyping = false,
  peerTypingName = null,
  onTypingActivity,
}: Props) {
  return (
    <aside
      className="relative z-20 hidden min-h-0 w-[min(100%,380px)] min-w-[300px] shrink-0 flex-col border-l border-header/25 bg-sheet/95 shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] md:flex"
      aria-label="Game chat"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-header/20 px-4 py-3">
        <h2 className="text-lg font-bold text-text">Game chat</h2>
        <button
          type="button"
          className="min-h-[40px] rounded-lg px-3 text-sm font-semibold text-muted transition hover:bg-header/10 hover:text-text"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-1">
        <GameChatPanel
          messages={messages}
          onSend={onSend}
          senderLabel={senderLabel}
          disabled={disabled}
          connected={connected}
          variant="modal"
          peerTyping={peerTyping}
          peerTypingName={peerTypingName}
          onTypingActivity={onTypingActivity}
        />
      </div>
    </aside>
  );
}

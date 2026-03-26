import { AnimatePresence, motion } from "framer-motion";
import type { WsChatMessage } from "@/hooks/useGameWebSocket";
import { GameChatPanel } from "@/components/game/GameChatPanel";
import { useVisualViewportHeight } from "@/hooks/useVisualViewportHeight";

type Props = {
  open: boolean;
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
 * Mobile / small screens: bottom sheet + backdrop.
 * On md+, chat lives in the right panel with moves — this modal is `md:hidden`.
 */
export function GameChatModal({
  open,
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
  const vvHeight = useVisualViewportHeight();
  const sheetMaxPx = Math.max(220, Math.min(560, Math.floor(vvHeight * 0.9)));

  return (
    <AnimatePresence>
      {open ? (
        <div className="md:hidden">
          <motion.button
            type="button"
            aria-label="Close chat"
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-chat-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col rounded-t-[1.25rem] border border-header/20 bg-sheet shadow-2xl"
            style={{
              maxHeight: sheetMaxPx,
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              paddingTop: "max(0.5rem, env(safe-area-inset-top))",
            }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-header/20 px-4 py-3">
              <h2 id="game-chat-title" className="text-lg font-bold text-text">
                Game chat
              </h2>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-lg text-sm font-semibold text-muted hover:text-text"
                onClick={onClose}
              >
                Done
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
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

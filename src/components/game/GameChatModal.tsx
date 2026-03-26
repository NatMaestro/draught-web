import { AnimatePresence, motion } from "framer-motion";
import type { WsChatMessage } from "@/hooks/useGameWebSocket";
import { GameChatPanel } from "@/components/game/GameChatPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  messages: WsChatMessage[];
  onSend: (text: string) => void;
  senderLabel: string;
  disabled: boolean;
  connected: boolean;
};

export function GameChatModal({
  open,
  onClose,
  messages,
  onSend,
  senderLabel,
  disabled,
  connected,
}: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close chat"
            className="fixed inset-0 z-[80] bg-black/50"
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
            transition={{ type: "spring", damping: 32, stiffness: 360 }}
            className="fixed bottom-0 left-0 right-0 z-[81] flex max-h-[min(85dvh,560px)] flex-col rounded-t-[1.25rem] border border-header/20 bg-sheet shadow-2xl md:left-auto md:right-4 md:top-4 md:max-h-[min(100dvh-2rem,520px)] md:w-full md:max-w-md md:rounded-2xl"
            style={{
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
              />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

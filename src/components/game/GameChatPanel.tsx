import { useCallback, useEffect, useRef, useState } from "react";
import type { WsChatMessage } from "@/hooks/useGameWebSocket";

type Props = {
  messages: WsChatMessage[];
  onSend: (text: string) => void;
  senderLabel: string;
  disabled?: boolean;
  connected?: boolean;
  /** Collapsible panel (default) vs always-visible dark sidebar block */
  variant?: "default" | "embedded";
};

export function GameChatPanel({
  messages,
  onSend,
  senderLabel,
  disabled = false,
  connected = false,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(variant === "embedded");
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open]);

  const embedded = variant === "embedded";

  const submit = useCallback(() => {
    const t = draft.trim();
    if (!t || disabled) return;
    onSend(t);
    setDraft("");
  }, [draft, disabled, onSend]);

  if (embedded) {
    return (
      <div className="w-full">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Chat {connected ? "" : "(offline)"}
        </p>
        <div className="flex max-h-36 flex-col rounded-lg border border-header/25 bg-cream/90">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2 text-[11px]">
            {messages.length === 0 ? (
              <p className="text-center text-muted">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-md bg-sheet/90 px-2 py-1 ring-1 ring-header/15"
                >
                  <span className="font-semibold text-text">{m.sender}: </span>
                  <span className="text-text/90">{m.text}</span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-1 border-t border-header/20 p-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={senderLabel ? `As ${senderLabel}` : "Message"}
              disabled={disabled || !connected}
              className="min-w-0 flex-1 rounded-md border border-header/30 bg-cream px-2 py-1.5 text-xs text-text placeholder:text-muted"
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => submit()}
              disabled={disabled || !connected || !draft.trim()}
              className="shrink-0 rounded-md bg-header px-3 py-1.5 text-xs font-bold text-text disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-md shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-header/25 bg-sheet/80 px-3 py-2 text-left text-sm font-semibold text-text"
      >
        <span>Chat {connected ? "" : "(offline)"}</span>
        <span className="text-muted">{open ? "▼" : "▶"}</span>
      </button>
      {open ? (
        <div className="mt-1 flex max-h-48 flex-col rounded-xl border border-header/20 bg-sheet/60">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2 text-xs">
            {messages.length === 0 ? (
              <p className="text-center text-muted">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-cream/90 px-2 py-1">
                  <span className="font-semibold text-text">{m.sender}: </span>
                  <span className="text-text/90">{m.text}</span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-1 border-t border-header/15 p-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={senderLabel ? `Message as ${senderLabel}` : "Message"}
              disabled={disabled || !connected}
              className="min-w-0 flex-1 rounded-lg border border-header/20 bg-cream px-2 py-1.5 text-sm text-text placeholder:text-muted"
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => submit()}
              disabled={disabled || !connected || !draft.trim()}
              className="shrink-0 rounded-lg bg-header px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

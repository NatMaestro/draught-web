import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WsChatMessage } from "@/hooks/useGameWebSocket";

type Props = {
  messages: WsChatMessage[];
  onSend: (text: string) => void;
  senderLabel: string;
  disabled?: boolean;
  connected?: boolean;
  /** Collapsible panel, sidebar block, or full chat modal body */
  variant?: "default" | "embedded" | "modal";
  peerTyping?: boolean;
  peerTypingName?: string | null;
  onTypingActivity?: (active: boolean) => void;
};

function sameSender(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function MessageBubble({
  m,
  mine,
}: {
  m: WsChatMessage;
  mine: boolean;
}) {
  return (
    <div
      className={`flex w-full animate-chat-in ${mine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[min(100%,20rem)] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm transition-colors ${
          mine
            ? "rounded-br-md bg-header text-white"
            : "rounded-bl-md bg-sheet/95 text-text ring-1 ring-header/15"
        }`}
      >
        {!mine ? (
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {m.sender}
          </p>
        ) : null}
        <p className={`whitespace-pre-wrap break-words ${mine ? "text-white" : "text-text/95"}`}>
          {m.text}
        </p>
      </div>
    </div>
  );
}

export function GameChatPanel({
  messages,
  onSend,
  senderLabel,
  disabled = false,
  connected = false,
  variant = "default",
  peerTyping = false,
  peerTypingName = null,
  onTypingActivity,
}: Props) {
  const [open, setOpen] = useState(variant === "embedded" || variant === "modal");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingIdleRef = useRef<number | null>(null);
  const onTypingActivityRef = useRef(onTypingActivity);
  onTypingActivityRef.current = onTypingActivity;

  const scrollKey = useMemo(() => {
    if (messages.length === 0) return "0";
    const last = messages[messages.length - 1];
    return `${messages.length}:${last.id}:${last.text.length}`;
  }, [messages]);

  useLayoutEffect(() => {
    if (variant === "default" && !open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [scrollKey, peerTyping, open, variant]);

  const flushTyping = useCallback((active: boolean) => {
    onTypingActivityRef.current?.(active);
  }, []);

  useEffect(() => {
    return () => {
      if (typingIdleRef.current != null) {
        window.clearTimeout(typingIdleRef.current);
      }
      onTypingActivityRef.current?.(false);
    };
  }, []);

  const embedded = variant === "embedded";

  const submit = useCallback(() => {
    const t = draft.trim();
    if (!t || disabled) return;
    if (typingIdleRef.current != null) {
      window.clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    flushTyping(false);
    onSend(t);
    setDraft("");
  }, [draft, disabled, onSend, flushTyping]);

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!connected || disabled || !onTypingActivity) return;
    if (typingIdleRef.current != null) {
      window.clearTimeout(typingIdleRef.current);
    }
    flushTyping(true);
    typingIdleRef.current = window.setTimeout(() => {
      typingIdleRef.current = null;
      flushTyping(false);
    }, 1200);
  };

  const onInputBlur = () => {
    if (typingIdleRef.current != null) {
      window.clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    flushTyping(false);
  };

  const typingHint =
    peerTyping && peerTypingName
      ? `${peerTypingName} is typing…`
      : peerTyping
        ? "Opponent is typing…"
        : null;

  const inputClassModal =
    "min-w-0 flex-1 touch-manipulation rounded-xl border border-header/30 bg-cream px-3 py-2.5 text-base leading-normal text-text placeholder:text-muted outline-none transition-[box-shadow] focus:border-header/50 focus:ring-2 focus:ring-header/25";

  const inputClassSmall =
    "min-w-0 flex-1 touch-manipulation rounded-md border border-header/30 bg-cream px-2 py-1.5 text-base leading-normal text-text placeholder:text-muted outline-none";

  const scrollClass =
    "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [contain:layout_style]";

  if (variant === "modal") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-header/25 bg-cream/90 shadow-inner">
          <div
            ref={scrollRef}
            className={`${scrollClass} px-3 py-2 text-sm`}
          >
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  m={m}
                  mine={sameSender(m.sender, senderLabel)}
                />
              ))
            )}
            {typingHint ? (
              <p className="pl-1 text-xs italic text-muted motion-safe:animate-pulse">
                {typingHint}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2 border-t border-header/20 p-3">
            <input
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              onBlur={onInputBlur}
              placeholder={senderLabel ? `Message as ${senderLabel}` : "Message"}
              disabled={disabled || !connected}
              className={inputClassModal}
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => submit()}
              disabled={disabled || !connected || !draft.trim()}
              className="shrink-0 rounded-xl bg-header px-4 py-2.5 text-sm font-bold text-text shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
        {!connected ? (
          <p className="mt-2 text-center text-xs text-muted">Chat offline — reconnecting…</p>
        ) : null}
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="w-full">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          Chat {connected ? "" : "(offline)"}
        </p>
        <div className="flex max-h-[min(40vh,260px)] flex-col rounded-lg border border-header/25 bg-cream/90 sm:max-h-40">
          <div ref={scrollRef} className={`${scrollClass} px-2 py-2 text-[11px]`}>
            {messages.length === 0 ? (
              <p className="text-center text-muted">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  m={m}
                  mine={sameSender(m.sender, senderLabel)}
                />
              ))
            )}
            {typingHint ? (
              <p className="text-[10px] italic text-muted">{typingHint}</p>
            ) : null}
          </div>
          <div className="flex gap-1 border-t border-header/20 p-2">
            <input
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              onBlur={onInputBlur}
              placeholder={senderLabel ? `As ${senderLabel}` : "Message"}
              disabled={disabled || !connected}
              className={inputClassSmall}
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
        className="flex w-full items-center justify-between rounded-xl border border-header/25 bg-sheet/80 px-3 py-2 text-left text-sm font-semibold text-text transition hover:bg-sheet"
      >
        <span>Chat {connected ? "" : "(offline)"}</span>
        <span className="text-muted">{open ? "▼" : "▶"}</span>
      </button>
      {open ? (
        <div className="mt-1 flex max-h-48 flex-col rounded-xl border border-header/20 bg-sheet/60">
          <div ref={scrollRef} className={`${scrollClass} px-2 py-2 text-xs`}>
            {messages.length === 0 ? (
              <p className="text-center text-muted">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  m={m}
                  mine={sameSender(m.sender, senderLabel)}
                />
              ))
            )}
            {typingHint ? (
              <p className="text-[10px] italic text-muted">{typingHint}</p>
            ) : null}
          </div>
          <div className="flex gap-1 border-t border-header/15 p-2">
            <input
              type="text"
              enterKeyHint="send"
              autoComplete="off"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              onBlur={onInputBlur}
              placeholder={senderLabel ? `Message as ${senderLabel}` : "Message"}
              disabled={disabled || !connected}
              className="min-w-0 flex-1 touch-manipulation rounded-lg border border-header/20 bg-cream px-2 py-2 text-base text-text placeholder:text-muted outline-none sm:text-sm"
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

import { useCallback, useEffect, useRef, useState } from "react";
import { getGameWebSocketUrl } from "@/lib/wsUrl";

export type WsChatMessage = {
  id: string;
  sender: string;
  text: string;
  created_at: string;
};

export type WsMovePayload = {
  type: "move_update";
  board: number[][];
  current_turn: number;
  winner: number | null;
  status: string;
  captured: Array<{ row: number; col: number }>;
  /** Ply count after this move — used to ignore stale `game_state` snapshots. */
  move_count?: number;
  /** Present when the game ended on time (loss by clock). */
  end_reason?: string;
};

export type WsGameOverPayload = {
  type: "game_over";
  reason: string;
  winner?: number | null;
  winner_id?: string | null;
  status?: string;
};

export type WsGameStatePayload = {
  type: "game_state";
  board: number[][];
  current_turn: number;
  status: string;
  winner?: number | string | null;
  is_ai_game?: boolean;
  ai_difficulty?: string;
  chat?: WsChatMessage[];
  move_count?: number;
  /** True when this snapshot follows an undo — allows lower `move_count` than last applied. */
  undo_applied?: boolean;
};

type UseGameWebSocketOptions = {
  gameId: string | undefined;
  accessToken: string | null;
  /** When false, do not connect (e.g. env `VITE_USE_GAME_WS=false`). */
  enabled?: boolean;
  onMoveUpdate?: (payload: WsMovePayload) => void;
  onGameState?: (payload: WsGameStatePayload) => void;
  onGameOver?: (payload: WsGameOverPayload) => void;
  onChatMessage?: (msg: WsChatMessage & { type?: string }) => void;
  onError?: (detail: string) => void;
};

/**
 * Real-time game channel: join, moves, chat. Uses JWT in query string (see backend middleware).
 */
export function useGameWebSocket({
  gameId,
  accessToken,
  enabled = true,
  onMoveUpdate,
  onGameState,
  onGameOver,
  onChatMessage,
  onError,
}: UseGameWebSocketOptions) {
  const [ready, setReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef(0);

  const handlersRef = useRef({
    onMoveUpdate,
    onGameState,
    onGameOver,
    onChatMessage,
    onError,
  });
  handlersRef.current = {
    onMoveUpdate,
    onGameState,
    onGameOver,
    onChatMessage,
    onError,
  };

  const sendJson = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }, []);

  const sendChat = useCallback(
    (text: string, sender: string) => {
      sendJson({ type: "chat", text, sender });
    },
    [sendJson],
  );

  const sendMove = useCallback(
    (payload: {
      from_row: number;
      from_col: number;
      to_row: number;
      to_col: number;
    }) => {
      sendJson({ type: "make_move", ...payload });
    },
    [sendJson],
  );

  const sendResign = useCallback(() => {
    sendJson({ type: "resign" });
  }, [sendJson]);

  useEffect(() => {
    if (!gameId || !enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    /** Browser timer id (avoid NodeJS.Timeout vs number mismatch). */
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = getGameWebSocketUrl(gameId, accessToken);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        // Ignore stale socket if we already replaced this connection.
        if (wsRef.current !== ws) return;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "join_game" }));
        }
        setReady(true);
        reconnectRef.current = 0;
      };

      ws.onmessage = (ev) => {
        if (cancelled || wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
          const t = msg.type as string | undefined;
          const h = handlersRef.current;

          if (t === "error") {
            h.onError?.(String(msg.detail ?? "Unknown error"));
            return;
          }
          if (t === "move_update") {
            h.onMoveUpdate?.(msg as unknown as WsMovePayload);
            return;
          }
          if (t === "game_state") {
            h.onGameState?.(msg as unknown as WsGameStatePayload);
            return;
          }
          if (t === "game_over") {
            h.onGameOver?.(msg as unknown as WsGameOverPayload);
            return;
          }
          if (t === "chat_message") {
            h.onChatMessage?.(msg as WsChatMessage & { type?: string });
            return;
          }
        } catch {
          handlersRef.current.onError?.("Invalid server message");
        }
      };

      ws.onerror = () => {
        if (cancelled || wsRef.current !== ws) return;
        handlersRef.current.onError?.("WebSocket error");
      };

      ws.onclose = () => {
        // Only the active socket may clear state; stale closes must not wipe a newer connection.
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setReady(false);
        if (cancelled) return;
        const delay = Math.min(1000 * 2 ** reconnectRef.current, 15000);
        reconnectRef.current += 1;
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          if (cancelled || !gameId || !enabled) return;
          connect();
        }, delay);
      };
    };

    reconnectRef.current = 0;
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      setReady(false);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [gameId, accessToken, enabled]);

  return {
    wsReady: ready,
    sendMove,
    sendChat,
    sendResign,
  };
}

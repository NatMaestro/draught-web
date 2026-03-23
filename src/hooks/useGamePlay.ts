import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  gamesApi,
  type GameDetail,
  type GamePlayerPublic,
  type MoveResponse,
} from "@/lib/api";
import {
  playGameOverSound,
  playMoveSound,
  playWarningSound,
} from "@/lib/gameSounds";
import { useGameSettingsStore } from "@/store/gameSettingsStore";
import { useAuthStore } from "@/store/authStore";
import {
  useGameWebSocket,
  type WsChatMessage,
  type WsGameStatePayload,
} from "@/hooks/useGameWebSocket";
import { parseClockSnapshot } from "@/hooks/useGameClock";
import type { ServerClockSnapshot } from "@/lib/api";
import { winnerSeatFromGameDetail } from "@/lib/gameOutcome";
import {
  applyOptimisticMove,
  computeCaptureJumpWaypoints,
  inferMoveEndpointsFromBoardDiff,
  nextTurnAfter,
  type LegalDestination,
} from "@/lib/optimisticBoard";
import { computeLegalDestinations } from "@/lib/clientLegalMoves";
import {
  BOARD_ROTATION_MS_MAX,
  BOARD_ROTATION_MS_MIN,
  BOARD_SIZE,
  DEFAULT_BOARD_ROTATION_MS,
  MULTI_CAPTURE_STEP_MS,
  emptyBoard,
  normalizeBoardState,
} from "@/lib/boardUtils";
import { boardStateToThumbnailDataUrl } from "@/lib/boardThumbnail";
import {
  clearResumeSnapshot,
  loadResumeSnapshot,
  saveResumeSnapshot,
} from "@/lib/resumeGameStorage";

/** Set `VITE_USE_GAME_WS=false` to force REST-only moves. */
const USE_GAME_WS = import.meta.env.VITE_USE_GAME_WS !== "false";

function parsePlayerRef(raw: unknown): GamePlayerPublic | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "number" ? o.id : Number(o.id);
  const un = o.username;
  if (!Number.isFinite(id) || typeof un !== "string" || !un.trim()) return null;
  return { id, username: un.trim() };
}

/**
 * Django POST /move/ returns `board`; some proxies/clients may differ.
 * Always clone — same reference can prevent React from updating the board.
 */
function normalizeMoveResponse(raw: unknown): MoveResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const boardRaw = o.board ?? o.board_state;
  if (!Array.isArray(boardRaw) || boardRaw.length !== BOARD_SIZE) return null;
  const toNum = (x: unknown): number => {
    if (typeof x === "number" && !Number.isNaN(x)) return x;
    if (typeof x === "string" && x.trim() !== "") return Number(x);
    return 0;
  };
  /** Winner must be 1, 2, or null — never NaN (breaks game-over UI). */
  const toWinner = (x: unknown): number | null => {
    if (x == null || x === "") return null;
    const n = toNum(x);
    if (!Number.isFinite(n)) return null;
    if (n === 1 || n === 2) return n;
    return null;
  };
  const board = normalizeBoardState(boardRaw);
  const ctRaw = toNum(o.current_turn ?? o.currentTurn);
  const current_turn = ctRaw === 2 ? 2 : 1;
  const capturedRaw = Array.isArray(o.captured) ? o.captured : [];
  const captured: MoveResponse["captured"] = capturedRaw
    .map((item): { row: number; col: number } | null => {
      // JSON arrays [r, c] are `typeof` "object" but have no .row — handle first.
      if (Array.isArray(item) && item.length >= 2) {
        return { row: toNum(item[0]), col: toNum(item[1]) };
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>;
        return {
          row: toNum(rec.row ?? rec.Row),
          col: toNum(rec.col ?? rec.Col),
        };
      }
      return null;
    })
    .filter((x): x is { row: number; col: number } => x != null);
  const cpvRaw = o.captured_piece_values ?? o.capturedPieceValues;
  const cpvParsed = Array.isArray(cpvRaw)
    ? cpvRaw.map((x) => toNum(x))
    : undefined;
  const mcRaw = o.move_count ?? o.moveCount;
  const move_count =
    typeof mcRaw === "number" && Number.isFinite(mcRaw)
      ? mcRaw
      : typeof mcRaw === "string" && mcRaw.trim() !== ""
        ? toNum(mcRaw)
        : undefined;
  const out: MoveResponse = {
    board,
    current_turn,
    winner: toWinner(o.winner),
    status: String(o.status ?? "active"),
    captured,
    ...(cpvParsed &&
      cpvParsed.length === captured.length && {
        captured_piece_values: cpvParsed,
      }),
  };
  if (
    move_count !== undefined &&
    Number.isFinite(move_count) &&
    move_count >= 0
  ) {
    out.move_count = Math.floor(move_count);
  }
  return out;
}

function sanitizeTurn(t: unknown): 1 | 2 {
  return Number(t) === 2 ? 2 : 1;
}

function applyMovePayload(
  data: MoveResponse,
  setters: {
    setBoard: (b: number[][]) => void;
    setCurrentTurn: (t: number) => void;
    setWinner: (w: number | null) => void;
    setStatus: (s: string) => void;
    setConfirmedTurnForFlip: (t: 1 | 2) => void;
  },
) {
  const ct = sanitizeTurn(data.current_turn);
  setters.setBoard(normalizeBoardState(data.board));
  setters.setCurrentTurn(ct);
  setters.setConfirmedTurnForFlip(ct);
  setters.setWinner(data.winner);
  setters.setStatus(data.status);
}

function isOwnPiece(cell: number, turn: number): boolean {
  return (
    (turn === 1 && (cell === 1 || cell === 3)) ||
    (turn === 2 && (cell === 2 || cell === 4))
  );
}

function getPieceOwner(cell: number): 1 | 2 | null {
  if (cell === 1 || cell === 3) return 1;
  if (cell === 2 || cell === 4) return 2;
  return null;
}

const MOVE_LOG_PREFIX = "[Draught move]";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Record for move list / export (local confirmed moves). */
export type MoveRecord = {
  from: [number, number];
  to: [number, number];
  player: 1 | 2;
};

/** Rebuild move list from GET /games/:id/ after refresh (plies alternate P1, P2, …). */
function mapApiMovesToMoveRecords(
  raw: GameDetail["moves"],
): MoveRecord[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((m, i) => ({
    from: [Number(m.from_row), Number(m.from_col)] as [number, number],
    to: [Number(m.to_row), Number(m.to_col)] as [number, number],
    player: ((i % 2) + 1) as 1 | 2,
  }));
}

function computeMySeatFromGameDetail(
  data: Pick<GameDetail, "player_one" | "player_two" | "is_ai_game" | "is_local_2p">,
  userId: number | null,
  username: string | null,
): 1 | 2 | null {
  if (Boolean(data.is_ai_game) || Boolean(data.is_local_2p)) return null;
  const p1 = parsePlayerRef(data.player_one);
  const p2 = parsePlayerRef(data.player_two);
  if (!p1 || !p2) return null;
  if (userId != null) {
    if (p1.id === userId) return 1;
    if (p2.id === userId) return 2;
  }
  if (username) {
    if (p1.username === username) return 1;
    if (p2.username === username) return 2;
  }
  return null;
}

/**
 * Landing square to highlight: where the opponent (or bot / previous player in local 2P) last moved.
 */
function opponentLastMoveHighlightFromHistory(
  moves: MoveRecord[],
  args: {
    status: string;
    isAiGame: boolean;
    isLocal2p: boolean;
    mySeat: 1 | 2 | null;
  },
): [number, number] | null {
  if (args.status !== "active") return null;
  if (moves.length === 0) return null;
  const last = moves[moves.length - 1];
  if (args.isAiGame) {
    return last.player === 2 ? last.to : null;
  }
  if (args.isLocal2p) return last.to;
  if (args.mySeat == null) return null;
  return last.player !== args.mySeat ? last.to : null;
}

function computeOpponentLastMoveHighlight(
  data: GameDetail,
  moves: MoveRecord[],
  userId: number | null,
  username: string | null,
): [number, number] | null {
  const seat = computeMySeatFromGameDetail(data, userId, username);
  return opponentLastMoveHighlightFromHistory(moves, {
    status: data.status ?? "active",
    isAiGame: Boolean(data.is_ai_game),
    isLocal2p: Boolean(data.is_local_2p),
    mySeat: seat,
  });
}

function logMove(
  message: string,
  payload?: Record<string, unknown>,
): void {
  if (payload !== undefined) {
    console.log(MOVE_LOG_PREFIX, message, payload);
  } else {
    console.log(MOVE_LOG_PREFIX, message);
  }
}

export function useGamePlay(gameId: string | undefined) {
  const soundEnabled = useGameSettingsStore((s) => s.soundEnabled);
  const rotateBoardForTurn = useGameSettingsStore((s) => s.rotateBoardForTurn);
  const accessToken = useAuthStore((s) => s.accessToken);
  const username = useAuthStore((s) => s.username);
  const userId = useAuthStore((s) => s.userId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [board, setBoard] = useState<number[][]>(() => emptyBoard());
  const [currentTurn, setCurrentTurn] = useState(1);
  const [winner, setWinner] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("active");
  const [isAiGame, setIsAiGame] = useState(false);
  const [isRanked, setIsRanked] = useState(false);
  const [isLocal2p, setIsLocal2p] = useState(false);
  /** Online PvP seat labels / board orientation (from GET /games/:id/). */
  const [playerOneProfile, setPlayerOneProfile] =
    useState<GamePlayerPublic | null>(null);
  const [playerTwoProfile, setPlayerTwoProfile] =
    useState<GamePlayerPublic | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(
    null,
  );
  const [possibleMoves, setPossibleMoves] = useState<LegalDestination[]>([]);
  const [busy, setBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  /** Cell values (1–4) of opponent pieces captured by each player (for UI trophies). */
  const [p1CapturedPieces, setP1CapturedPieces] = useState<number[]>([]);
  const [p2CapturedPieces, setP2CapturedPieces] = useState<number[]>([]);
  /** Server-authoritative clock; null until load or if backend has no clock fields. */
  const [serverClock, setServerClock] = useState<ServerClockSnapshot | null>(
    null,
  );
  /** True when the last finish was by resignation (WebSocket or local resign). */
  const [endedByResign, setEndedByResign] = useState(false);
  /** True when the game ended because a player ran out of time. */
  const [endedByTimeout, setEndedByTimeout] = useState(false);
  /** Server flag: clocks and time loss are active (false = untimed). */
  const [useClock, setUseClock] = useState(true);
  useEffect(() => {
    setServerClock(null);
    setEndedByResign(false);
    setEndedByTimeout(false);
    setUseClock(true);
  }, [gameId]);
  useEffect(() => {
    lastAppliedMoveCountRef.current = 0;
  }, [gameId]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  /** Highlight destination square for Hint (row, col). */
  const [hintDestination, setHintDestination] = useState<
    [number, number] | null
  >(null);
  /** AI games: landing square of the bot's last move (clears when the human plays). */
  const [lastBotMoveTo, setLastBotMoveTo] = useState<
    [number, number] | null
  >(null);
  const [canUndo, setCanUndo] = useState(false);
  /** Server-confirmed turn for board flip only — lags optimistic `currentTurn` until API/WS confirms. */
  const [confirmedTurnForFlip, setConfirmedTurnForFlip] = useState<1 | 2>(1);
  /** Framer rotation duration (ms); last measured move round-trip, clamped. */
  const [boardRotationMs, setBoardRotationMs] = useState(
    DEFAULT_BOARD_ROTATION_MS,
  );
  const moveTimingStartRef = useRef<number | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const lastMoveRef = useRef<MoveRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<WsChatMessage[]>([]);
  const pendingWsMoveRef = useRef(false);
  /** Roll back optimistic board/turn if server rejects the move. */
  const optimisticSnapshotRef = useRef<{
    board: number[][];
    currentTurn: number;
  } | null>(null);
  /** Avoid double move sound when we already played on optimistic apply. */
  const skipNextMoveSoundRef = useRef(false);
  /**
   * Cell values (1–4) at `chosen.captured` squares on the board **before** optimistic apply.
   * After optimistic update, `boardRef` is post-move so `addCapturesForMover` can't read captured
   * pieces from the board alone — this ref supplies the same values for the server ack.
   */
  const pendingCaptureValuesRef = useRef<number[] | null>(null);
  /** Bump to cancel in-flight multi-capture step animation. */
  const captureAnimTokenRef = useRef(0);
  /**
   * Last applied ply count (matches server `moves.length`). Used to drop stale `game_state`
   * (e.g. reconnect `join_game`) that would overwrite `current_turn` after a `move_update`.
   */
  const lastAppliedMoveCountRef = useRef(0);

  const rollbackOptimistic = useCallback(() => {
    captureAnimTokenRef.current += 1;
    pendingCaptureValuesRef.current = null;
    const snap = optimisticSnapshotRef.current;
    if (!snap) return;
    setBoard(normalizeBoardState(snap.board));
    setCurrentTurn(snap.currentTurn);
    moveTimingStartRef.current = null;
    optimisticSnapshotRef.current = null;
    skipNextMoveSoundRef.current = false;
    lastMoveRef.current = null;
  }, []);

  const recordRotationLatencyFromMoveStart = useCallback(() => {
    if (moveTimingStartRef.current == null) return;
    const ms = performance.now() - moveTimingStartRef.current;
    moveTimingStartRef.current = null;
    setBoardRotationMs(
      Math.min(BOARD_ROTATION_MS_MAX, Math.max(BOARD_ROTATION_MS_MIN, ms)),
    );
  }, []);

  const setters = useMemo(
    () => ({
      setBoard,
      setCurrentTurn,
      setWinner,
      setStatus,
      setConfirmedTurnForFlip,
    }),
    [],
  );

  const addCapturesForMover = useCallback(
    (mover: 1 | 2, data: MoveResponse, boardBeforeMove: number[][]) => {
      const caps = data.captured ?? [];
      if (caps.length === 0) {
        pendingCaptureValuesRef.current = null;
        return;
      }
      const serverVals = data.captured_piece_values;
      const useServer =
        Array.isArray(serverVals) &&
        serverVals.length === caps.length &&
        serverVals.every((v) => typeof v === "number" && v > 0);
      const pending = pendingCaptureValuesRef.current;
      const values: number[] = [];
      for (let i = 0; i < caps.length; i++) {
        if (useServer) {
          values.push(serverVals[i] as number);
          continue;
        }
        const sq = caps[i];
        const r = Number(sq.row);
        const c = Number(sq.col);
        let v = boardBeforeMove[r]?.[c] ?? 0;
        if (v === 0 && pending && i < pending.length && pending[i] > 0) {
          v = pending[i];
        }
        if (v > 0) values.push(v);
      }
      pendingCaptureValuesRef.current = null;
      if (values.length === 0) return;
      if (mover === 1) {
        setP1CapturedPieces((prev) => [...prev, ...values]);
      } else {
        setP2CapturedPieces((prev) => [...prev, ...values]);
      }
    },
    [],
  );

  const hydrateFromGame = useCallback((data: GameDetail) => {
    if (!isAuthenticated) {
      clearResumeSnapshot();
    }
    const bs = data.board_state;
    setBoard(
      Array.isArray(bs) && bs.length === BOARD_SIZE
        ? normalizeBoardState(bs)
        : emptyBoard(),
    );
    const ct = sanitizeTurn(data.current_turn);
    setCurrentTurn(ct);
    setConfirmedTurnForFlip(ct);
    const st = data.status ?? "active";
    setStatus(st);
    setIsAiGame(Boolean(data.is_ai_game));
    setIsRanked(Boolean(data.is_ranked));
    setIsLocal2p(Boolean(data.is_local_2p));
    setUseClock(data.use_clock !== false);
    setPlayerOneProfile(parsePlayerRef(data.player_one));
    setPlayerTwoProfile(parsePlayerRef(data.player_two));
    setWinner(winnerSeatFromGameDetail(data));
    const moves = mapApiMovesToMoveRecords(data.moves);
    setMoveHistory(moves);
    lastMoveRef.current = null;
    setCanUndo(Boolean(data.can_undo));
    setHintDestination(null);
    setHintMessage(null);
    setLastBotMoveTo(computeOpponentLastMoveHighlight(data, moves, userId, username));

    const gid = String(data.id);
    const resume = loadResumeSnapshot();
    const active = st === "active";
    if (
      isAuthenticated &&
      active &&
      resume?.gameId === gid &&
      Array.isArray(resume.p1CapturedPieces) &&
      Array.isArray(resume.p2CapturedPieces)
    ) {
      setP1CapturedPieces(resume.p1CapturedPieces);
      setP2CapturedPieces(resume.p2CapturedPieces);
    } else {
      setP1CapturedPieces([]);
      setP2CapturedPieces([]);
    }
    if (!active && resume?.gameId === gid) {
      clearResumeSnapshot();
    }
    const clkHydrate = parseClockSnapshot(data as unknown);
    setServerClock(clkHydrate);
    const plyCount = Array.isArray(data.moves) ? data.moves.length : 0;
    lastAppliedMoveCountRef.current = plyCount;
  }, [isAuthenticated, userId, username]);

  /** Source of truth after any move: GET matches Django DB (board + turn). */
  const syncBoardAndTurnFromServer = useCallback(async (): Promise<GameDetail | null> => {
    if (!gameId) return null;
    try {
      const { data } = await gamesApi.get(gameId);
      const bs = data.board_state;
      if (Array.isArray(bs) && bs.length === BOARD_SIZE) {
        setBoard(normalizeBoardState(bs));
      }
      const ct = sanitizeTurn(data.current_turn);
      setCurrentTurn(ct);
      setConfirmedTurnForFlip(ct);
      setStatus(data.status ?? "active");
      setIsRanked(Boolean(data.is_ranked));
      setIsLocal2p(Boolean(data.is_local_2p));
      setUseClock(data.use_clock !== false);
      setPlayerOneProfile(parsePlayerRef(data.player_one));
      setPlayerTwoProfile(parsePlayerRef(data.player_two));
      if (typeof data.can_undo === "boolean") {
        setCanUndo(data.can_undo);
      }
      const moves = mapApiMovesToMoveRecords(data.moves);
      setMoveHistory(moves);
      setLastBotMoveTo(computeOpponentLastMoveHighlight(data, moves, userId, username));
      setWinner(winnerSeatFromGameDetail(data));
      const clkSync = parseClockSnapshot(data as unknown);
      setServerClock(clkSync);
      const plyCount = Array.isArray(data.moves) ? data.moves.length : 0;
      lastAppliedMoveCountRef.current = plyCount;
      return data;
    } catch (e: unknown) {
      logMove("sync GET failed", { detail: String(e) });
      return null;
    }
  }, [gameId, userId, username]);

  /** Human vs human over network (not AI, not same-device 2P). */
  const isOnlinePvp = useMemo(() => {
    if (isAiGame || isLocal2p) return false;
    return playerOneProfile != null && playerTwoProfile != null;
  }, [isAiGame, isLocal2p, playerOneProfile, playerTwoProfile]);

  /** Current user's seat — online PvP only; prefers profile id, falls back to username match. */
  const mySeat = useMemo((): 1 | 2 | null => {
    if (!isOnlinePvp) return null;
    if (userId != null) {
      if (playerOneProfile?.id === userId) return 1;
      if (playerTwoProfile?.id === userId) return 2;
    }
    if (username) {
      if (playerOneProfile?.username === username) return 1;
      if (playerTwoProfile?.username === username) return 2;
    }
    return null;
  }, [isOnlinePvp, userId, username, playerOneProfile, playerTwoProfile]);

  const { wsReady, sendMove, sendChat, sendResign } = useGameWebSocket({
    gameId,
    accessToken,
    enabled: USE_GAME_WS && Boolean(gameId),
    onMoveUpdate: (payload) => {
      const normalized = normalizeMoveResponse(payload);
      if (!normalized) {
        logMove("move_update dropped — could not normalize payload", {
          payload,
        });
        rollbackOptimistic();
        pendingWsMoveRef.current = false;
        skipNextMoveSoundRef.current = false;
        setBusy(false);
        setMoveError(
          "Could not apply the server update. Refresh the page if the board looks wrong.",
        );
        return;
      }
      const boardForCaptures =
        optimisticSnapshotRef.current?.board ?? boardRef.current;
      const wasOurPending = pendingWsMoveRef.current;
      optimisticSnapshotRef.current = null;
      const skipMoveSound = skipNextMoveSoundRef.current;
      skipNextMoveSoundRef.current = false;
      const mover = (normalized.current_turn === 1 ? 2 : 1) as 1 | 2;
      addCapturesForMover(mover, normalized, boardForCaptures);
      if (isAiGame && mover === 1) {
        setLastBotMoveTo(null);
      } else if (isAiGame && mover === 2) {
        const { to } = inferMoveEndpointsFromBoardDiff(
          boardForCaptures,
          normalized.board,
          2,
          normalized.captured,
        );
        if (to) setLastBotMoveTo(to);
      } else if (isLocal2p) {
        const { to } = inferMoveEndpointsFromBoardDiff(
          boardForCaptures,
          normalized.board,
          mover,
          normalized.captured,
        );
        if (to) setLastBotMoveTo(to);
      } else if (isOnlinePvp && mySeat != null) {
        if (mover === mySeat) {
          setLastBotMoveTo(null);
        } else {
          const { to } = inferMoveEndpointsFromBoardDiff(
            boardForCaptures,
            normalized.board,
            mover,
            normalized.captured,
          );
          if (to) setLastBotMoveTo(to);
        }
      }
      if (normalized.winner != null) {
        setLastBotMoveTo(null);
      }
      if (wasOurPending) {
        recordRotationLatencyFromMoveStart();
      }
      applyMovePayload(normalized, setters);
      if (normalized.move_count != null) {
        lastAppliedMoveCountRef.current = normalized.move_count;
      }
      setSelectedPiece(null);
      setPossibleMoves([]);
      if (wasOurPending && lastMoveRef.current) {
        const recorded = lastMoveRef.current;
        lastMoveRef.current = null;
        setMoveHistory((h) => [...h, recorded]);
      }
      if (!skipMoveSound) playMoveSound(soundEnabled);
      if (normalized.winner != null) {
        playGameOverSound(soundEnabled);
        setBusy(false);
      } else if (
        isAiGame &&
        normalized.current_turn === 2 &&
        normalized.status === "active"
      ) {
        setBusy(true);
      } else {
        setBusy(false);
      }
      pendingWsMoveRef.current = false;
      const rawPl = payload as { use_clock?: boolean };
      if (typeof rawPl.use_clock === "boolean") {
        setUseClock(rawPl.use_clock);
      }
      const clk = parseClockSnapshot(payload);
      setServerClock(clk);
      if (normalized.winner != null) {
        setEndedByResign(false);
      }
      const endReason = (payload as { end_reason?: string }).end_reason;
      if (endReason === "timeout") {
        setEndedByTimeout(true);
      }
    },
    onGameState: (p: WsGameStatePayload) => {
      if (Array.isArray(p.chat)) {
        setChatMessages(
          p.chat.map((c) => ({
            id: c.id,
            sender: c.sender,
            text: c.text,
            created_at: c.created_at,
          })),
        );
      }
      const mc = p.move_count;
      const last = lastAppliedMoveCountRef.current;
      const undo = p.undo_applied === true;
      if (
        typeof mc === "number" &&
        Number.isFinite(mc) &&
        !undo &&
        mc < last
      ) {
        logMove("game_state ignored (stale move_count)", { mc, last });
        return;
      }
      if (p.board && Array.isArray(p.board) && p.board.length === BOARD_SIZE) {
        setBoard(normalizeBoardState(p.board));
        const ct = sanitizeTurn(p.current_turn);
        setCurrentTurn(ct);
        setConfirmedTurnForFlip(ct);
        setStatus(p.status ?? "active");
        if (typeof p.winner === "number") setWinner(p.winner);
        else setWinner(null);
      }
      if (typeof mc === "number" && Number.isFinite(mc) && mc >= 0) {
        lastAppliedMoveCountRef.current = Math.floor(mc);
      }
      const rawP = p as { use_clock?: boolean };
      if (typeof rawP.use_clock === "boolean") {
        setUseClock(rawP.use_clock);
      }
      const clk = parseClockSnapshot(p as unknown);
      setServerClock(clk);
    },
    onGameOver: (p) => {
      if (p.reason === "resign") {
        setEndedByResign(true);
        setEndedByTimeout(false);
        setStatus("finished");
        if (typeof p.winner === "number") setWinner(p.winner);
        else setWinner(null);
        playGameOverSound(soundEnabled);
        setBusy(false);
      }
      void syncBoardAndTurnFromServer();
    },
    onChatMessage: (msg) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          sender: msg.sender,
          text: msg.text,
          created_at: msg.created_at,
        },
      ]);
    },
    onError: (detail) => {
      rollbackOptimistic();
      setMoveError(detail);
      setBusy(false);
      pendingWsMoveRef.current = false;
    },
  });

  const maybeAi = useCallback(
    async (gameAfterHuman?: GameDetail | null) => {
      if (!gameId) return;
      if (!isAiGame) return;
      if (USE_GAME_WS && wsReady) return;

      let g: GameDetail | null = gameAfterHuman ?? null;
      if (!g) {
        try {
          const { data } = await gamesApi.get(gameId);
          g = data;
        } catch {
          return;
        }
      }

      if (g.status !== "active") return;
      if (g.current_turn !== 2) return;

      setBusy(true);
      setMoveError(null);
      try {
        const { data } = await gamesApi.aiMove(gameId);
        const dRec =
          data && typeof data === "object"
            ? (data as unknown as Record<string, unknown>)
            : null;
        if (
          dRec?.end_reason === "timeout" ||
          dRec?.detail === "timeout"
        ) {
          setEndedByTimeout(true);
          setEndedByResign(false);
        }
        const clkAi = parseClockSnapshot(data);
        if (clkAi) setServerClock(clkAi);
        const aiNorm = normalizeMoveResponse(data);
        logMove("AI (server)", {
          currentTurn: data.current_turn,
          captures: data.captured?.length ?? 0,
          capturedSquares: data.captured,
          winner: data.winner,
          status: data.status,
        });
        let aiMultiCaptureAnimated = false;
        if (aiNorm) {
          const bBefore = boardRef.current;
          if (aiNorm.captured.length > 1 && !prefersReducedMotion()) {
            const { from, to } = inferMoveEndpointsFromBoardDiff(
              bBefore,
              aiNorm.board,
              2,
              aiNorm.captured,
            );
            if (from && to) {
              aiMultiCaptureAnimated = true;
              let stepBoard = normalizeBoardState(bBefore);
              const waypoints = computeCaptureJumpWaypoints(
                from,
                aiNorm.captured,
                to,
              );
              for (let i = 0; i < aiNorm.captured.length; i++) {
                stepBoard = applyOptimisticMove(
                  stepBoard,
                  waypoints[i],
                  waypoints[i + 1],
                  [aiNorm.captured[i]],
                );
                setBoard(stepBoard);
                playMoveSound(soundEnabled);
                if (i < aiNorm.captured.length - 1) {
                  await new Promise((r) =>
                    setTimeout(r, MULTI_CAPTURE_STEP_MS),
                  );
                }
              }
            }
          }
          addCapturesForMover(2, aiNorm, bBefore);
          const { to: aiTo } = inferMoveEndpointsFromBoardDiff(
            bBefore,
            aiNorm.board,
            2,
            aiNorm.captured,
          );
          if (aiTo) setLastBotMoveTo(aiTo);
          applyMovePayload(aiNorm, setters);
          if (aiNorm.winner != null) {
            setEndedByResign(false);
          }
        }
        await syncBoardAndTurnFromServer();
        if (!aiMultiCaptureAnimated) {
          playMoveSound(soundEnabled);
        }
        if (aiNorm?.winner != null) {
          playGameOverSound(soundEnabled);
        }
      } catch (e: unknown) {
        const err = e as { response?: { data?: { detail?: string } } };
        logMove("AI move failed", {
          detail: err.response?.data?.detail ?? String(e),
        });
        setMoveError(
          err.response?.data?.detail ?? "AI move failed. Try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [
      gameId,
      isAiGame,
      setters,
      soundEnabled,
      addCapturesForMover,
      syncBoardAndTurnFromServer,
      wsReady,
    ],
  );

  const flipBoard = useMemo(() => {
    if (isAiGame) return false;
    if (isLocal2p) {
      if (!rotateBoardForTurn) return false;
      return confirmedTurnForFlip === 2;
    }
    // Online PvP: each player sees their own pieces at the bottom.
    if (mySeat === 2) return true;
    return false;
  }, [isAiGame, isLocal2p, rotateBoardForTurn, confirmedTurnForFlip, mySeat]);

  /** Only the side whose turn it is may move — online: your seat only; AI: human (P1) on their turn. */
  const canInteract = useMemo(() => {
    if (status !== "active") return false;
    if (winner != null) return false;
    if (isOnlinePvp) {
      return mySeat != null && currentTurn === mySeat;
    }
    if (isAiGame) {
      return currentTurn === 1;
    }
    return true;
  }, [status, winner, isOnlinePvp, mySeat, currentTurn, isAiGame]);

  const attemptMove = useCallback(
    async (from: [number, number], to: [number, number]) => {
      if (!gameId || busy || winner != null || status !== "active") {
        if (gameId && (busy || winner != null || status !== "active")) {
          logMove("attempt skipped", { busy, winner, status });
        }
        return;
      }

      if (!canInteract) {
        playWarningSound(soundEnabled);
        setMoveError("Not your turn.");
        return;
      }

      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;
      const cell = board[fromRow]?.[fromCol] ?? 0;
      logMove("attempt", {
        from: [fromRow, fromCol],
        to: [toRow, toCol],
        piece: cell,
        currentTurn,
      });

      if (!isOwnPiece(cell, currentTurn)) {
        playWarningSound(soundEnabled);
        if (cell === 0) {
          setMoveError("Drag must start on your piece.");
        } else {
          setMoveError(
            `Player ${currentTurn}'s turn — can't move that piece.`,
          );
        }
        logMove("rejected — not your piece", { cell, currentTurn });
        return;
      }

      let moveOptions: LegalDestination[];
      if (
        selectedPiece?.[0] === fromRow &&
        selectedPiece?.[1] === fromCol &&
        possibleMoves.length > 0
      ) {
        moveOptions = possibleMoves;
        logMove("using cached legal moves", { count: moveOptions.length });
      } else {
        moveOptions = computeLegalDestinations(
          board,
          currentTurn as 1 | 2,
          fromRow,
          fromCol,
        );
        logMove("computed legal moves (client)", { count: moveOptions.length });
      }

      const chosen = moveOptions.find(
        (m) => m.toRow === toRow && m.toCol === toCol,
      );
      if (!chosen) {
        setMoveError("Illegal move");
        setSelectedPiece(null);
        setPossibleMoves([]);
        logMove("rejected — not in legal moves", {
          to: [toRow, toCol],
          legal: moveOptions,
        });
        return;
      }

      setLastBotMoveTo(null);

      pendingCaptureValuesRef.current =
        chosen.captured.length > 0
          ? chosen.captured.map(({ row, col }) => board[row]?.[col] ?? 0)
          : null;

      const mover = currentTurn as 1 | 2;
      lastMoveRef.current = {
        from: [fromRow, fromCol],
        to: [toRow, toCol],
        player: mover,
      };
      optimisticSnapshotRef.current = {
        board: normalizeBoardState(board),
        currentTurn,
      };

      const animateMultiCapture =
        chosen.captured.length > 1 && !prefersReducedMotion();

      if (animateMultiCapture) {
        const snapBoard = optimisticSnapshotRef.current.board;
        captureAnimTokenRef.current += 1;
        const token = captureAnimTokenRef.current;
        setBusy(true);
        setMoveError(null);
        setSelectedPiece(null);
        setPossibleMoves([]);

        void (async () => {
          let stepBoard = normalizeBoardState(snapBoard);
          const waypoints = computeCaptureJumpWaypoints(
            [fromRow, fromCol],
            chosen.captured,
            [toRow, toCol],
          );
          for (let i = 0; i < chosen.captured.length; i++) {
            if (token !== captureAnimTokenRef.current) return;
            const fromW = waypoints[i];
            const toW = waypoints[i + 1];
            stepBoard = applyOptimisticMove(stepBoard, fromW, toW, [
              chosen.captured[i],
            ]);
            setBoard(stepBoard);
            playMoveSound(soundEnabled);
            if (i < chosen.captured.length - 1) {
              await new Promise((r) => setTimeout(r, MULTI_CAPTURE_STEP_MS));
            }
          }
          if (token !== captureAnimTokenRef.current) return;

          setCurrentTurn(nextTurnAfter(mover));
          moveTimingStartRef.current = performance.now();

          if (USE_GAME_WS && wsReady) {
            skipNextMoveSoundRef.current = true;
            pendingWsMoveRef.current = true;
            sendMove({
              from_row: fromRow,
              from_col: fromCol,
              to_row: toRow,
              to_col: toCol,
            });
            logMove("sent via WebSocket (optimistic)", {
              from: [fromRow, fromCol],
              to: [toRow, toCol],
            });
            return;
          }

          try {
            const { data: raw } = await gamesApi.move(gameId, {
              from_row: fromRow,
              from_col: fromCol,
              to_row: toRow,
              to_col: toCol,
            });
            const boardForCaptures =
              optimisticSnapshotRef.current?.board ?? boardRef.current;
            optimisticSnapshotRef.current = null;
            const normalized = normalizeMoveResponse(raw);
            const rawRec =
              raw && typeof raw === "object"
                ? (raw as unknown as Record<string, unknown>)
                : null;
            if (
              rawRec?.end_reason === "timeout" ||
              rawRec?.detail === "timeout"
            ) {
              setEndedByTimeout(true);
              setEndedByResign(false);
            }
            const clkMove = parseClockSnapshot(raw);
            if (clkMove) setServerClock(clkMove);
            logMove("OK (human)", {
              player: mover,
              from: [fromRow, fromCol],
              to: [toRow, toCol],
              captures: normalized?.captured?.length ?? 0,
              capturedSquares: normalized?.captured,
              nextTurn: normalized?.current_turn,
              winner: normalized?.winner,
              status: normalized?.status,
              hadBoardInPayload: Boolean(normalized),
            });
            if (normalized) {
              addCapturesForMover(mover, normalized, boardForCaptures);
              recordRotationLatencyFromMoveStart();
              applyMovePayload(normalized, setters);
              if (normalized.winner != null) {
                setEndedByResign(false);
              }
              if (lastMoveRef.current) {
                const recorded = lastMoveRef.current;
                lastMoveRef.current = null;
                setMoveHistory((h) => [...h, recorded]);
              }
            } else {
              pendingCaptureValuesRef.current = null;
              logMove("move POST missing board; syncing from GET only", {
                keys:
                  raw && typeof raw === "object"
                    ? Object.keys(raw as object)
                    : [],
              });
              moveTimingStartRef.current = null;
            }
            const snapshot = await syncBoardAndTurnFromServer();
            setSelectedPiece(null);
            setPossibleMoves([]);
            if (normalized?.winner != null) {
              playGameOverSound(soundEnabled);
            } else {
              await maybeAi(snapshot);
            }
          } catch (e: unknown) {
            rollbackOptimistic();
            const err = e as { response?: { data?: { detail?: string } } };
            const detail =
              typeof err.response?.data?.detail === "string"
                ? err.response.data.detail
                : "Invalid move";
            logMove("API error", {
              detail,
              from: [fromRow, fromCol],
              to: [toRow, toCol],
            });
            setMoveError(detail);
            setSelectedPiece(null);
            setPossibleMoves([]);
          } finally {
            setBusy(false);
          }
        })();
        return;
      }

      const nextBoard = applyOptimisticMove(
        board,
        [fromRow, fromCol],
        [toRow, toCol],
        chosen.captured,
      );
      setBoard(nextBoard);
      setCurrentTurn(nextTurnAfter(mover));
      setSelectedPiece(null);
      setPossibleMoves([]);
      playMoveSound(soundEnabled);
      moveTimingStartRef.current = performance.now();

      if (USE_GAME_WS && wsReady) {
        skipNextMoveSoundRef.current = true;
        pendingWsMoveRef.current = true;
        setBusy(true);
        setMoveError(null);
        sendMove({
          from_row: fromRow,
          from_col: fromCol,
          to_row: toRow,
          to_col: toCol,
        });
        logMove("sent via WebSocket (optimistic)", {
          from: [fromRow, fromCol],
          to: [toRow, toCol],
        });
        return;
      }

      setBusy(true);
      setMoveError(null);
      try {
        const { data: raw } = await gamesApi.move(gameId, {
          from_row: fromRow,
          from_col: fromCol,
          to_row: toRow,
          to_col: toCol,
        });
        const boardForCaptures =
          optimisticSnapshotRef.current?.board ?? boardRef.current;
        optimisticSnapshotRef.current = null;
        const normalized = normalizeMoveResponse(raw);
        const rawRec2 =
          raw && typeof raw === "object"
            ? (raw as unknown as Record<string, unknown>)
            : null;
        if (
          rawRec2?.end_reason === "timeout" ||
          rawRec2?.detail === "timeout"
        ) {
          setEndedByTimeout(true);
          setEndedByResign(false);
        }
        const clkMove2 = parseClockSnapshot(raw);
        if (clkMove2) setServerClock(clkMove2);
        logMove("OK (human)", {
          player: mover,
          from: [fromRow, fromCol],
          to: [toRow, toCol],
          captures: normalized?.captured?.length ?? 0,
          capturedSquares: normalized?.captured,
          nextTurn: normalized?.current_turn,
          winner: normalized?.winner,
          status: normalized?.status,
          hadBoardInPayload: Boolean(normalized),
        });
        if (normalized) {
          addCapturesForMover(mover, normalized, boardForCaptures);
          recordRotationLatencyFromMoveStart();
          applyMovePayload(normalized, setters);
          if (normalized.winner != null) {
            setEndedByResign(false);
          }
          if (lastMoveRef.current) {
            const recorded = lastMoveRef.current;
            lastMoveRef.current = null;
            setMoveHistory((h) => [...h, recorded]);
          }
        } else {
          pendingCaptureValuesRef.current = null;
          logMove("move POST missing board; syncing from GET only", {
            keys: raw && typeof raw === "object" ? Object.keys(raw as object) : [],
          });
          moveTimingStartRef.current = null;
        }
        const snapshot = await syncBoardAndTurnFromServer();
        setSelectedPiece(null);
        setPossibleMoves([]);
        if (normalized?.winner != null) {
          playGameOverSound(soundEnabled);
        } else {
          await maybeAi(snapshot);
        }
      } catch (e: unknown) {
        rollbackOptimistic();
        const err = e as { response?: { data?: { detail?: string } } };
        const detail =
          typeof err.response?.data?.detail === "string"
            ? err.response.data.detail
            : "Invalid move";
        logMove("API error", { detail, from: [fromRow, fromCol], to: [toRow, toCol] });
        setMoveError(detail);
        setSelectedPiece(null);
        setPossibleMoves([]);
      } finally {
        setBusy(false);
      }
    },
    [
      gameId,
      busy,
      winner,
      status,
      board,
      currentTurn,
      selectedPiece,
      possibleMoves,
      setters,
      soundEnabled,
      maybeAi,
      addCapturesForMover,
      syncBoardAndTurnFromServer,
      wsReady,
      sendMove,
      rollbackOptimistic,
      recordRotationLatencyFromMoveStart,
      canInteract,
    ],
  );

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const { data } = await gamesApi.get(gameId);
        if (cancelled) return;
        hydrateFromGame(data);

        if (
          data.is_ai_game &&
          data.current_turn === 2 &&
          data.status === "active"
        ) {
          setBusy(true);
          try {
            const { data: aiData } = await gamesApi.aiMove(gameId);
            if (cancelled) return;
            const aiRec =
              aiData && typeof aiData === "object"
                ? (aiData as unknown as Record<string, unknown>)
                : null;
            if (
              aiRec?.end_reason === "timeout" ||
              aiRec?.detail === "timeout"
            ) {
              setEndedByTimeout(true);
              setEndedByResign(false);
            }
            const loadAiNorm = normalizeMoveResponse(aiData);
            logMove("AI (server, on load)", {
              currentTurn: aiData.current_turn,
              captures: aiData.captured?.length ?? 0,
              capturedSquares: aiData.captured,
              winner: aiData.winner,
            });
            if (loadAiNorm) {
              const bBeforeAi = boardRef.current;
              addCapturesForMover(2, loadAiNorm, bBeforeAi);
              const { to: loadAiTo } = inferMoveEndpointsFromBoardDiff(
                bBeforeAi,
                loadAiNorm.board,
                2,
                loadAiNorm.captured,
              );
              if (loadAiTo) setLastBotMoveTo(loadAiTo);
              applyMovePayload(loadAiNorm, setters);
              if (loadAiNorm.winner != null) {
                setEndedByResign(false);
              }
            }
            await syncBoardAndTurnFromServer();
            const snd = useGameSettingsStore.getState().soundEnabled;
            playMoveSound(snd);
            if (aiData.winner != null) {
              playGameOverSound(snd);
            }
          } catch (e: unknown) {
            if (!cancelled) {
              const err = e as { response?: { data?: { detail?: string } } };
              setMoveError(
                err.response?.data?.detail ?? "AI move failed after load.",
              );
            }
          } finally {
            if (!cancelled) setBusy(false);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load game. Is the backend running?");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, hydrateFromGame, setters, addCapturesForMover, syncBoardAndTurnFromServer]);

  const onSquareClick = useCallback(
    (row: number, col: number) => {
      if (!gameId || busy || winner != null || status !== "active") return;
      setHintDestination(null);

      if (!canInteract) {
        playWarningSound(soundEnabled);
        setMoveError("Not your turn.");
        setSelectedPiece(null);
        setPossibleMoves([]);
        return;
      }

      const cell = board[row]?.[col] ?? 0;
      const owner = getPieceOwner(cell);

      if (owner !== null) {
        if (owner !== currentTurn) {
          playWarningSound(soundEnabled);
          setMoveError(
            `Player ${currentTurn}'s turn — that's not your piece to move.`,
          );
          setSelectedPiece(null);
          setPossibleMoves([]);
          return;
        }
        setMoveError(null);
        setSelectedPiece([row, col]);
        setPossibleMoves(
          computeLegalDestinations(board, currentTurn as 1 | 2, row, col),
        );
        return;
      }

      if (
        selectedPiece &&
        possibleMoves.some((m) => m.toRow === row && m.toCol === col)
      ) {
        void attemptMove(selectedPiece, [row, col]);
        return;
      }

      setSelectedPiece(null);
      setPossibleMoves([]);
    },
    [
      gameId,
      busy,
      winner,
      status,
      board,
      currentTurn,
      selectedPiece,
      possibleMoves,
      attemptMove,
      soundEnabled,
      canInteract,
    ],
  );

  const resign = useCallback(async (): Promise<boolean> => {
    if (!gameId) return false;
    setBusy(true);
    try {
      if (USE_GAME_WS && wsReady) {
        setEndedByResign(true);
        setEndedByTimeout(false);
        sendResign();
        playGameOverSound(soundEnabled);
        setBusy(false);
        return true;
      }
      await gamesApi.resign(gameId);
      setEndedByResign(true);
      setEndedByTimeout(false);
      playGameOverSound(soundEnabled);
      await syncBoardAndTurnFromServer();
      setBusy(false);
      return true;
    } catch {
      setMoveError("Could not resign");
      setBusy(false);
      return false;
    }
  }, [gameId, soundEnabled, wsReady, sendResign, syncBoardAndTurnFromServer]);

  const sendChatMessage = useCallback(
    (text: string) => {
      const sender =
        isAuthenticated && username && username.trim().length > 0
          ? username.trim()
          : "Guest";
      sendChat(text, sender);
    },
    [sendChat, isAuthenticated, username],
  );

  useEffect(() => {
    setChatMessages([]);
  }, [gameId]);

  useEffect(() => {
    if (!hintMessage) {
      setHintDestination(null);
      return;
    }
    const t = window.setTimeout(() => {
      setHintMessage(null);
      setHintDestination(null);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [hintMessage]);

  /** Persist resume slot + capture tallies + board thumbnail (local only). */
  const resumeSaveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!gameId) return;
    if (
      winner != null ||
      status === "finished" ||
      status === "abandoned"
    ) {
      clearResumeSnapshot();
    }
  }, [gameId, winner, status]);

  useEffect(() => {
    if (!gameId || loading) return;
    if (!isAuthenticated) return;
    if (
      winner != null ||
      status !== "active"
    ) {
      return;
    }
    if (resumeSaveTimerRef.current != null) {
      window.clearTimeout(resumeSaveTimerRef.current);
    }
    resumeSaveTimerRef.current = window.setTimeout(() => {
      resumeSaveTimerRef.current = null;
      const thumb = boardStateToThumbnailDataUrl(board);
      saveResumeSnapshot({
        gameId,
        status,
        isAiGame,
        p1CapturedPieces,
        p2CapturedPieces,
        thumbnailDataUrl: thumb ?? undefined,
      });
    }, 450);
    return () => {
      if (resumeSaveTimerRef.current != null) {
        window.clearTimeout(resumeSaveTimerRef.current);
        resumeSaveTimerRef.current = null;
      }
    };
  }, [
    gameId,
    loading,
    isAuthenticated,
    board,
    status,
    winner,
    isAiGame,
    p1CapturedPieces,
    p2CapturedPieces,
  ]);

  const requestHint = useCallback(() => {
    if (busy || winner != null || status !== "active") return;
    if (!canInteract) return;
    const turn = currentTurn as 1 | 2;

    const pickRandom = (moves: LegalDestination[]) => {
      if (moves.length === 0) return null;
      const sorted = [...moves].sort(
        (a, b) => b.captured.length - a.captured.length,
      );
      const best = sorted[0].captured.length;
      const pool = sorted.filter((m) => m.captured.length === best);
      return pool[Math.floor(Math.random() * pool.length)] ?? null;
    };

    if (selectedPiece && possibleMoves.length > 0) {
      const pick = pickRandom(possibleMoves);
      if (!pick) return;
      setHintDestination([pick.toRow, pick.toCol]);
      setHintMessage(
        `Try landing on row ${pick.toRow + 1}, column ${pick.toCol + 1}${
          pick.captured.length > 0 ? " (capture)" : ""
        }.`,
      );
      return;
    }

    const candidates: [number, number][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = board[r]?.[c] ?? 0;
        if (!isOwnPiece(cell, currentTurn)) continue;
        candidates.push([r, c]);
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const [r, c] of candidates) {
      const moves = computeLegalDestinations(board, turn, r, c);
      const pick = pickRandom(moves);
      if (pick) {
        setHintDestination([pick.toRow, pick.toCol]);
        setHintMessage(
          `Select your piece at row ${r + 1}, column ${c + 1}, then move to row ${pick.toRow + 1}, column ${pick.toCol + 1}${
            pick.captured.length > 0 ? " (capture)" : ""
          }.`,
        );
        return;
      }
    }

    setHintDestination(null);
    setHintMessage("No legal moves available for you right now.");
  }, [
    busy,
    winner,
    status,
    board,
    currentTurn,
    selectedPiece,
    possibleMoves,
    canInteract,
  ]);

  const undoLastMove = useCallback(async () => {
    if (!gameId || !canUndo || busy || winner != null || status !== "active") {
      return;
    }
    setBusy(true);
    setMoveError(null);
    try {
      const { data: u } = await gamesApi.undo(gameId);
      setBoard(normalizeBoardState(u.board));
      const ct = sanitizeTurn(u.current_turn);
      setCurrentTurn(ct);
      setConfirmedTurnForFlip(ct);
      const w = u.winner;
      setWinner(
        w === 1 || w === 2 ? w : null,
      );
      setStatus(u.status ?? "active");
      setP1CapturedPieces([...(u.p1_captured_piece_values ?? [])]);
      setP2CapturedPieces([...(u.p2_captured_piece_values ?? [])]);
      setCanUndo(Boolean(u.can_undo));
      setMoveHistory((h) => {
        const next = h.slice(0, -1);
        setLastBotMoveTo(
          opponentLastMoveHighlightFromHistory(next, {
            status: u.status ?? "active",
            isAiGame,
            isLocal2p,
            mySeat,
          }),
        );
        return next;
      });
      setHintDestination(null);
      setHintMessage(null);
      setSelectedPiece(null);
      setPossibleMoves([]);
      playMoveSound(soundEnabled);
      const clkUndo = parseClockSnapshot(u);
      if (clkUndo) setServerClock(clkUndo);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setMoveError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Could not undo",
      );
    } finally {
      setBusy(false);
    }
  }, [
    gameId,
    canUndo,
    busy,
    winner,
    status,
    soundEnabled,
    isAiGame,
    isLocal2p,
    mySeat,
  ]);

  const downloadGameRecord = useCallback(() => {
    if (!gameId) return;
    const payload = {
      gameId,
      exportedAt: new Date().toISOString(),
      moves: moveHistory,
      outcome: { winner, status },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `draught-game-${String(gameId).slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [gameId, moveHistory, winner, status]);

  return {
    loading,
    loadError,
    board,
    currentTurn,
    winner,
    status,
    isAiGame,
    isRanked,
    isLocal2p,
    isOnlinePvp,
    mySeat,
    playerOneProfile,
    playerTwoProfile,
    serverClock,
    endedByResign,
    endedByTimeout,
    useClock,
    canInteract,
    selectedPiece,
    possibleMoves,
    busy,
    moveError,
    flipBoard,
    /** Duration (ms) for the next 180° spin — tied to last move API/WS latency. */
    boardRotationMs,
    /** @deprecated use p1CapturedPieces.length */
    p1PiecesTaken: p1CapturedPieces.length,
    /** @deprecated use p2CapturedPieces.length */
    p2PiecesTaken: p2CapturedPieces.length,
    p1CapturedPieces,
    p2CapturedPieces,
    moveHistory,
    hintMessage,
    hintDestination,
    /** AI: highlight square the bot moved to (cleared when you move). */
    lastBotMoveTo,
    canUndo,
    requestHint,
    undoLastMove,
    downloadGameRecord,
    onSquareClick,
    attemptMove,
    resign,
    setMoveError,
    chatMessages,
    sendChatMessage,
    wsConnected: wsReady,
    /**
     * Turn last confirmed by server (hydrate / move response / WS). Lags optimistic
     * `currentTurn` while a move is in flight — use for clocks so the active timer
     * switches only after the API/WebSocket resolves.
     */
    confirmedTurnForFlip,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  AI_MULTI_CAPTURE_STEP_MS,
  emptyBoard,
  normalizeBoardState,
} from "@/lib/boardUtils";
import { boardStateToThumbnailDataUrl } from "@/lib/boardThumbnail";
import {
  clearResumeSnapshot,
  loadResumeSnapshot,
  saveResumeSnapshot,
} from "@/lib/resumeGameStorage";
import { pickBotBanter } from "@/lib/botBanter";

/** Set `VITE_USE_GAME_WS=false` to force REST-only moves. */
const USE_GAME_WS = import.meta.env.VITE_USE_GAME_WS !== "false";

type MatchUiState = {
  active: boolean;
  p1Wins: number;
  p2Wins: number;
  targetWins: number;
  status: string;
  isRaw: boolean;
  finished: boolean;
  winnerSeat: 1 | 2 | null;
};

function matchFromNested(m: unknown): MatchUiState | null {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const o = m as Record<string, unknown>;
  const p1 = Number(o.p1_wins);
  const p2 = Number(o.p2_wins);
  const tw = Number(o.target_wins ?? 5);
  const st = String(o.status ?? "active");
  if (!Number.isFinite(p1) || !Number.isFinite(p2) || !Number.isFinite(tw)) {
    return null;
  }
  const finished = st === "finished";
  return {
    active: !finished,
    p1Wins: Math.max(0, Math.floor(p1)),
    p2Wins: Math.max(0, Math.floor(p2)),
    targetWins: Math.max(1, Math.floor(tw)),
    status: st,
    isRaw: Boolean(o.is_raw),
    finished,
    winnerSeat: null,
  };
}

function matchFromFlatWs(o: Record<string, unknown>): MatchUiState | null {
  if (o.match_mode !== true) return null;
  const p1 = Number(o.match_p1_wins);
  const p2 = Number(o.match_p2_wins);
  const tw = Number(o.match_target_wins ?? 5);
  const st = String(o.match_status ?? "active");
  if (!Number.isFinite(p1) || !Number.isFinite(p2)) return null;
  const finished = Boolean(o.match_finished) || st === "finished";
  const wss = o.match_winner_seat;
  return {
    active: !finished,
    p1Wins: Math.max(0, Math.floor(p1)),
    p2Wins: Math.max(0, Math.floor(p2)),
    targetWins: Number.isFinite(tw) ? Math.max(1, Math.floor(tw)) : 5,
    status: st,
    isRaw: Boolean(o.match_is_raw),
    finished,
    winnerSeat: wss === 1 || wss === 2 ? wss : null,
  };
}

function matchFromGameDetail(data: GameDetail): MatchUiState | null {
  return matchFromNested(data.match ?? null);
}

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

/** Dev-only error traces — never log board state, coordinates, or move payloads. */
function logDevError(context: string, err?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (err !== undefined) console.error("[Draught]", context, err);
  else console.error("[Draught]", context);
}

export function useGamePlay(
  gameId: string | undefined,
  options?: { chatPanelOpen?: boolean },
) {
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
  /** Server `ai_difficulty` (engine key) — for UI labels when bot roster id is unknown. */
  const [aiDifficulty, setAiDifficulty] = useState<string | undefined>(undefined);
  /** Vs-AI: short line shown beside bot avatar after the human plays (no loading copy). */
  const [aiBotSpeech, setAiBotSpeech] = useState<string | null>(null);
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
    setMatchState(null);
    setAiBotSpeech(null);
    appliedOptimisticAiBanterRef.current = false;
  }, [gameId]);
  useEffect(() => {
    lastAppliedMoveCountRef.current = 0;
  }, [gameId]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [matchState, setMatchState] = useState<MatchUiState | null>(null);
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
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatPeerTyping, setChatPeerTyping] = useState(false);
  const [chatPeerTypingName, setChatPeerTypingName] = useState<string | null>(
    null,
  );
  const peerTypingTimeoutRef = useRef<number | null>(null);
  const chatPanelOpenRef = useRef(false);
  useEffect(() => {
    chatPanelOpenRef.current = options?.chatPanelOpen ?? false;
    if (options?.chatPanelOpen) setChatUnreadCount(0);
  }, [options?.chatPanelOpen]);
  useEffect(() => {
    setChatUnreadCount(0);
  }, [gameId]);
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
  /** Vs-AI: banter already shown optimistically — skip second pick on WS/REST ack. */
  const appliedOptimisticAiBanterRef = useRef(false);

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
    appliedOptimisticAiBanterRef.current = false;
    setAiBotSpeech(null);
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
    setAiDifficulty(
      typeof data.ai_difficulty === "string" && data.ai_difficulty.trim() !== ""
        ? data.ai_difficulty.trim()
        : undefined,
    );
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
    setAiBotSpeech(null);
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
    setMatchState(matchFromGameDetail(data));
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
      setIsAiGame(Boolean(data.is_ai_game));
      setAiDifficulty(
        typeof data.ai_difficulty === "string" && data.ai_difficulty.trim() !== ""
          ? data.ai_difficulty.trim()
          : undefined,
      );
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
      setMatchState(matchFromGameDetail(data));
      return data;
    } catch (e: unknown) {
      logDevError(
        "sync GET failed",
        e instanceof Error ? e.message : String(e),
      );
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

  const myChatLabel = useMemo(
    () =>
      isAuthenticated && username && username.trim().length > 0
        ? username.trim()
        : "Guest",
    [isAuthenticated, username],
  );

  const queueAiBanterAfterHumanMove = useCallback(
    (normalized: MoveResponse) => {
      if (!isAiGame) return;
      if (normalized.winner != null || normalized.status !== "active") return;
      if (normalized.current_turn !== 2) return;
      if (appliedOptimisticAiBanterRef.current) {
        appliedOptimisticAiBanterRef.current = false;
        return;
      }
      const mc = normalized.move_count ?? 1;
      setAiBotSpeech(
        pickBotBanter({
          captureCount: normalized.captured.length,
          moveCountAfterHuman: mc,
          engineKey: aiDifficulty ?? "medium",
        }),
      );
    },
    [isAiGame, aiDifficulty],
  );

  /** Fire as soon as the human’s move is applied locally (before server / bot). */
  const applyOptimisticAiBanterForHumanMove = useCallback(
    (captureCount: number, moveCountAfterHuman: number) => {
      if (!isAiGame || status !== "active") return;
      setAiBotSpeech(
        pickBotBanter({
          captureCount,
          moveCountAfterHuman,
          engineKey: aiDifficulty ?? "medium",
        }),
      );
      appliedOptimisticAiBanterRef.current = true;
    },
    [isAiGame, status, aiDifficulty],
  );

  const { wsReady, sendMove, sendChat, sendChatTyping, sendResign } =
    useGameWebSocket({
    gameId,
    accessToken,
    enabled: USE_GAME_WS && Boolean(gameId),
    onMoveUpdate: (payload) => {
      const normalized = normalizeMoveResponse(payload);
      if (!normalized) {
        logDevError("move_update: normalize failed");
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
      const rawMove = payload as Record<string, unknown>;
      const flatMatch = matchFromFlatWs(rawMove);
      if (flatMatch) {
        setMatchState(flatMatch);
      }
      const miniEnded = rawMove.mini_game_ended === true;
      const matchFinished = rawMove.match_finished === true;
      const resetMini =
        miniEnded &&
        !matchFinished &&
        String(normalized.status ?? "") === "active";
      if (normalized.move_count != null) {
        lastAppliedMoveCountRef.current = normalized.move_count;
      }
      setSelectedPiece(null);
      setPossibleMoves([]);
      if (wasOurPending && lastMoveRef.current && !resetMini) {
        const recorded = lastMoveRef.current;
        lastMoveRef.current = null;
        setMoveHistory((h) => [...h, recorded]);
      }
      if (resetMini) {
        setMoveHistory([]);
        setP1CapturedPieces([]);
        setP2CapturedPieces([]);
        lastMoveRef.current = null;
        setAiBotSpeech(null);
      }
      if (!skipMoveSound) playMoveSound(soundEnabled);
      const playEndSound =
        (normalized.winner != null &&
          String(normalized.status ?? "") === "finished") ||
        matchFinished;
      if (playEndSound) {
        playGameOverSound(soundEnabled);
        setBusy(false);
        setAiBotSpeech(null);
      } else {
        setBusy(false);
        if (
          normalized.winner != null ||
          String(normalized.status ?? "") !== "active" ||
          matchFinished
        ) {
          setAiBotSpeech(null);
        } else if (
          isAiGame &&
          mover === 1 &&
          normalized.current_turn === 2
        ) {
          /* Replace banter only when the human’s move is confirmed — keep showing through bot reply. */
          queueAiBanterAfterHumanMove(normalized);
        }
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
        setChatUnreadCount(0);
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
      const rawAi = p as { ai_difficulty?: string; is_ai_game?: boolean };
      if (typeof rawAi.is_ai_game === "boolean") {
        setIsAiGame(rawAi.is_ai_game);
      }
      if (
        typeof rawAi.ai_difficulty === "string" &&
        rawAi.ai_difficulty.trim() !== ""
      ) {
        setAiDifficulty(rawAi.ai_difficulty.trim());
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
      const rawGs = p as Record<string, unknown>;
      const mNested = matchFromNested(rawGs.match);
      if (mNested) setMatchState(mNested);
    },
    onGameOver: (p) => {
      if (p.reason === "resign") {
        setEndedByResign(true);
        setEndedByTimeout(false);
      }
      const rawGo = p as Record<string, unknown>;
      const fmGo = matchFromFlatWs(rawGo);
      if (fmGo) setMatchState(fmGo);
      void syncBoardAndTurnFromServer().then((data) => {
        if (
          data &&
          (data.status === "finished" || data.status === "abandoned")
        ) {
          playGameOverSound(soundEnabled);
        }
        setBusy(false);
      });
    },
    onChatMessage: (msg) => {
      if (peerTypingTimeoutRef.current != null) {
        window.clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }

      const ext = msg as WsChatMessage & {
        type?: string;
        client_nonce?: string;
      };
      const nonce =
        typeof ext.client_nonce === "string" && ext.client_nonce.length > 0
          ? ext.client_nonce
          : null;

      flushSync(() => {
        setChatPeerTyping(false);
        setChatPeerTypingName(null);
        setChatMessages((prev) => {
          if (nonce) {
            const localId = `local-${nonce}`;
            const without = prev.filter((m) => m.id !== localId);
            if (without.some((m) => m.id === ext.id)) return without;
            return [
              ...without,
              {
                id: ext.id,
                sender: ext.sender,
                text: ext.text,
                created_at: ext.created_at,
              },
            ];
          }
          if (prev.some((m) => m.id === ext.id)) return prev;
          return [
            ...prev,
            {
              id: ext.id,
              sender: ext.sender,
              text: ext.text,
              created_at: ext.created_at,
            },
          ];
        });
      });

      if (chatPanelOpenRef.current) return;
      const me = username?.trim().toLowerCase();
      const sender = (msg.sender ?? "").trim().toLowerCase();
      if (me && sender && sender !== me) {
        setChatUnreadCount((c) => c + 1);
      }
    },
    onChatTyping: (payload) => {
      const peer = (payload.sender ?? "").trim();
      if (!peer) return;
      if (peer.toLowerCase() === myChatLabel.toLowerCase()) return;
      if (peerTypingTimeoutRef.current != null) {
        window.clearTimeout(peerTypingTimeoutRef.current);
        peerTypingTimeoutRef.current = null;
      }
      if (!payload.active) {
        setChatPeerTyping(false);
        setChatPeerTypingName(null);
        return;
      }
      setChatPeerTyping(true);
      setChatPeerTypingName(peer);
      peerTypingTimeoutRef.current = window.setTimeout(() => {
        peerTypingTimeoutRef.current = null;
        setChatPeerTyping(false);
        setChatPeerTypingName(null);
      }, 3200);
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
                    setTimeout(r, AI_MULTI_CAPTURE_STEP_MS),
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
        logDevError(
          "AI move failed",
          err.response?.data?.detail ?? (e instanceof Error ? e.message : e),
        );
        setMoveError(
          err.response?.data?.detail ?? "AI move failed. Try again.",
        );
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
      return false;
    }
    // Online PvP: each player sees their own pieces at the bottom.
    if (mySeat === 2) return true;
    return false;
  }, [isAiGame, isLocal2p, mySeat]);

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

      if (!isOwnPiece(cell, currentTurn)) {
        playWarningSound(soundEnabled);
        if (cell === 0) {
          setMoveError("Drag must start on your piece.");
        } else {
          setMoveError(
            `Player ${currentTurn}'s turn — can't move that piece.`,
          );
        }
        return;
      }

      let moveOptions: LegalDestination[];
      if (
        selectedPiece?.[0] === fromRow &&
        selectedPiece?.[1] === fromCol &&
        possibleMoves.length > 0
      ) {
        moveOptions = possibleMoves;
      } else {
        moveOptions = computeLegalDestinations(
          board,
          currentTurn as 1 | 2,
          fromRow,
          fromCol,
        );
      }

      const chosen = moveOptions.find(
        (m) => m.toRow === toRow && m.toCol === toCol,
      );
      if (!chosen) {
        setMoveError("Illegal move");
        setSelectedPiece(null);
        setPossibleMoves([]);
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
          applyOptimisticAiBanterForHumanMove(
            chosen.captured.length,
            moveHistory.length + 1,
          );

          if (USE_GAME_WS && wsReady) {
            skipNextMoveSoundRef.current = true;
            pendingWsMoveRef.current = true;
            sendMove({
              from_row: fromRow,
              from_col: fromCol,
              to_row: toRow,
              to_col: toCol,
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
              logDevError("move POST: response missing normalized board");
              moveTimingStartRef.current = null;
            }
            const snapshot = await syncBoardAndTurnFromServer();
            setSelectedPiece(null);
            setPossibleMoves([]);
            if (
              normalized?.winner != null ||
              rawRec?.match_finished === true
            ) {
              playGameOverSound(soundEnabled);
            } else {
              setBusy(false);
              if (normalized) queueAiBanterAfterHumanMove(normalized);
              await maybeAi(snapshot);
            }
          } catch (e: unknown) {
            rollbackOptimistic();
            const err = e as { response?: { data?: { detail?: string } } };
            const detail =
              typeof err.response?.data?.detail === "string"
                ? err.response.data.detail
                : "Invalid move";
            logDevError("move API error", detail);
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
      applyOptimisticAiBanterForHumanMove(
        chosen.captured.length,
        moveHistory.length + 1,
      );

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
          logDevError("move POST: response missing normalized board");
          moveTimingStartRef.current = null;
        }
        const snapshot = await syncBoardAndTurnFromServer();
        setSelectedPiece(null);
        setPossibleMoves([]);
        if (
          normalized?.winner != null ||
          rawRec2?.match_finished === true
        ) {
          playGameOverSound(soundEnabled);
        } else {
          setBusy(false);
          if (normalized) queueAiBanterAfterHumanMove(normalized);
          await maybeAi(snapshot);
        }
      } catch (e: unknown) {
        rollbackOptimistic();
        const err = e as { response?: { data?: { detail?: string } } };
        const detail =
          typeof err.response?.data?.detail === "string"
            ? err.response.data.detail
            : "Invalid move";
        logDevError("move API error", detail);
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
      queueAiBanterAfterHumanMove,
      applyOptimisticAiBanterForHumanMove,
      moveHistory,
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
              logDevError(
                "AI move after load failed",
                err.response?.data?.detail ??
                  (e instanceof Error ? e.message : e),
              );
              setMoveError(
                err.response?.data?.detail ?? "AI move failed after load.",
              );
            }
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
      const t = text.trim();
      if (!t) return;
      const sender =
        isAuthenticated && username && username.trim().length > 0
          ? username.trim()
          : "Guest";
      const nonce =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const localId = `local-${nonce}`;
      if (USE_GAME_WS && wsReady) {
        flushSync(() => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: localId,
              sender,
              text: t,
              created_at: new Date().toISOString(),
            },
          ]);
        });
      }
      sendChat(t, sender, nonce);
    },
    [sendChat, isAuthenticated, username, wsReady],
  );

  const sendChatTypingActivity = useCallback(
    (active: boolean) => {
      if (!USE_GAME_WS || !wsReady) return;
      sendChatTyping(active, myChatLabel);
    },
    [wsReady, sendChatTyping, myChatLabel],
  );

  useEffect(() => {
    setChatMessages([]);
    setChatPeerTyping(false);
    setChatPeerTypingName(null);
    if (peerTypingTimeoutRef.current != null) {
      window.clearTimeout(peerTypingTimeoutRef.current);
      peerTypingTimeoutRef.current = null;
    }
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
      setAiBotSpeech(null);
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

  const matchSummary = useMemo(() => {
    if (!matchState) return null;
    return `Match ${matchState.p1Wins}–${matchState.p2Wins} · First to ${matchState.targetWins}`;
  }, [matchState]);

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
    aiDifficulty,
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
    aiBotSpeech,
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
    sendChatTypingActivity,
    chatPeerTyping,
    chatPeerTypingName,
    chatUnreadCount,
    wsConnected: wsReady,
    /**
     * Turn last confirmed by server (hydrate / move response / WS). Lags optimistic
     * `currentTurn` while a move is in flight — use for clocks so the active timer
     * switches only after the API/WebSocket resolves.
     */
    confirmedTurnForFlip,
    matchSummary,
    matchIsRaw: Boolean(matchState?.isRaw && matchState?.finished),
  };
}

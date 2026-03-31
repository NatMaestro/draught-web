import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Board } from "@/components/game/Board";
import {
  OfflineBoardIntermissionModal,
  OfflineMatchStatsModal,
} from "@/components/game/OfflineMatchModals";
import { PlayerStatsStrip } from "@/components/game/PlayerStatsStrip";
import { GamePlayRightPanel } from "@/components/game/GamePlayRightPanel";
import { GamePlaySidebar } from "@/components/game/GamePlaySidebar";
import { GamePlayErrorBoundary } from "@/components/game/GamePlayErrorBoundary";
import {
  RulesHeaderIconButton,
  RulesHelpModal,
} from "@/components/game/RulesPanel";
import { ResignConfirmModal } from "@/components/game/ResignConfirmModal";
import { useGameSettingsStore } from "@/store/gameSettingsStore";
import {
  createInitialBoard,
  DEFAULT_BOARD_ROTATION_MS,
  MULTI_CAPTURE_STEP_MS,
  normalizeBoardState,
} from "@/lib/boardUtils";
import { computeLegalDestinations } from "@/lib/clientLegalMoves";
import type { LegalDestination } from "@/lib/optimisticBoard";
import {
  applyOptimisticMove,
  computeCaptureJumpWaypoints,
  nextTurnAfter,
} from "@/lib/optimisticBoard";
import {
  normalizeOfflineAiDifficulty,
  pickOfflineAiMove,
} from "@/lib/offlineAi";
import { getWinnerIfAny, tryApplyLocalMove } from "@/lib/offlineEngine";
import type { OfflineMatchSetup, OfflineMiniResult } from "@/lib/offlineMatchTypes";
import {
  playGameOverSound,
  playMoveSound,
  playWarningSound,
} from "@/lib/gameSounds";
import type { MoveRecord } from "@/hooks/useGamePlay";
import { findBotById } from "@/data/aiBots";
import { pickBotBanter } from "@/lib/botBanter";

const SETUP_STORAGE_KEY = "draughtOfflineSetup";

/** Hide offline bot banter after this long if the player hasn’t moved again (new banter resets the timer). */
const OFFLINE_BANTER_AUTO_DISMISS_MS = 5000;

function pieceOwner(cell: number): 1 | 2 | null {
  if (cell === 1 || cell === 3) return 1;
  if (cell === 2 || cell === 4) return 2;
  return null;
}

function cloneBoard(b: number[][]) {
  return normalizeBoardState(b);
}

type Snap = {
  board: number[][];
  currentTurn: 1 | 2;
  confirmedTurnForFlip: 1 | 2;
  p1Captured: number[];
  p2Captured: number[];
  moveHistory: MoveRecord[];
  winner: 1 | 2 | null;
  status: "active" | "finished";
  lastMoveTo: [number, number] | null;
};

type BoardPause = {
  boardWinner: 1 | 2;
  plyCount: number;
};

function sanitizeOfflineSetup(s: OfflineMatchSetup): OfflineMatchSetup {
  if (
    s.offlineBotId != null &&
    typeof s.offlineBotId === "string" &&
    !findBotById(s.offlineBotId)
  ) {
    const { offlineBotId: _invalid, ...rest } = s;
    return rest;
  }
  return s;
}

function readSetup(state: unknown): OfflineMatchSetup | null {
  if (
    state &&
    typeof state === "object" &&
    "p1Name" in state &&
    "p2Name" in state
  ) {
    const s = state as OfflineMatchSetup;
    if (
      typeof s.p1Name === "string" &&
      typeof s.p2Name === "string" &&
      typeof s.matchTargetWins === "number"
    ) {
      return sanitizeOfflineSetup(s);
    }
  }
  try {
    const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as OfflineMatchSetup;
    if (
      typeof s.p1Name === "string" &&
      typeof s.p2Name === "string" &&
      typeof s.matchTargetWins === "number"
    ) {
      return sanitizeOfflineSetup(s);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function OfflineGamePlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setup = useMemo(
    () => readSetup(location.state),
    [location.state],
  );

  const soundEnabled = useGameSettingsStore((s) => s.soundEnabled);
  const showLegalMoveHighlights = useGameSettingsStore(
    (s) => s.showLegalMoveHighlights,
  );
  const setSoundEnabled = useGameSettingsStore((s) => s.setSoundEnabled);
  const setShowLegalMoveHighlights = useGameSettingsStore(
    (s) => s.setShowLegalMoveHighlights,
  );

  const matchTargetWins = Math.max(
    1,
    Math.min(20, setup?.matchTargetWins ?? 5),
  );
  const aiMode = setup?.aiMode ?? false;
  const offlineBotDef = useMemo(() => {
    const id = setup?.offlineBotId;
    if (!id?.trim()) return undefined;
    return findBotById(id);
  }, [setup?.offlineBotId]);

  const aiDifficulty = useMemo(() => {
    if (!setup?.aiMode) return "medium" as const;
    if (offlineBotDef) {
      return normalizeOfflineAiDifficulty(offlineBotDef.engineKey);
    }
    return normalizeOfflineAiDifficulty(setup.aiDifficulty);
  }, [offlineBotDef, setup?.aiDifficulty, setup?.aiMode]);

  const rosterEngineKeyForAi = offlineBotDef?.engineKey;

  const p1Display = setup?.p1Name ?? "Player 1";
  const p2Display =
    setup == null
      ? "Player 2"
      : aiMode
        ? offlineBotDef
          ? `${setup.p2Name} · ${offlineBotDef.name}`
          : `${setup.p2Name} (${aiDifficulty})`
        : setup.p2Name;

  const offlineAiPersona = useMemo(() => {
    if (!aiMode) return null;
    return {
      name: offlineBotDef?.name ?? "Computer",
      emoji: offlineBotDef?.emoji ?? "🤖",
      seed: setup?.offlineBotId ?? aiDifficulty,
    };
  }, [aiDifficulty, aiMode, offlineBotDef, setup?.offlineBotId]);

  const [board, setBoard] = useState(() => createInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [confirmedTurnForFlip, setConfirmedTurnForFlip] = useState<1 | 2>(1);
  const [p1CapturedPieces, setP1CapturedPieces] = useState<number[]>([]);
  const [p2CapturedPieces, setP2CapturedPieces] = useState<number[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [status, setStatus] = useState<"active" | "finished">("active");
  const [lastMoveTo, setLastMoveTo] = useState<[number, number] | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(
    null,
  );
  const [possibleMoves, setPossibleMoves] = useState<
    ReturnType<typeof computeLegalDestinations>
  >([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [hintMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [offlineAiSpeech, setOfflineAiSpeech] = useState<string | null>(null);

  const [matchP1Wins, setMatchP1Wins] = useState(0);
  const [matchP2Wins, setMatchP2Wins] = useState(0);
  const [miniResults, setMiniResults] = useState<OfflineMiniResult[]>([]);
  const [boardPause, setBoardPause] = useState<BoardPause | null>(null);
  const [matchEndOpen, setMatchEndOpen] = useState(false);
  const [matchChampion, setMatchChampion] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (!aiMode || !offlineAiSpeech?.trim()) {
      return;
    }
    const id = window.setTimeout(() => {
      setOfflineAiSpeech(null);
    }, OFFLINE_BANTER_AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [aiMode, offlineAiSpeech]);

  const matchSnapRef = useRef({ p1: 0, p2: 0 });
  useEffect(() => {
    matchSnapRef.current = { p1: matchP1Wins, p2: matchP2Wins };
  }, [matchP1Wins, matchP2Wins]);

  const undoStackRef = useRef<Snap[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);
  const captureAnimTokenRef = useRef(0);
  const aiRunGenerationRef = useRef(0);

  const gameOver = winner != null || status === "finished";
  const flipBoard = false;

  const queueOfflineBanter = useCallback(
    (captureCount: number, moveCountAfterHuman: number) => {
      if (!aiMode) return;
      if (boardPause != null || matchEndOpen) return;
      const engineKey = rosterEngineKeyForAi ?? aiDifficulty;
      setOfflineAiSpeech(
        pickBotBanter({
          captureCount,
          moveCountAfterHuman,
          engineKey,
        }),
      );
    },
    [
      aiDifficulty,
      aiMode,
      boardPause,
      matchEndOpen,
      rosterEngineKeyForAi,
    ],
  );

  const pushUndo = useCallback(() => {
    undoStackRef.current.push({
      board: cloneBoard(board),
      currentTurn,
      confirmedTurnForFlip,
      p1Captured: [...p1CapturedPieces],
      p2Captured: [...p2CapturedPieces],
      moveHistory: [...moveHistory],
      winner,
      status,
      lastMoveTo: lastMoveTo ? ([...lastMoveTo] as [number, number]) : null,
    });
    setUndoDepth((d) => d + 1);
  }, [
    board,
    currentTurn,
    confirmedTurnForFlip,
    p1CapturedPieces,
    p2CapturedPieces,
    moveHistory,
    winner,
    status,
    lastMoveTo,
  ]);

  const applySnapshot = useCallback((s: Snap) => {
    setBoard(cloneBoard(s.board));
    setCurrentTurn(s.currentTurn);
    setConfirmedTurnForFlip(s.confirmedTurnForFlip);
    setP1CapturedPieces(s.p1Captured);
    setP2CapturedPieces(s.p2Captured);
    setMoveHistory(s.moveHistory);
    setWinner(s.winner);
    setStatus(s.status);
    setLastMoveTo(s.lastMoveTo);
    setSelectedPiece(null);
    setPossibleMoves([]);
    setMoveError(null);
    setOfflineAiSpeech(null);
  }, []);

  const resetMiniGame = useCallback(() => {
    captureAnimTokenRef.current += 1;
    aiRunGenerationRef.current += 1;
    undoStackRef.current = [];
    setUndoDepth(0);
    setBoard(createInitialBoard());
    setCurrentTurn(1);
    setConfirmedTurnForFlip(1);
    setP1CapturedPieces([]);
    setP2CapturedPieces([]);
    setMoveHistory([]);
    setWinner(null);
    setStatus("active");
    setLastMoveTo(null);
    setSelectedPiece(null);
    setPossibleMoves([]);
    setMoveError(null);
    setOfflineAiSpeech(null);
  }, []);

  const handleBoardSeriesEnd = useCallback(
    (w: 1 | 2, plyCount: number) => {
      const { p1, p2 } = matchSnapRef.current;
      const np1 = p1 + (w === 1 ? 1 : 0);
      const np2 = p2 + (w === 2 ? 1 : 0);
      const ends = np1 >= matchTargetWins || np2 >= matchTargetWins;

      setOfflineAiSpeech(null);
      setWinner(w);
      setStatus("finished");
      playGameOverSound(soundEnabled);
      setSelectedPiece(null);
      setPossibleMoves([]);

      if (ends) {
        setMatchP1Wins(np1);
        setMatchP2Wins(np2);
        matchSnapRef.current = { p1: np1, p2: np2 };
        setMiniResults((r) => [...r, { winner: w, plyCount }]);
        setMatchChampion(np1 >= matchTargetWins ? 1 : 2);
        setMatchEndOpen(true);
      } else {
        setBoardPause({ boardWinner: w, plyCount });
      }
    },
    [matchTargetWins, soundEnabled],
  );

  /** Forfeit the whole first-to-N match (current board goes to opponent; series ends). */
  const handleMatchForfeit = useCallback(() => {
    captureAnimTokenRef.current += 1;
    aiRunGenerationRef.current += 1;
    const opp = currentTurn === 1 ? 2 : 1;
    const { p1, p2 } = matchSnapRef.current;
    const np1 = p1 + (opp === 1 ? 1 : 0);
    const np2 = p2 + (opp === 2 ? 1 : 0);
    const plyCount = moveHistory.length;

    setWinner(opp);
    setStatus("finished");
    playGameOverSound(soundEnabled);
    setSelectedPiece(null);
    setPossibleMoves([]);
    setBusy(false);
    setBoardPause(null);

    setMatchP1Wins(np1);
    setMatchP2Wins(np2);
    matchSnapRef.current = { p1: np1, p2: np2 };
    setMiniResults((r) => [...r, { winner: opp, plyCount }]);
    setMatchChampion(opp);
    setMatchEndOpen(true);

    undoStackRef.current = [];
    setUndoDepth(0);
    setOfflineAiSpeech(null);
  }, [currentTurn, moveHistory.length, soundEnabled]);

  const finishPlies = useCallback(
    (
      nextBoard: number[][],
      mover: 1 | 2,
      from: [number, number],
      to: [number, number],
      capturedVals: number[],
      opts?: { skipMoveSound?: boolean },
    ) => {
      const nextSeat = nextTurnAfter(mover);
      const plyCountAfter = moveHistory.length + 1;
      setBoard(nextBoard);
      setCurrentTurn(nextSeat);
      setConfirmedTurnForFlip(nextSeat);
      setLastMoveTo(to);
      setMoveHistory((h) => [...h, { from, to, player: mover }]);
      if (capturedVals.length > 0) {
        if (mover === 1) {
          setP1CapturedPieces((p) => [...p, ...capturedVals]);
        } else {
          setP2CapturedPieces((p) => [...p, ...capturedVals]);
        }
      }
      const w = getWinnerIfAny(nextBoard, nextSeat);
      if (mover === 1 && aiMode && w == null) {
        queueOfflineBanter(capturedVals.length, plyCountAfter);
      }
      if (w != null) {
        handleBoardSeriesEnd(w, plyCountAfter);
      } else if (!opts?.skipMoveSound) {
        playMoveSound(soundEnabled);
      }
      setSelectedPiece(null);
      setPossibleMoves([]);
    },
    [
      aiMode,
      handleBoardSeriesEnd,
      moveHistory.length,
      queueOfflineBanter,
      soundEnabled,
    ],
  );

  const applyChosenMove = useCallback(
    async (
      boardBefore: number[][],
      mover: 1 | 2,
      from: [number, number],
      to: [number, number],
      chosen: LegalDestination,
    ): Promise<boolean> => {
      const animateMulti =
        chosen.captured.length > 1 && !prefersReducedMotion();

      if (animateMulti) {
        captureAnimTokenRef.current += 1;
        const token = captureAnimTokenRef.current;
        setMoveError(null);
        setSelectedPiece(null);
        setPossibleMoves([]);

        const waypoints = computeCaptureJumpWaypoints(
          from,
          chosen.captured,
          to,
        );
        let stepBoard = cloneBoard(boardBefore);
        for (let i = 0; i < chosen.captured.length; i++) {
          if (token !== captureAnimTokenRef.current) {
            const snap = undoStackRef.current.pop();
            if (snap) applySnapshot(snap);
            setUndoDepth((d) => Math.max(0, d - 1));
            return false;
          }
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
        if (token !== captureAnimTokenRef.current) {
          const snap = undoStackRef.current.pop();
          if (snap) applySnapshot(snap);
          setUndoDepth((d) => Math.max(0, d - 1));
          return false;
        }

        const flat = tryApplyLocalMove(boardBefore, mover, from, to);
        if (!flat) {
          undoStackRef.current.pop();
          setUndoDepth((d) => Math.max(0, d - 1));
          setMoveError("Could not apply move.");
          return false;
        }
        finishPlies(
          flat.board,
          mover,
          from,
          to,
          flat.capturedPieceValues,
          { skipMoveSound: true },
        );
        return true;
      }

      const flat = tryApplyLocalMove(boardBefore, mover, from, to);
      if (!flat) {
        undoStackRef.current.pop();
        setUndoDepth((d) => Math.max(0, d - 1));
        playWarningSound(soundEnabled);
        setMoveError("Illegal move.");
        return false;
      }
      finishPlies(
        flat.board,
        mover,
        from,
        to,
        flat.capturedPieceValues,
      );
      return true;
    },
    [applySnapshot, finishPlies, soundEnabled],
  );

  const attemptMove = useCallback(
    async (from: [number, number], to: [number, number]) => {
      if (busy || gameOver || status !== "active" || boardPause || matchEndOpen) {
        return;
      }
      if (aiMode && currentTurn === 2) return;
      const mover = currentTurn;
      const boardBefore = board;

      const dests = computeLegalDestinations(
        board,
        mover,
        from[0],
        from[1],
      );
      const chosen = dests.find((d) => d.toRow === to[0] && d.toCol === to[1]);
      if (!chosen) {
        playWarningSound(soundEnabled);
        setMoveError("Illegal move.");
        return;
      }

      pushUndo();

      const animateMulti =
        chosen.captured.length > 1 && !prefersReducedMotion();
      if (animateMulti) setBusy(true);
      try {
        await applyChosenMove(boardBefore, mover, from, to, chosen);
      } finally {
        if (animateMulti) setBusy(false);
      }
    },
    [
      aiMode,
      applyChosenMove,
      board,
      boardPause,
      busy,
      currentTurn,
      gameOver,
      matchEndOpen,
      pushUndo,
      soundEnabled,
      status,
    ],
  );

  useEffect(() => {
    if (!aiMode || currentTurn !== 2 || status !== "active" || winner != null) {
      return;
    }
    if (boardPause != null || matchEndOpen) return;

    const gen = ++aiRunGenerationRef.current;
    let cancelled = false;

    void (async () => {
      /* Keep banter visible during AI think — clearing here collapsed the strip and reflowed the board. */
      setBusy(true);
      setMoveError(null);
      await new Promise((r) => setTimeout(r, 72));
      if (cancelled || gen !== aiRunGenerationRef.current) {
        setBusy(false);
        return;
      }

      const boardSnap = cloneBoard(board);
      const pick = pickOfflineAiMove(
        boardSnap,
        aiDifficulty,
        Math.random,
        rosterEngineKeyForAi,
      );
      if (!pick || cancelled || gen !== aiRunGenerationRef.current) {
        setBusy(false);
        return;
      }

      pushUndo();
      const ok = await applyChosenMove(
        boardSnap,
        2,
        pick.from,
        pick.to,
        pick.chosen,
      );
      if (cancelled || gen !== aiRunGenerationRef.current) {
        setBusy(false);
        return;
      }
      if (!ok) setMoveError("The computer could not find a move.");
      setBusy(false);
    })();

    return () => {
      cancelled = true;
    };
    /* Omit `board` so multi-jump steps don’t retrigger AI. */
  }, [
    aiDifficulty,
    aiMode,
    applyChosenMove,
    boardPause,
    currentTurn,
    matchEndOpen,
    pushUndo,
    rosterEngineKeyForAi,
    status,
    winner,
  ]);

  const onSquareClick = useCallback(
    (row: number, col: number) => {
      if (
        busy ||
        gameOver ||
        status !== "active" ||
        boardPause != null ||
        matchEndOpen
      ) {
        return;
      }
      if (aiMode && currentTurn === 2) {
        setSelectedPiece(null);
        setPossibleMoves([]);
        return;
      }
      const cell = board[row]?.[col] ?? 0;
      const owner = pieceOwner(cell);

      if (owner !== null) {
        if (owner !== currentTurn) {
          playWarningSound(soundEnabled);
          setMoveError(`Player ${currentTurn}'s turn.`);
          setSelectedPiece(null);
          setPossibleMoves([]);
          return;
        }
        setMoveError(null);
        setSelectedPiece([row, col]);
        setPossibleMoves(
          computeLegalDestinations(board, currentTurn, row, col),
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
      aiMode,
      board,
      boardPause,
      busy,
      currentTurn,
      attemptMove,
      gameOver,
      matchEndOpen,
      possibleMoves,
      selectedPiece,
      soundEnabled,
      status,
    ],
  );

  const undoLastMove = useCallback(() => {
    const s = undoStackRef.current.pop();
    if (!s) return;
    captureAnimTokenRef.current += 1;
    setUndoDepth((d) => Math.max(0, d - 1));
    setBusy(false);
    applySnapshot(s);
  }, [applySnapshot]);

  const downloadCurrentBoard = useCallback(() => {
    if (!setup) return;
    const payload = {
      mode: aiMode ? "offline_local_ai" : "offline_local_2p",
      match: {
        p1Wins: matchP1Wins,
        p2Wins: matchP2Wins,
        target: matchTargetWins,
      },
      players: { p1: setup.p1Name, p2: setup.p2Name },
      ...(aiMode
        ? {
            aiDifficulty,
            ...(setup.offlineBotId
              ? { offlineBotId: setup.offlineBotId }
              : {}),
          }
        : {}),
      exportedAt: new Date().toISOString(),
      moves: moveHistory,
      outcome: { winner, status },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `draught-offline-board-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [
    aiDifficulty,
    aiMode,
    matchP1Wins,
    matchP2Wins,
    matchTargetWins,
    moveHistory,
    setup,
    winner,
    status,
  ]);

  const saveMatchStats = useCallback(() => {
    if (!setup) return;
    const champ = matchChampion;
    const payload = {
      version: 1,
      kind: "offline_match_summary",
      exportedAt: new Date().toISOString(),
      setup,
      champion: champ,
      championName:
        champ === 1 ? setup.p1Name : champ === 2 ? setup.p2Name : null,
      finalScore: { p1Wins: matchP1Wins, p2Wins: matchP2Wins },
      targetWins: matchTargetWins,
      boards: miniResults,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `draught-offline-match-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [matchChampion, matchP1Wins, matchP2Wins, matchTargetWins, miniResults, setup]);

  const goToSetup = useCallback(() => {
    try {
      sessionStorage.removeItem(SETUP_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    navigate("/play/local", { replace: true });
  }, [navigate]);

  const continueAfterBoard = useCallback(() => {
    if (!boardPause) return;
    const { boardWinner, plyCount } = boardPause;
    setBoardPause(null);
    const { p1, p2 } = matchSnapRef.current;
    const np1 = p1 + (boardWinner === 1 ? 1 : 0);
    const np2 = p2 + (boardWinner === 2 ? 1 : 0);
    setMatchP1Wins(np1);
    setMatchP2Wins(np2);
    matchSnapRef.current = { p1: np1, p2: np2 };
    setMiniResults((r) => [...r, { winner: boardWinner, plyCount }]);
    resetMiniGame();
  }, [boardPause, resetMiniGame]);

  const matchSummary = useMemo(
    () =>
      `Match ${matchP1Wins}–${matchP2Wins} · First to ${matchTargetWins}`,
    [matchP1Wins, matchP2Wins, matchTargetWins],
  );

  const nextScorePreview = useMemo(() => {
    if (!boardPause) return "";
    const { boardWinner } = boardPause;
    const n1 = matchP1Wins + (boardWinner === 1 ? 1 : 0);
    const n2 = matchP2Wins + (boardWinner === 2 ? 1 : 0);
    return `${n1}–${n2}`;
  }, [boardPause, matchP1Wins, matchP2Wins]);

  const turnLabel = useMemo(() => {
    const p1 = setup?.p1Name ?? "Player 1";
    const p2 = setup?.p2Name ?? "Player 2";
    if (matchEndOpen || boardPause) {
      return boardPause ? "Board finished" : "Match over";
    }
    if (gameOver && winner != null) {
      if (aiMode) {
        return winner === 1 ? `${p1} wins this board` : `${p2} wins this board`;
      }
      return `${winner === 1 ? p1 : p2} wins this board`;
    }
    if (aiMode) {
      return confirmedTurnForFlip === 1
        ? `${p1} to move`
        : `Computer thinking…`;
    }
    return confirmedTurnForFlip === 1
      ? `${p1} to move`
      : `${p2} to move`;
  }, [
    aiMode,
    boardPause,
    confirmedTurnForFlip,
    gameOver,
    matchEndOpen,
    setup,
    winner,
  ]);

  const stripTop = useMemo(
    () => ({
      player: 2 as const,
      label: p2Display,
      avatarUsername: setup?.p2Name,
      caps: p2CapturedPieces,
      isActiveTurn: confirmedTurnForFlip === 2 && !boardPause && !matchEndOpen,
    }),
    [
      confirmedTurnForFlip,
      boardPause,
      matchEndOpen,
      p2CapturedPieces,
      p2Display,
      setup,
    ],
  );

  const stripBottom = useMemo(
    () => ({
      player: 1 as const,
      label: p1Display,
      avatarUsername: setup?.p1Name,
      caps: p1CapturedPieces,
      isActiveTurn: confirmedTurnForFlip === 1 && !boardPause && !matchEndOpen,
    }),
    [
      boardPause,
      confirmedTurnForFlip,
      matchEndOpen,
      p1CapturedPieces,
      p1Display,
      setup,
    ],
  );

  const boardWinnerName =
    boardPause != null && setup != null
      ? boardPause.boardWinner === 1
        ? setup.p1Name
        : setup.p2Name
      : "";

  if (!setup) {
    return <Navigate to="/play/local" replace />;
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-cream bg-mesh-radial text-text dark:bg-mesh-radial-dark">
      <OfflineBoardIntermissionModal
        open={boardPause != null}
        boardWinnerName={boardWinnerName}
        matchLabel={matchSummary}
        targetLabel={`First to ${matchTargetWins} board wins`}
        nextScorePreview={nextScorePreview}
        onContinue={continueAfterBoard}
      />

      <OfflineMatchStatsModal
        open={matchEndOpen}
        title={
          matchChampion != null
            ? `${
                matchChampion === 1 ? setup.p1Name : setup.p2Name
              } wins the match`
            : "Match complete"
        }
        subtitle={`Final score ${matchP1Wins}–${matchP2Wins} (first to ${matchTargetWins}).`}
        onSaveStats={saveMatchStats}
        onNewMatch={goToSetup}
      />

      <header className="relative z-30 grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-header/20 bg-cream/95 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.35rem,env(safe-area-inset-top))] pb-1.5 backdrop-blur-md md:hidden">
        <Link
          to="/play"
          className="touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-header/30 bg-sheet/90 text-black transition active:scale-[0.98]"
          aria-label="Back"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <p className="truncate text-center font-display text-[15px] font-semibold tracking-wide text-black">
          {aiMode ? "Offline · AI" : "Offline"}
        </p>
        <div className="flex justify-end">
          <RulesHeaderIconButton
            variant="default"
            className="text-black"
            expanded={rulesOpen}
            onClick={() => {
              setRulesOpen((o) => !o);
              setSettingsOpen(false);
            }}
          />
        </div>
      </header>

      <div className="safe-x shrink-0 border-b border-header/15 bg-sheet/80 py-2 text-center text-[11px] text-muted">
        {aiMode
          ? "Device AI match · fixed board · no server."
          : "Pass & play · fixed board · no server."}{" "}
        First to {matchTargetWins} board wins.
      </div>

      <RulesHelpModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <ResignConfirmModal
        open={resignOpen}
        onCancel={() => setResignOpen(false)}
        onConfirm={() => {
          setResignOpen(false);
          setSettingsOpen(false);
          if (status === "active" && winner == null) {
            const opp = currentTurn === 1 ? 2 : 1;
            handleBoardSeriesEnd(opp, moveHistory.length);
          }
        }}
        isAiGame={aiMode}
        matchMode={matchTargetWins > 1}
        onConfirmForfeitMatch={() => {
          setResignOpen(false);
          setSettingsOpen(false);
          if (status === "active" && winner == null) {
            handleMatchForfeit();
          }
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <GamePlaySidebar
          className="hidden md:flex"
          onOpenRules={() => setRulesOpen(true)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <GamePlayErrorBoundary>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-clear-mobile-game-hud-offline pt-1 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pt-2 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pb-2">
                <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,720px)] flex-1 flex-col gap-2 sm:gap-3">
                  <div className="shrink-0 border-b border-header/10 pb-1.5">
                    <PlayerStatsStrip
                      board={board}
                      player={stripTop.player}
                      label={stripTop.label}
                      avatarUsername={stripTop.avatarUsername}
                      capturedPieceValues={stripTop.caps}
                      isActiveTurn={stripTop.isActiveTurn}
                      variant="top"
                      theme="cream"
                      aiBanter={
                        aiMode && offlineAiSpeech && offlineAiPersona
                          ? {
                              message: offlineAiSpeech,
                              botName: offlineAiPersona.name,
                              rosterEmoji: offlineAiPersona.emoji,
                              avatarSeed: offlineAiPersona.seed,
                            }
                          : undefined
                      }
                    />
                    <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight tracking-wide text-header/85 sm:text-[11px]">
                      {matchSummary}
                    </p>
                  </div>

                  <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-0.5">
                    <Board
                      board={board}
                      flip={flipBoard}
                      rotationDurationMs={DEFAULT_BOARD_ROTATION_MS}
                      currentTurn={currentTurn}
                      selectedPiece={selectedPiece}
                      possibleMoves={possibleMoves}
                      showMoveHighlights={showLegalMoveHighlights}
                      botLastMoveTo={lastMoveTo}
                      fitInFlexColumn
                      onSquareClick={(r, c) => void onSquareClick(r, c)}
                      onDragMove={(from, to) => void attemptMove(from, to)}
                      onDragPieceSelect={(r, c) => void onSquareClick(r, c)}
                      disabled={
                        busy ||
                        gameOver ||
                        boardPause != null ||
                        matchEndOpen
                      }
                      canInteract={
                        !gameOver &&
                        !busy &&
                        boardPause == null &&
                        !matchEndOpen &&
                        (!aiMode || currentTurn === 1)
                      }
                    />
                  </div>

                  <div className="shrink-0 border-t border-header/10 pt-0 [&>div]:mt-0">
                    <PlayerStatsStrip
                      board={board}
                      player={stripBottom.player}
                      label={stripBottom.label}
                      avatarUsername={stripBottom.avatarUsername}
                      capturedPieceValues={stripBottom.caps}
                      isActiveTurn={stripBottom.isActiveTurn}
                      variant="bottom"
                      theme="cream"
                    />
                  </div>
                </div>
              </div>

              <GamePlayRightPanel
                turnLabel={turnLabel}
                moveError={moveError}
                moveHistory={moveHistory}
                hintMessage={hintMessage}
                showChat={false}
                onResign={() => {
                  if (!boardPause && !matchEndOpen && status === "active") {
                    setResignOpen(true);
                  }
                }}
                canUndo={undoDepth > 0 && !boardPause && !matchEndOpen}
                onUndo={() => undoLastMove()}
                onHint={() =>
                  setMoveError(
                    "Hints are not available in offline mode on this build.",
                  )
                }
                onDownload={() => downloadCurrentBoard()}
                onSettings={() => {
                  setSettingsOpen(true);
                  setRulesOpen(false);
                }}
                onOpenRules={() => {
                  setRulesOpen(true);
                  setSettingsOpen(false);
                }}
                busy={busy}
                gameOver={gameOver || boardPause != null || matchEndOpen}
              />
            </div>
          </GamePlayErrorBoundary>
        </main>
      </div>

      <AnimatePresence>
        {settingsOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close settings"
              className="fixed inset-0 z-[78] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 right-0 top-0 z-[79] flex w-full max-w-sm flex-col border-l border-header/25 bg-sheet shadow-2xl pt-[env(safe-area-inset-top,0px)]"
            >
              <div className="safe-x flex items-center justify-between border-b border-header/25 bg-header px-4 py-4">
                <h2 className="text-lg font-bold text-text">
                  Offline game settings
                </h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-text underline decoration-text/40"
                  onClick={() => setSettingsOpen(false)}
                >
                  Done
                </button>
              </div>
              <div className="safe-x flex flex-1 flex-col gap-6 overflow-y-auto py-6 text-text">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span>Sound effects</span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="size-4"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span>Show legal moves</span>
                  <input
                    type="checkbox"
                    checked={showLegalMoveHighlights}
                    onChange={(e) =>
                      setShowLegalMoveHighlights(e.target.checked)
                    }
                    className="size-4"
                  />
                </label>
                <button
                  type="button"
                  className="rounded-xl border border-header/25 py-3 font-semibold"
                  onClick={() => {
                    goToSetup();
                    setSettingsOpen(false);
                  }}
                >
                  Leave match (setup)
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

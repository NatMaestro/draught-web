import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Board } from "@/components/game/Board";
import { GamePlayRightPanel } from "@/components/game/GamePlayRightPanel";
import { GamePlayErrorBoundary } from "@/components/game/GamePlayErrorBoundary";
import { GamePlaySidebar } from "@/components/game/GamePlaySidebar";
import { PlayerStatsStrip } from "@/components/game/PlayerStatsStrip";
import { ResignConfirmModal } from "@/components/game/ResignConfirmModal";
import { GuestExitConfirmModal } from "@/components/game/GuestExitConfirmModal";
import { GameChatModal } from "@/components/game/GameChatModal";
import {
  RulesHelpModal,
  RulesHeaderIconButton,
} from "@/components/game/RulesPanel";
import { useGamePlay } from "@/hooks/useGamePlay";
import { useGameClock } from "@/hooks/useGameClock";
import { useGameSettingsStore } from "@/store/gameSettingsStore";
import { useAuthStore } from "@/store/authStore";
import { absoluteGameUrl } from "@/lib/deepLink";
import { getGameOutcomeCopy } from "@/lib/gameOutcome";
import { GameOverOverlay } from "@/components/game/GameOverOverlay";
import {
  findBotById,
  labelForAiDifficulty,
} from "@/data/aiBots";
import { DraughtLoaderGameShell, DraughtLoaderSpinner } from "@/components/ui/DraughtLoader";

const SHOW_GAME_CHAT = import.meta.env.VITE_USE_GAME_WS !== "false";

export function GamePlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);
  const [guestExitBusy, setGuestExitBusy] = useState(false);
  const [guestExitModalOpen, setGuestExitModalOpen] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const pendingGuestNavigateRef = useRef<(() => void) | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { username, isAuthenticated } = useAuthStore();

  const soundEnabled = useGameSettingsStore((s) => s.soundEnabled);
  const rotateBoardForTurn = useGameSettingsStore((s) => s.rotateBoardForTurn);
  const showLegalMoveHighlights = useGameSettingsStore(
    (s) => s.showLegalMoveHighlights ?? true,
  );
  const setSoundEnabled = useGameSettingsStore((s) => s.setSoundEnabled);
  const setRotateBoardForTurn = useGameSettingsStore(
    (s) => s.setRotateBoardForTurn,
  );
  const setShowLegalMoveHighlights = useGameSettingsStore(
    (s) => s.setShowLegalMoveHighlights,
  );

  const {
    loading,
    loadError,
    board,
    currentTurn,
    winner,
    status,
    isAiGame,
    aiDifficulty,
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
    boardRotationMs,
    p1CapturedPieces,
    p2CapturedPieces,
    onSquareClick,
    attemptMove,
    resign,
    chatMessages,
    sendChatMessage,
    chatUnreadCount,
    wsConnected,
    moveHistory,
    hintMessage,
    hintDestination,
    lastBotMoveTo,
    canUndo,
    requestHint,
    undoLastMove,
    downloadGameRecord,
    confirmedTurnForFlip,
  } = useGamePlay(gameId, { chatPanelOpen: chatModalOpen });

  const gameOver =
    winner != null || status === "finished" || status === "abandoned";

  /** Stable bot roster id from Play vs AI URL or sessionStorage (survives refresh without query). */
  const aiBotId = useMemo(() => {
    if (!gameId) return undefined;
    const fromUrl = searchParams.get("bot");
    if (fromUrl) return fromUrl;
    try {
      return sessionStorage.getItem(`aiBot:${gameId}`) ?? undefined;
    } catch {
      return undefined;
    }
  }, [gameId, searchParams]);

  useEffect(() => {
    if (!gameId) return;
    const fromUrl = searchParams.get("bot");
    if (fromUrl) {
      try {
        sessionStorage.setItem(`aiBot:${gameId}`, fromUrl);
      } catch {
        /* private mode / quota */
      }
    }
  }, [gameId, searchParams]);

  const aiOpponentDisplayName = useMemo(() => {
    if (!isAiGame) return null;
    const n = aiBotId ? findBotById(aiBotId)?.name : undefined;
    return n ?? labelForAiDifficulty(aiDifficulty);
  }, [isAiGame, aiBotId, aiDifficulty]);

  const opponentUsername = useMemo(() => {
    if (!isOnlinePvp || mySeat == null) return null;
    if (mySeat === 1) return playerTwoProfile?.username ?? null;
    return playerOneProfile?.username ?? null;
  }, [isOnlinePvp, mySeat, playerOneProfile, playerTwoProfile]);

  const gameOutcome = useMemo(() => {
    const winnerSeat = winner === 1 || winner === 2 ? winner : null;
    return getGameOutcomeCopy({
      winnerSeat,
      endedByResign,
      endedByTimeout,
      isAiGame,
      isLocal2p,
      isOnlinePvp,
      mySeat,
      username: username ?? null,
      opponentUsername,
    });
  }, [
    winner,
    endedByResign,
    endedByTimeout,
    isAiGame,
    isLocal2p,
    isOnlinePvp,
    mySeat,
    username,
    opponentUsername,
  ]);

  const minutesForClock = useMemo(() => {
    const raw = searchParams.get("minutes");
    if (raw == null || raw === "") return 10;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 && n <= 120 ? n : 10;
  }, [searchParams]);

  /** Clocks follow server-confirmed turn so timers switch only after move API/WS ack. */
  const { p1Seconds, p2Seconds } = useGameClock(
    gameId,
    minutesForClock,
    confirmedTurnForFlip,
    status,
    gameOver,
    serverClock,
    busy,
    useClock,
  );

  const shouldBlockGuestExit = useMemo(
    () =>
      !isAuthenticated &&
      !loading &&
      !loadError &&
      !gameOver,
    [isAuthenticated, loading, loadError, gameOver],
  );

  /** Guest leave: forfeit then run pending navigation (replaces useBlocker — works with BrowserRouter + Data Router). */
  const requestGuestNavigate = useCallback(
    (to: string) => {
      if (shouldBlockGuestExit) {
        pendingGuestNavigateRef.current = () => {
          navigate(to);
        };
        setGuestExitModalOpen(true);
      } else {
        navigate(to);
      }
    },
    [shouldBlockGuestExit, navigate],
  );

  useEffect(() => {
    if (!shouldBlockGuestExit) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [shouldBlockGuestExit]);

  const handleGuestExitForfeit = useCallback(async () => {
    setGuestExitBusy(true);
    try {
      const ok = await resign();
      if (ok) {
        const run = pendingGuestNavigateRef.current;
        pendingGuestNavigateRef.current = null;
        setGuestExitModalOpen(false);
        run?.();
      }
    } finally {
      setGuestExitBusy(false);
    }
  }, [resign]);

  useEffect(() => {
    if (!gameId) return;
    const short = gameId.slice(0, 8);
    const prev = document.title;
    document.title = `Draught · Game ${short}`;
    return () => {
      document.title = prev;
    };
  }, [gameId]);

  const loginReturnTo = encodeURIComponent(
    `${location.pathname}${location.search}`,
  );

  const handleCopyGameLink = useCallback(async () => {
    if (!gameId) return;
    const url = absoluteGameUrl(gameId);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }, [gameId]);

  const handleShareGameLink = useCallback(async () => {
    if (!gameId) return;
    const url = absoluteGameUrl(gameId);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Draught game",
          text: "Open this match on Draught",
          url,
        });
      } else {
        await handleCopyGameLink();
      }
    } catch {
      /* cancelled or failed */
    }
  }, [gameId, handleCopyGameLink]);

  const turnLabel = useMemo(() => {
    if (isAiGame) {
      const opp = aiOpponentDisplayName ?? "AI";
      return confirmedTurnForFlip === 1 ? "Your turn" : `${opp} thinking…`;
    }
    if (isOnlinePvp && mySeat != null) {
      return confirmedTurnForFlip === mySeat ? "Your turn" : "Opponent's turn";
    }
    return currentTurn === 1 ? "Player 1 to move" : "Player 2 to move";
  }, [
    isAiGame,
    isOnlinePvp,
    mySeat,
    currentTurn,
    confirmedTurnForFlip,
    aiOpponentDisplayName,
  ]);

  /** Top / bottom strips: online PvP = opponent above, you below + avatars; else legacy P2 top / P1 bottom. */
  const { stripTop, stripBottom } = useMemo(() => {
    const clockRunning = useClock && !gameOver && status === "active";
    if (
      isOnlinePvp &&
      mySeat != null &&
      playerOneProfile &&
      playerTwoProfile
    ) {
      const oppSeat = mySeat === 1 ? 2 : 1;
      const oppProf = oppSeat === 1 ? playerOneProfile : playerTwoProfile;
      const meProf = mySeat === 1 ? playerOneProfile : playerTwoProfile;
      return {
        stripTop: {
          player: oppSeat as 1 | 2,
          label: oppProf.username,
          avatarUsername: oppProf.username,
          caps: oppSeat === 1 ? p1CapturedPieces : p2CapturedPieces,
          isActiveTurn: confirmedTurnForFlip === oppSeat,
          timerSeconds: useClock
            ? oppSeat === 1
              ? p1Seconds
              : p2Seconds
            : undefined,
          timerActive: clockRunning && confirmedTurnForFlip === oppSeat,
        },
        stripBottom: {
          player: mySeat,
          label: meProf.username,
          avatarUsername: meProf.username,
          caps: mySeat === 1 ? p1CapturedPieces : p2CapturedPieces,
          isActiveTurn: confirmedTurnForFlip === mySeat,
          timerSeconds: useClock
            ? mySeat === 1
              ? p1Seconds
              : p2Seconds
            : undefined,
          timerActive: clockRunning && confirmedTurnForFlip === mySeat,
        },
      };
    }
    const labelP1 =
      isAiGame && isAuthenticated && username
        ? `You (${username})`
        : isAiGame
          ? "You"
          : "Player 1";
    const labelP2 = isAiGame
      ? (aiOpponentDisplayName ?? "AI")
      : "Player 2";
    const p2Avatar =
      isAiGame && aiOpponentDisplayName
        ? aiOpponentDisplayName
        : undefined;
    return {
      stripTop: {
        player: 2 as const,
        label: labelP2,
        avatarUsername: p2Avatar,
        caps: p2CapturedPieces,
        isActiveTurn: confirmedTurnForFlip === 2,
        timerSeconds: useClock ? p2Seconds : undefined,
        timerActive: clockRunning && confirmedTurnForFlip === 2,
      },
      stripBottom: {
        player: 1 as const,
        label: labelP1,
        avatarUsername:
          isAiGame && isAuthenticated && username ? username : undefined,
        caps: p1CapturedPieces,
        isActiveTurn: confirmedTurnForFlip === 1,
        timerSeconds: p1Seconds,
        timerActive: clockRunning && confirmedTurnForFlip === 1,
      },
    };
  }, [
    isOnlinePvp,
    mySeat,
    playerOneProfile,
    playerTwoProfile,
    isAiGame,
    aiOpponentDisplayName,
    isAuthenticated,
    username,
    p1CapturedPieces,
    p2CapturedPieces,
    confirmedTurnForFlip,
    p1Seconds,
    p2Seconds,
    gameOver,
    status,
    useClock,
  ]);

  const handleConfirmResign = () => {
    void resign().then((ok) => {
      setResignConfirmOpen(false);
      setSettingsOpen(false);
      if (ok) navigate("/home", { replace: true });
    });
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-cream bg-mesh-radial text-text">
      {/* Mobile: minimal bar — back, logo, rules (settings via bottom dock) */}
      <header
        className="relative z-30 grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center border-b border-header/20 bg-cream/95 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pt-[max(0.35rem,env(safe-area-inset-top))] pb-1.5 backdrop-blur-md md:hidden"
      >
        <Link
          to="/play"
          onClick={(e) => {
            if (shouldBlockGuestExit) {
              e.preventDefault();
              requestGuestNavigate("/play");
            }
          }}
          className="touch-manipulation flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-header/30 bg-sheet/90 text-black transition active:scale-[0.98]"
          aria-label="Back to menu"
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
          Draught
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

      {!isAuthenticated && !loading && !loadError && !gameOver ? (
        <div className="safe-x shrink-0 border-b border-amber-200/40 bg-amber-50/95 py-2.5 text-center text-[11px] leading-snug text-text sm:text-xs">
          <Link
            to={`/auth/login?returnTo=${loginReturnTo}`}
            onClick={(e) => {
              if (shouldBlockGuestExit) {
                e.preventDefault();
                requestGuestNavigate(`/auth/login?returnTo=${loginReturnTo}`);
              }
            }}
            className="font-semibold underline decoration-header decoration-2"
          >
            Sign in
          </Link>{" "}
          to save progress and open this match from any device (
          <button
            type="button"
            onClick={() => void handleCopyGameLink()}
            className="font-semibold text-text underline decoration-header decoration-2"
          >
            {linkCopied ? "copied!" : "copy link"}
          </button>
          ).
        </div>
      ) : null}

      <RulesHelpModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <ResignConfirmModal
        open={resignConfirmOpen}
        onCancel={() => setResignConfirmOpen(false)}
        onConfirm={handleConfirmResign}
        isAiGame={isAiGame}
      />

      <GuestExitConfirmModal
        open={guestExitModalOpen}
        busy={guestExitBusy}
        onStay={() => {
          setGuestExitModalOpen(false);
          pendingGuestNavigateRef.current = null;
        }}
        onLeaveAndForfeit={() => void handleGuestExitForfeit()}
      />

      {SHOW_GAME_CHAT && !isAiGame ? (
        <GameChatModal
          open={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          messages={chatMessages}
          onSend={sendChatMessage}
          senderLabel={isAuthenticated && username ? username : "Guest"}
          disabled={busy}
          connected={wsConnected}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <GamePlaySidebar
          className="hidden md:flex"
          onOpenRules={() => setRulesOpen(true)}
          onPlayMenuNavigate={
            shouldBlockGuestExit
              ? () => requestGuestNavigate("/play")
              : undefined
          }
          onHomeNavigate={
            shouldBlockGuestExit ? () => requestGuestNavigate("/") : undefined
          }
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <DraughtLoaderGameShell label="Loading game" />
          ) : loadError ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-red-700">{loadError}</p>
              <p className="mt-2 max-w-sm text-xs text-muted">
                Start Django on port{" "}
                <code className="rounded bg-sheet px-1">8000</code> so Vite can
                proxy <code className="rounded bg-sheet px-1">/api</code>.
              </p>
              <Link
                to="/play"
                onClick={(e) => {
                  if (shouldBlockGuestExit) {
                    e.preventDefault();
                    requestGuestNavigate("/play");
                  }
                }}
                className="mt-4 font-semibold text-text underline decoration-header decoration-2"
              >
                Back to play menu
              </Link>
            </div>
          ) : (
            <GamePlayErrorBoundary>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:items-stretch">
              {/* Board column: same flex sizing as Play vs AI — strips in flow, board fills remaining space */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-clear-mobile-game-hud pt-1 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pt-2 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pb-2">
                <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,720px)] flex-1 flex-col">
                  <div className="shrink-0">
                    <PlayerStatsStrip
                      board={board}
                      player={stripTop.player}
                      label={stripTop.label}
                      avatarUsername={stripTop.avatarUsername}
                      timerSeconds={stripTop.timerSeconds}
                      timerActive={stripTop.timerActive}
                      capturedPieceValues={stripTop.caps}
                      isActiveTurn={stripTop.isActiveTurn}
                      variant="top"
                      theme="cream"
                    />
                  </div>

                  <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden py-1 sm:py-2">
                    {busy ? (
                      <div className="absolute left-1/2 top-1 z-10 flex -translate-x-1/2 items-center gap-2 text-xs text-muted">
                        <DraughtLoaderSpinner size="sm" ariaLabel="Working" />
                        <span>Working…</span>
                      </div>
                    ) : null}
                    <Board
                      board={board}
                      flip={flipBoard}
                      rotationDurationMs={boardRotationMs}
                      currentTurn={currentTurn}
                      selectedPiece={selectedPiece}
                      possibleMoves={possibleMoves}
                      showMoveHighlights={showLegalMoveHighlights}
                      hintDestination={hintDestination}
                      botLastMoveTo={lastBotMoveTo}
                      onSquareClick={(r, c) => void onSquareClick(r, c)}
                      onDragMove={(from, to) => void attemptMove(from, to)}
                      onDragPieceSelect={(r, c) => void onSquareClick(r, c)}
                      disabled={busy || gameOver}
                      canInteract={canInteract}
                    />
                  </div>

                  <div className="mt-auto shrink-0 pt-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    <PlayerStatsStrip
                      board={board}
                      player={stripBottom.player}
                      label={stripBottom.label}
                      avatarUsername={stripBottom.avatarUsername}
                      timerSeconds={stripBottom.timerSeconds}
                      timerActive={stripBottom.timerActive}
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
                showChat={SHOW_GAME_CHAT && !isAiGame}
                onOpenChat={
                  SHOW_GAME_CHAT && !isAiGame
                    ? () => setChatModalOpen(true)
                    : undefined
                }
                chatUnreadCount={chatUnreadCount}
                onResign={() => setResignConfirmOpen(true)}
                canUndo={canUndo}
                onUndo={() => void undoLastMove()}
                onHint={() => requestHint()}
                onDownload={() => downloadGameRecord()}
                onSettings={() => {
                  setSettingsOpen(true);
                  setRulesOpen(false);
                }}
                onOpenRules={() => {
                  setRulesOpen(true);
                  setSettingsOpen(false);
                }}
                busy={busy}
                gameOver={gameOver}
              />

              {/* Ad slot — reserve space for AdSense */}
              <aside
                className="hidden w-[min(300px,28vw)] shrink-0 border-l border-header/20 bg-sheet/60 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden"
                aria-label="Advertisement"
              >
                <div className="flex min-h-0 flex-1 flex-col items-center justify-start p-4">
                  <p className="text-center text-[11px] uppercase tracking-wider text-muted">
                    Ad space
                  </p>
                  <div className="mt-4 min-h-[250px] w-full max-w-[280px] rounded-lg border border-dashed border-header/30 bg-cream/80" />
                  <p className="mt-3 max-w-[200px] text-center text-[10px] leading-snug text-muted">
                    Reserved for ads (e.g. AdSense). Remove this placeholder
                    when you inject the script.
                  </p>
                </div>
              </aside>
            </div>
            </GamePlayErrorBoundary>
          )}
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
              <div
                className="flex items-center justify-between border-b border-header/25 px-4 py-4 safe-x"
                style={{ backgroundColor: "#D8A477" }}
              >
                <h2 className="text-lg font-bold text-text">Game settings</h2>
                <button
                  type="button"
                  className="text-sm font-semibold text-text underline decoration-text/40"
                  onClick={() => setSettingsOpen(false)}
                >
                  Done
                </button>
              </div>
              <div className="safe-x flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden py-6 text-text">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="text-sm font-medium">Sound effects</span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="h-5 w-5 accent-header"
                  />
                </label>
                <label className="flex cursor-pointer items-start justify-between gap-3">
                  <span className="text-sm font-medium">
                    Show legal moves
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      Highlights destinations when you select a piece.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showLegalMoveHighlights}
                    onChange={(e) =>
                      setShowLegalMoveHighlights(e.target.checked)
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-header"
                  />
                </label>
                {!isAiGame ? (
                  <label className="flex cursor-pointer items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      Rotate board for current player (local 2P)
                    </span>
                    <input
                      type="checkbox"
                      checked={rotateBoardForTurn}
                      onChange={(e) => setRotateBoardForTurn(e.target.checked)}
                      className="h-5 w-5 accent-header"
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted">
                    You play as Player 1 (bottom). AI is Player 2.
                  </p>
                )}
                <div className="flex flex-col gap-2 rounded-xl border border-header/20 bg-cream/50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Link to this game
                  </p>
                  <p className="text-xs text-muted">
                    Share or bookmark this URL to reopen the same match.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleCopyGameLink()}
                      className="flex-1 rounded-xl border border-header/30 bg-sheet py-2.5 text-sm font-semibold text-text hover:bg-sheet/90"
                    >
                      {linkCopied ? "Copied!" : "Copy link"}
                    </button>
                    {typeof navigator.share === "function" ? (
                      <button
                        type="button"
                        onClick={() => void handleShareGameLink()}
                        className="flex-1 rounded-xl border border-header/30 bg-sheet py-2.5 text-sm font-semibold text-text hover:bg-sheet/90"
                      >
                        Share…
                      </button>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || gameOver}
                  onClick={() => setResignConfirmOpen(true)}
                  className="rounded-xl bg-red-700 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Resign
                </button>
                <Link
                  to="/play"
                  className="text-center text-sm font-semibold text-text underline decoration-header decoration-2"
                  onClick={(e) => {
                    setSettingsOpen(false);
                    if (shouldBlockGuestExit) {
                      e.preventDefault();
                      requestGuestNavigate("/play");
                    }
                  }}
                >
                  Leave game (menu)
                </Link>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <GameOverOverlay
        open={gameOver}
        copy={gameOutcome}
        onNavigatePlay={(e) => {
          if (shouldBlockGuestExit) {
            e.preventDefault();
            requestGuestNavigate("/play");
          }
        }}
      />
    </div>
  );
}

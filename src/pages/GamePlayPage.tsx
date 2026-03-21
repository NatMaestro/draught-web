import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Board } from "@/components/game/Board";
import { GamePlayRightPanel } from "@/components/game/GamePlayRightPanel";
import { GamePlayErrorBoundary } from "@/components/game/GamePlayErrorBoundary";
import { GamePlaySidebar } from "@/components/game/GamePlaySidebar";
import { PlayerStatsStrip } from "@/components/game/PlayerStatsStrip";
import { ResignConfirmModal } from "@/components/game/ResignConfirmModal";
import {
  RulesHelpModal,
  RulesHeaderIconButton,
} from "@/components/game/RulesPanel";
import { useGamePlay } from "@/hooks/useGamePlay";
import { useGameSettingsStore } from "@/store/gameSettingsStore";
import { useAuthStore } from "@/store/authStore";

const SHOW_GAME_CHAT = import.meta.env.VITE_USE_GAME_WS !== "false";

export function GamePlayPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);

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
    wsConnected,
    moveHistory,
    hintMessage,
    hintDestination,
    lastBotMoveTo,
    canUndo,
    requestHint,
    undoLastMove,
    downloadGameRecord,
  } = useGamePlay(gameId);

  const gameOver =
    winner != null || status === "finished" || status === "abandoned";

  const turnLabel = isAiGame
    ? currentTurn === 1
      ? "Your turn"
      : "AI thinking…"
    : currentTurn === 1
      ? "Player 1 to move"
      : "Player 2 to move";

  const labelP1 =
    isAiGame && isAuthenticated && username
      ? `You (${username})`
      : isAiGame
        ? "You"
        : "Player 1";

  const labelP2 = isAiGame ? "AI" : "Player 2";

  const handleConfirmResign = () => {
    void resign().then((ok) => {
      setResignConfirmOpen(false);
      setSettingsOpen(false);
      if (ok) navigate("/home", { replace: true });
    });
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden overscroll-none bg-cream text-text">
      {/* Mobile: compact top bar — matches Home / app header */}
      <header
        className="z-30 flex shrink-0 items-center justify-between gap-2 border-b border-header/25 bg-header px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden"
      >
        <Link
          to="/play"
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-text hover:bg-black/10"
        >
          ← Menu
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-text">Draught</p>
          <p className="truncate text-xs text-text/80">{turnLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RulesHeaderIconButton
            expanded={rulesOpen}
            onClick={() => {
              setRulesOpen((o) => !o);
              setSettingsOpen(false);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(true);
              setRulesOpen(false);
            }}
            className="rounded-lg bg-black/10 px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-black/15"
            aria-expanded={settingsOpen}
          >
            Settings
          </button>
        </div>
      </header>

      <RulesHelpModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <ResignConfirmModal
        open={resignConfirmOpen}
        onCancel={() => setResignConfirmOpen(false)}
        onConfirm={handleConfirmResign}
        isAiGame={isAiGame}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <GamePlaySidebar onOpenRules={() => setRulesOpen(true)} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-8 text-muted">
              Loading game…
            </div>
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
                className="mt-4 font-semibold text-text underline decoration-header decoration-2"
              >
                Back to play menu
              </Link>
            </div>
          ) : (
            <GamePlayErrorBoundary>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
              {/* Board column: top stats, flex board, bottom stats pinned to viewport bottom */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pt-2 sm:px-4">
                <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,720px)] flex-1 flex-col">
                  <PlayerStatsStrip
                    board={board}
                    player={2}
                    label={labelP2}
                    capturedPieceValues={p2CapturedPieces}
                    isActiveTurn={currentTurn === 2}
                    variant="top"
                    theme="cream"
                  />

                  <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center py-2">
                    {busy ? (
                      <p className="absolute left-1/2 top-1 z-10 -translate-x-1/2 text-center text-xs text-muted">
                        Working…
                      </p>
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
                      botLastMoveTo={isAiGame ? lastBotMoveTo : null}
                      onSquareClick={(r, c) => void onSquareClick(r, c)}
                      onDragMove={(from, to) => void attemptMove(from, to)}
                      onDragPieceSelect={(r, c) => void onSquareClick(r, c)}
                      disabled={busy || gameOver}
                    />
                  </div>

                  <div className="mt-auto shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    <PlayerStatsStrip
                      board={board}
                      player={1}
                      label={labelP1}
                      capturedPieceValues={p1CapturedPieces}
                      isActiveTurn={currentTurn === 1}
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
                chatMessages={chatMessages}
                sendChatMessage={sendChatMessage}
                chatSenderLabel={
                  isAuthenticated && username ? username : "Guest"
                }
                chatDisabled={busy || gameOver}
                wsConnected={wsConnected}
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
                className="hidden w-[min(300px,28vw)] shrink-0 border-l border-header/20 bg-sheet/60 xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden"
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
              className="fixed inset-0 z-40 bg-black/50"
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
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-header/25 bg-sheet shadow-2xl"
            >
              <div
                className="flex items-center justify-between border-b border-header/25 px-4 py-4"
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
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 text-text">
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
                  onClick={() => setSettingsOpen(false)}
                >
                  Leave game (menu)
                </Link>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {gameOver ? (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-sm rounded-2xl border border-header/30 bg-sheet p-8 text-center shadow-2xl"
            >
              <p className="font-display text-2xl text-text">
                {winner === 1
                  ? "Player 1 wins"
                  : winner === 2
                    ? isAiGame
                      ? "AI wins"
                      : "Player 2 wins"
                    : "Game over"}
              </p>
              <Link
                to="/play"
                className="mt-6 inline-flex rounded-full px-8 py-3 text-sm font-bold text-text shadow-md"
                style={{ backgroundColor: "#EFCA83" }}
              >
                Back to menu
              </Link>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

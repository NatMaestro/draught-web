import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Board } from "@/components/game/Board";
import { gamesApi, challengesApi, type GameDetail, type GamePlayerPublic } from "@/lib/api";
import { normalizeBoardState } from "@/lib/boardUtils";
import { boardAfterPlyCount, nextTurnAfterPlyCount } from "@/lib/replayBoard";
import { useAuthStore } from "@/store/authStore";
import { DraughtLoader, DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

function playerPublic(
  p: GameDetail["player_one"],
): GamePlayerPublic | null {
  if (p && typeof p === "object" && "username" in p && "id" in p) {
    return p as GamePlayerPublic;
  }
  return null;
}

export function GameReviewPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, userId: authUserId } = useAuthStore();
  const [game, setGame] = useState<GameDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [rematchBusy, setRematchBusy] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) return;
    setError(null);
    try {
      const { data } = await gamesApi.get(gameId);
      setGame(data);
      setStep(0);
    } catch {
      setError("Could not load this game.");
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  const moves = game?.moves ?? [];
  const moveLen = moves.length;

  const board = useMemo(() => {
    if (!game) return normalizeBoardState([]);
    if (moveLen === 0) return normalizeBoardState(game.board_state);
    if (step >= moveLen) {
      return normalizeBoardState(game.board_state);
    }
    return normalizeBoardState(boardAfterPlyCount(moves, step));
  }, [game, moves, moveLen, step]);

  const currentTurn: 1 | 2 = useMemo(() => {
    if (!game || step >= moveLen) return 1;
    return nextTurnAfterPlyCount(step);
  }, [game, step, moveLen]);

  const lastMoveTo = useMemo((): [number, number] | null => {
    if (step < 1 || step > moveLen) return null;
    const m = moves[step - 1];
    if (!m) return null;
    return [m.to_row, m.to_col];
  }, [moves, step, moveLen]);

  const p1 = playerPublic(game?.player_one);
  const p2 = playerPublic(game?.player_two);
  const myId = authUserId ?? null;
  const opponentId =
    myId != null && p1 && p2
      ? p1.id === myId
        ? p2.id
        : p2.id === myId
          ? p1.id
          : null
      : null;
  const canRematch =
    Boolean(isAuthenticated && opponentId && game && !game.is_ai_game && !game.is_local_2p);

  const moveLine = useMemo(() => {
    return moves
      .slice(0, Math.min(step, moveLen))
      .map((m, i) => {
        const n = i + 1;
        const p = m.player === 2 ? "P2" : "P1";
        return `${n}.${p} ${m.from_row + 1}${m.from_col + 1}→${m.to_row + 1}${m.to_col + 1}`;
      })
      .join("  ");
  }, [moves, step, moveLen]);

  if (error) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-4 text-center">
        <p className="text-red-700">{error}</p>
        <Link to="/home" className="mt-4 font-semibold text-text underline">
          Back home
        </Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center px-4">
        <DraughtLoader variant="section" label="Loading game" className="py-4" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream pb-36 pt-2">
      <header className="safe-x flex items-center justify-between gap-2 border-b border-header/15 pb-3">
        <Link
          to="/home"
          className="rounded-lg px-2 py-2 text-sm font-semibold text-text"
        >
          ← Back
        </Link>
        <h1 className="font-display text-lg text-text">Review</h1>
        <span className="w-14" aria-hidden />
      </header>

      <div className="safe-x mt-2 overflow-x-auto border-b border-header/10 bg-sheet/50 py-2">
        <p className="whitespace-nowrap font-mono text-[11px] text-text/90">
          {moveLine || "Start position"}
        </p>
      </div>

      <div className="safe-x mt-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-text">
          {p1?.username ?? "P1"} vs {p2?.username ?? (game.is_ai_game ? "AI" : "P2")}
        </span>
        <span className="text-muted">
          {step} / {moveLen}
        </span>
      </div>

      <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center px-2">
        <Board
          board={board}
          flip={false}
          currentTurn={currentTurn}
          selectedPiece={null}
          possibleMoves={[]}
          showMoveHighlights={false}
          hintDestination={lastMoveTo}
          onSquareClick={() => {}}
          disabled
          canInteract={false}
        />
      </div>

      <div className="safe-x mt-4 rounded-2xl border border-dashed border-header/30 bg-cream/80 px-3 py-3 text-center text-xs text-muted">
        <strong className="text-text">Better moves</strong> — analysis coming
        soon. Step through the game with the arrows below.
      </div>

      {canRematch && opponentId ? (
        <div className="safe-x mt-4">
          <button
            type="button"
            disabled={rematchBusy}
            className="flex w-full items-center justify-center rounded-2xl bg-header py-3 text-sm font-bold text-text disabled:opacity-50"
            onClick={async () => {
              setRematchBusy(true);
              try {
                await challengesApi.create(opponentId, game.id);
                navigate("/home");
              } catch {
                /* toast later */
              } finally {
                setRematchBusy(false);
              }
            }}
          >
            <DraughtLoaderButtonContent
              loading={rematchBusy}
              loadingText="Sending…"
              idleText="Request rematch"
              tone="onLight"
            />
          </button>
          <p className="mt-1 text-center text-[11px] text-muted">
            Sends a game request. They’ll see it on their home screen.
          </p>
        </div>
      ) : null}

      <nav className="safe-x fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-3 border-t border-header/20 bg-cream/95 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <button
          type="button"
          className="rounded-xl border border-header/40 px-5 py-3 text-lg font-bold text-text disabled:opacity-40"
          disabled={step <= 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          aria-label="Previous move"
        >
          ‹
        </button>
        <button
          type="button"
          className="rounded-xl border border-header/40 px-5 py-3 text-lg font-bold text-text disabled:opacity-40"
          disabled={step >= moveLen}
          onClick={() => setStep((s) => Math.min(moveLen, s + 1))}
          aria-label="Next move"
        >
          ›
        </button>
      </nav>
    </div>
  );
}

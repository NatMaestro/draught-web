import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Board } from "@/components/game/Board";
import { GamePlayErrorBoundary } from "@/components/game/GamePlayErrorBoundary";
import { GamePlaySidebar } from "@/components/game/GamePlaySidebar";
import { PlayBotRightPanel } from "@/components/game/PlayBotRightPanel";
import { PlayerStatsStrip } from "@/components/game/PlayerStatsStrip";
import {
  RulesHelpModal,
  RulesHeaderIconButton,
} from "@/components/game/RulesPanel";
import { ALL_BOT_TIERS, type BotDef } from "@/data/aiBots";
import { gamesApi } from "@/lib/api";
import { createInitialBoard } from "@/lib/boardUtils";

const DEFAULT_BOARD = createInitialBoard();

function pickDefaultBot(): BotDef {
  return ALL_BOT_TIERS[1]?.bots[0] ?? ALL_BOT_TIERS[0].bots[0];
}

/**
 * Layout matches `/play/game/:id`: sidebar → board column → right panel (bots) → ad column.
 */
function parseMinutes(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 120 ? n : null;
}

export function PlayAIPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const minutesFromHub = useMemo(
    () => parseMinutes(searchParams.get("minutes")),
    [searchParams],
  );
  const useClockFromHub = useMemo(
    () => searchParams.get("clock") !== "off",
    [searchParams],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BotDef>(pickDefaultBot);
  const [rulesOpen, setRulesOpen] = useState(false);

  const previewBoard = useMemo(() => DEFAULT_BOARD, []);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await gamesApi.create({
        isAi: true,
        aiDifficulty: selected.engineKey,
        useClock: useClockFromHub,
        ...(useClockFromHub &&
          minutesFromHub != null && {
            timeControlSec: minutesFromHub * 60,
          }),
      });
      try {
        sessionStorage.setItem(`aiBot:${data.id}`, selected.id);
      } catch {
        /* private mode */
      }
      navigate(
        `/play/game/${data.id}?bot=${encodeURIComponent(selected.id)}`,
        { replace: true },
      );
    } catch {
      setError("Could not start game. Check the API and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-cream bg-mesh-radial text-text">
      {/* Mobile: slim glass header — nav duplicated in sidebar on md+ */}
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-b from-[#1e1a14]/92 to-[#12100c]/95 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md md:hidden">
        <Link
          to="/play"
          className="touch-manipulation shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/95 shadow-sm transition active:scale-[0.98] min-h-[44px] flex items-center"
        >
          ← Menu
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-base tracking-wide text-white">
            Play vs AI
          </p>
          <p className="truncate text-[11px] text-cyan-200/70">
            {!useClockFromHub
              ? "No clock — casual"
              : minutesFromHub != null
                ? `Clock from menu: ${minutesFromHub} min`
                : "Pick an opponent below"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RulesHeaderIconButton
            variant="dark"
            expanded={rulesOpen}
            onClick={() => setRulesOpen((o) => !o)}
          />
          <span className="w-[34px]" aria-hidden />
        </div>
      </header>

      <RulesHelpModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <GamePlaySidebar
          className="hidden md:flex"
          onOpenRules={() => setRulesOpen(true)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <GamePlayErrorBoundary>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:items-stretch">
              {/* Board column — same structure as GamePlayPage */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-clear-mobile-game-hud pt-1 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:pt-2 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pb-2">
                <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,720px)] flex-1 flex-col">
                  <div className="shrink-0">
                    <PlayerStatsStrip
                      board={previewBoard}
                      player={2}
                      label={selected.name}
                      capturedPieceValues={[]}
                      isActiveTurn={false}
                      variant="top"
                      theme="cream"
                    />
                  </div>

                  <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-hidden py-1 sm:py-2">
                    <Board
                      board={previewBoard}
                      flip={false}
                      currentTurn={1}
                      selectedPiece={null}
                      possibleMoves={[]}
                      showMoveHighlights={false}
                      onSquareClick={() => {}}
                      disabled
                    />
                  </div>

                  <div className="mt-auto shrink-0 pt-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    <PlayerStatsStrip
                      board={previewBoard}
                      player={1}
                      label="You"
                      capturedPieceValues={[]}
                      isActiveTurn
                      variant="bottom"
                      theme="cream"
                    />
                  </div>
                </div>
              </div>

              <PlayBotRightPanel
                selected={selected}
                onSelect={setSelected}
                onPlay={() => void start()}
                loading={loading}
                error={error}
                onOpenRules={() => setRulesOpen(true)}
              />

              {/* Ad slot — same as GamePlayPage */}
              <aside
                className="hidden min-h-0 w-[min(300px,28vw)] shrink-0 self-stretch overflow-hidden border-l border-header/20 bg-sheet/60 lg:flex lg:flex-col"
                aria-label="Advertisement"
              >
                <div className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-hidden p-4">
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
        </main>
      </div>
    </div>
  );
}

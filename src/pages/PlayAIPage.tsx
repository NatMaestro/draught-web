import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
export function PlayAIPage() {
  const navigate = useNavigate();
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
      });
      navigate(`/play/game/${data.id}`, { replace: true });
    } catch {
      setError("Could not start game. Check the API and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-cream text-text">
      {/* Mobile: same top bar pattern as GamePlayPage */}
      <header className="z-30 flex shrink-0 items-center justify-between gap-2 border-b border-header/25 bg-header px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
        <Link
          to="/play"
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-text hover:bg-black/10"
        >
          ← Menu
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold text-text">Draught</p>
          <p className="truncate text-xs text-text/80">Play bots</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <RulesHeaderIconButton
            expanded={rulesOpen}
            onClick={() => setRulesOpen((o) => !o)}
          />
          <span className="w-[34px]" aria-hidden />
        </div>
      </header>

      <RulesHelpModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <GamePlaySidebar onOpenRules={() => setRulesOpen(true)} />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <GamePlayErrorBoundary>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row xl:items-stretch">
              {/* Board column — same structure as GamePlayPage */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pt-2 sm:px-4">
                <div className="mx-auto flex min-h-0 w-full max-w-[min(100%,720px)] flex-1 flex-col">
                  <PlayerStatsStrip
                    board={previewBoard}
                    player={2}
                    label={selected.name}
                    capturedPieceValues={[]}
                    isActiveTurn={false}
                    variant="top"
                    theme="cream"
                  />

                  <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center py-2">
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

                  <div className="mt-auto shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
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
                className="hidden min-h-0 w-[min(300px,28vw)] shrink-0 self-stretch overflow-hidden border-l border-header/20 bg-sheet/60 xl:flex xl:flex-col"
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

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Board } from "@/components/game/Board";
import { GamePlayErrorBoundary } from "@/components/game/GamePlayErrorBoundary";
import { GamePlaySidebar } from "@/components/game/GamePlaySidebar";
import {
  BotEngineModeBar,
  PlayBotRightPanel,
  type BotEngineMode,
} from "@/components/game/PlayBotRightPanel";
import { PlayerStatsStrip } from "@/components/game/PlayerStatsStrip";
import {
  RulesHelpModal,
  RulesHeaderIconButton,
} from "@/components/game/RulesPanel";
import { ALL_BOT_TIERS, findBotById, type BotDef } from "@/data/aiBots";
import { gamesApi } from "@/lib/api";
import { createInitialBoard } from "@/lib/boardUtils";
import { normalizeOfflineAiDifficulty } from "@/lib/offlineAi";
import {
  DEFAULT_OFFLINE_MATCH_TARGET,
  type OfflineMatchSetup,
} from "@/lib/offlineMatchTypes";

const OFFLINE_SETUP_STORAGE_KEY = "draughtOfflineSetup";

function normalizeName(raw: string, fallback: string): string {
  const t = raw.trim();
  return t.length > 0 ? t.slice(0, 48) : fallback;
}

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
  const [engineMode, setEngineMode] = useState<BotEngineMode>("online");
  const [offlineYourName, setOfflineYourName] = useState("Player 1");
  const [offlineComputerLabel, setOfflineComputerLabel] =
    useState("Computer");
  const [selected, setSelected] = useState<BotDef>(pickDefaultBot);
  const [rulesOpen, setRulesOpen] = useState(false);

  const previewBoard = useMemo(() => DEFAULT_BOARD, []);

  const headerSubline = useMemo(() => {
    if (engineMode === "offline") {
      return "This device — no server · first to 5 board wins";
    }
    if (!useClockFromHub) {
      return "No clock — casual";
    }
    if (minutesFromHub != null) {
      return `Clock from menu: ${minutesFromHub} min`;
    }
    return "Pick an opponent below";
  }, [engineMode, minutesFromHub, useClockFromHub]);

  const playIdleLabel =
    engineMode === "offline" ? "Start offline match" : "Play";

  const startOfflineMatch = () => {
    const bot = findBotById(selected.id);
    if (!bot) return;
    const setup: OfflineMatchSetup = {
      p1Name: normalizeName(offlineYourName, "Player 1"),
      p2Name: normalizeName(offlineComputerLabel, "Computer"),
      aiMode: true,
      aiDifficulty: normalizeOfflineAiDifficulty(bot.engineKey),
      offlineBotId: selected.id,
      matchTargetWins: DEFAULT_OFFLINE_MATCH_TARGET,
    };
    try {
      sessionStorage.setItem(OFFLINE_SETUP_STORAGE_KEY, JSON.stringify(setup));
    } catch {
      /* private / quota */
    }
    navigate("/play/offline", { state: setup });
  };

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

  const handlePlay = () => {
    if (engineMode === "offline") {
      startOfflineMatch();
      return;
    }
    void start();
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-cream bg-mesh-radial text-text dark:bg-mesh-radial-dark">
      {/* Mobile: slim glass header — nav duplicated in sidebar on md+ */}
      <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-black/10 bg-sheet/95 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md dark:border-white/10 dark:bg-cream/95 md:hidden">
        <Link
          to="/play"
          className="touch-manipulation flex min-h-[44px] shrink-0 items-center rounded-xl border border-black/10 bg-black/5 px-3 py-2.5 text-sm font-semibold text-text shadow-sm transition active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          ← Menu
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-base tracking-wide text-text dark:text-white">
            Play vs AI
          </p>
          <p className="truncate text-[11px] text-muted dark:text-cyan-200/70">
            {headerSubline}
          </p>
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

                  <div className="mt-auto shrink-0 pt-0.5">
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

                  <BotEngineModeBar
                    show
                    engineMode={engineMode}
                    onEngineModeChange={setEngineMode}
                    loading={loading}
                    offlineYourName={offlineYourName}
                    offlineComputerLabel={offlineComputerLabel}
                    onOfflineYourNameChange={setOfflineYourName}
                    onOfflineComputerLabelChange={setOfflineComputerLabel}
                    wrapperClassName="md:hidden mt-2 shrink-0 rounded-xl border border-header/25 bg-sheet/85 px-3 py-3 shadow-sm dark:border-white/10 dark:bg-cream/50"
                    intro="Choose a bot with Change below, then Online (server) or This device (offline match in-browser)."
                  />
                </div>
              </div>

              <PlayBotRightPanel
                selected={selected}
                onSelect={setSelected}
                onPlay={handlePlay}
                loading={loading}
                error={engineMode === "online" ? error : null}
                onOpenRules={() => setRulesOpen(true)}
                engineMode={engineMode}
                onEngineModeChange={setEngineMode}
                offlineYourName={offlineYourName}
                offlineComputerLabel={offlineComputerLabel}
                onOfflineYourNameChange={setOfflineYourName}
                onOfflineComputerLabelChange={setOfflineComputerLabel}
                playIdleText={playIdleLabel}
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

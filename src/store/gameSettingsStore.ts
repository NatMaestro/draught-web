import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "draught-game-settings";

type GameSettingsState = {
  /** Play subtle move sound (Web Audio). */
  soundEnabled: boolean;
  /**
   * Local 2P: rotate board so the active player’s pieces are at the bottom.
   * Ignored for AI games (you always play as P1 at the bottom).
   */
  rotateBoardForTurn: boolean;
  /**
   * When a piece is selected, highlight legal destination squares (rings + marker).
   * Off = moves still work; destinations are not shown.
   */
  showLegalMoveHighlights: boolean;
  setSoundEnabled: (v: boolean) => void;
  setRotateBoardForTurn: (v: boolean) => void;
  setShowLegalMoveHighlights: (v: boolean) => void;
};

export const useGameSettingsStore = create<GameSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      rotateBoardForTurn: true,
      showLegalMoveHighlights: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setRotateBoardForTurn: (rotateBoardForTurn) => set({ rotateBoardForTurn }),
      setShowLegalMoveHighlights: (showLegalMoveHighlights) =>
        set({ showLegalMoveHighlights }),
    }),
    { name: STORAGE_KEY },
  ),
);

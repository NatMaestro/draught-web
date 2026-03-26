import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      setMode: (mode) => set({ mode }),
      toggle: () =>
        set({ mode: get().mode === "light" ? "dark" : "light" }),
    }),
    {
      name: "draught-theme",
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
);

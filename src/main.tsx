import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  setAccessTokenRefreshedHandler,
  setRefreshFailedHandler,
} from "@/lib/api";
import { applyRootTheme } from "@/lib/themeDom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import "./index.css";
import App from "./App";

/**
 * Keep `dark` on <html> in sync with the persisted store.
 * Do not call applyRootTheme with pre-hydration getState() — that would strip the
 * class the inline index.html script set from localStorage before rehydration runs.
 */
useThemeStore.subscribe((state, prev) => {
  if (prev !== undefined && state.mode === prev.mode) return;
  applyRootTheme(state.mode);
});

/** Silent JWT refresh: keep Zustand + WebSocket in sync; logout if refresh token dies. */
setAccessTokenRefreshedHandler((access) => {
  useAuthStore.setState({ accessToken: access });
});
setRefreshFailedHandler(() => {
  void useAuthStore.getState().logout();
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

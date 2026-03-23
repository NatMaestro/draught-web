import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  setAccessTokenRefreshedHandler,
  setRefreshFailedHandler,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import "./index.css";
import App from "./App";

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

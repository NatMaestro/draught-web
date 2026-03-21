/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL (include `/api` if the backend is mounted there). */
  readonly VITE_API_BASE_URL?: string;
  /** Set `false` to force REST-only moves (matches `VITE_USE_GAME_WS` in env files). */
  readonly VITE_USE_GAME_WS?: string;
  readonly VITE_WS_BASE?: string;
  /** Optional Google Form URL for user feedback / issue reports (opens in new tab). */
  readonly VITE_FEEDBACK_FORM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

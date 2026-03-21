/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL (include `/api` if the backend is mounted there). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Environment — Vite injects `import.meta.env` at build time.
 * - Development: `.env.development` (e.g. proxy `/api` → local Django)
 * - Production: `.env.production` (hosted API URL)
 */
const raw = import.meta.env.VITE_API_BASE_URL?.trim();

/** Base URL for REST API (same contract as draught-fe `constants/config.ts`). */
export const API_BASE_URL =
  raw && raw.length > 0 ? raw : "/api";

/** Vite mode: `development` | `production` | custom. */
export const APP_MODE = import.meta.env.MODE;

export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

/** Google Form (or any HTTPS URL) for bug reports / feedback — empty hides the link. */
const feedbackRaw = import.meta.env.VITE_FEEDBACK_FORM_URL?.trim();
export const FEEDBACK_FORM_URL =
  feedbackRaw && feedbackRaw.length > 0 ? feedbackRaw : "";

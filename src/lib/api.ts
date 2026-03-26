import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "@/lib/config";

export const STORAGE_ACCESS = "draught_access_token";
export const STORAGE_REFRESH = "draught_refresh_token";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function readRefreshToken(): string | null {
  return readStorage(STORAGE_REFRESH);
}

let accessToken: string | null = null;

/** In-memory bearer used by the request interceptor. */
export function setApiToken(token: string | null) {
  accessToken = token;
}

/** Persist access token + update in-memory (used after login / refresh). */
export function persistAccessToken(token: string | null) {
  accessToken = token;
  writeStorage(STORAGE_ACCESS, token);
}

export function persistRefreshToken(token: string | null) {
  writeStorage(STORAGE_REFRESH, token);
}

/** Load access token from localStorage into memory (e.g. before first request). */
export function loadPersistedAccessIntoMemory(): string | null {
  const t = readStorage(STORAGE_ACCESS);
  accessToken = t;
  return t;
}

type RefreshFailedHandler = () => void;
type AccessRefreshedHandler = (access: string) => void;

let refreshFailedHandler: RefreshFailedHandler | null = null;
let accessRefreshedHandler: AccessRefreshedHandler | null = null;

/** Register in `main.tsx` to sync Zustand after silent refresh (e.g. WebSocket URL). */
export function setAccessTokenRefreshedHandler(
  handler: AccessRefreshedHandler | null,
) {
  accessRefreshedHandler = handler;
}

/** Register in `main.tsx` to logout when refresh token is invalid/expired. */
export function setRefreshFailedHandler(handler: RefreshFailedHandler | null) {
  refreshFailedHandler = handler;
}

/** Axios instance without auth interceptors — only for POST /auth/token/refresh/. */
const rawRefreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchange refresh JWT for a new access token. Single-flight: concurrent callers await one request.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = readRefreshToken();
  if (!refresh) {
    return Promise.resolve(null);
  }
  refreshInFlight = (async () => {
    try {
      const { data } = await rawRefreshClient.post<{ access: string }>(
        "/auth/token/refresh/",
        { refresh },
      );
      const newAccess = data.access;
      persistAccessToken(newAccess);
      accessRefreshedHandler?.(newAccess);
      return newAccess;
    } catch {
      persistAccessToken(null);
      persistRefreshToken(null);
      setApiToken(null);
      refreshFailedHandler?.();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  // Never send a stale/expired Bearer on login/register/refresh — JWTAuthentication
  // validates the header first and returns 401 before credentials in the body are used.
  // Axios `url` varies by version (e.g. `auth/login`, `/auth/login/`, or absolute); resolve fully.
  if (accessToken && !isAuthEndpointRequest(config)) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

/** Full path for this request (baseURL + url), stable across Axios URL shapes. */
function resolvedRequestPath(config: InternalAxiosRequestConfig): string {
  const base = String(config.baseURL ?? "");
  const rel = String(config.url ?? "");
  if (/^https?:\/\//i.test(rel)) {
    return rel;
  }
  const b = base.replace(/\/$/, "");
  const r = rel.replace(/^\//, "");
  const joined = r ? `${b}/${r}` : b;
  return joined.replace(/([^:])\/{2,}/g, "$1/");
}

function isAuthEndpointRequest(config: InternalAxiosRequestConfig): boolean {
  const path = resolvedRequestPath(config).split("?")[0].toLowerCase();
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/register") ||
    path.includes("/auth/token/refresh")
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error as {
      config?: InternalAxiosRequestConfig & { __retry?: boolean };
      response?: { status?: number };
    };
    const original = err.config;
    const status = err.response?.status;
    if (
      status !== 401 ||
      !original ||
      original.__retry ||
      isAuthEndpointRequest(original)
    ) {
      return Promise.reject(error);
    }

    const newAccess = await refreshAccessToken();
    if (!newAccess) {
      return Promise.reject(error);
    }

    original.__retry = true;
    original.headers = original.headers ?? {};
    original.headers.Authorization = `Bearer ${newAccess}`;
    return api(original as AxiosRequestConfig);
  },
);

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>("/auth/login/", { username, password }),
  register: (data: RegisterPayload) => api.post("/auth/register/", data),
};

/** Server-authoritative clock (GET game, move responses, WebSocket). */
export type ServerClockSnapshot = {
  p1_time_remaining_sec: number;
  p2_time_remaining_sec: number;
  turn_started_at: string | null;
  server_now: string;
  time_control_sec: number;
};

/** Move / ai-move response from Django `MoveView` / `AiMoveView`. */
export interface MoveResponse {
  board: number[][];
  current_turn: number;
  winner: number | null;
  status: string;
  captured: Array<{ row: number; col: number }>;
  /** Cell values (1–4) on the pre-move board for each `captured` square (trophy icons). */
  captured_piece_values?: number[];
  /** Present when backend supports server clocks. */
  p1_time_remaining_sec?: number;
  p2_time_remaining_sec?: number;
  turn_started_at?: string | null;
  server_now?: string;
  time_control_sec?: number;
  /** Ply count after this move (matches `moves.length` on GET game). */
  move_count?: number;
}

/** Single ply — replay may include `captured` squares (from `GET /games/:id/`). */
export type GameMoveApi = {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
  player?: number;
  captured?: Array<{ row: number; col: number }>;
};

/** Nested on GET /games/:id/ for online human vs human. */
export type GamePlayerPublic = {
  id: number;
  username: string;
};

/** Row from `GET /api/games/history/` (paginated `results`). */
export type GameHistoryItem = {
  id: string;
  status: string;
  current_turn: number;
  winner: number | string | null;
  is_ai_game: boolean;
  is_ranked: boolean;
  is_local_2p: boolean;
  created_at: string;
  finished_at: string | null;
  player_one: GamePlayerPublic | null;
  player_two: GamePlayerPublic | null;
  move_count: number;
};

export type GameChallenge = {
  id: string;
  from_user: GamePlayerPublic;
  to_user: GamePlayerPublic;
  rematch_game: string | null;
  status: string;
  created_at: string;
};

/** GET /games/:id/ — aligns with GameSerializer. */
export interface GameDetail {
  id: string;
  status: string;
  current_turn: number;
  board_state: number[][];
  /** Ordered moves for replay / move list (P1 and P2 alternate from index 0). */
  moves?: GameMoveApi[];
  is_ai_game: boolean;
  /** Same-device hot-seat (undo allowed with AI games). */
  is_local_2p?: boolean;
  ai_difficulty?: string;
  is_ranked?: boolean;
  /** Online PvP: `{ id, username }`; legacy may be a bare id. */
  player_one?: GamePlayerPublic | number | string | null;
  player_two?: GamePlayerPublic | number | string | null;
  winner?: number | string | null;
  created_at?: string;
  finished_at?: string | null;
  /** Undo allowed (AI / local guest games with at least one move). */
  can_undo?: boolean;
  /** Server clock (when supported). */
  p1_time_remaining_sec?: number;
  p2_time_remaining_sec?: number;
  turn_started_at?: string | null;
  server_now?: string;
  time_control_sec?: number;
  /** When false, no clocks or time loss. */
  use_clock?: boolean;
}

/** POST /games/:id/undo/ */
export interface UndoResponse {
  board: number[][];
  current_turn: number;
  winner: number | null;
  status: string;
  p1_captured_piece_values: number[];
  p2_captured_piece_values: number[];
  can_undo: boolean;
  p1_time_remaining_sec?: number;
  p2_time_remaining_sec?: number;
  turn_started_at?: string | null;
  server_now?: string;
  time_control_sec?: number;
}

export type CreateGameOptions = {
  /** Play vs AI (server-side opponent). */
  isAi?: boolean;
  aiDifficulty?: string;
  /** Same-device hot-seat — must create ACTIVE game (no second account). */
  isLocal2p?: boolean;
  /** Initial bank per player in seconds when `useClock` is true. */
  timeControlSec?: number;
  /** When false, server does not enforce clocks or time loss. */
  useClock?: boolean;
};

export const gamesApi = {
  create: (isAi?: boolean | CreateGameOptions, difficulty?: string) => {
    const opts: CreateGameOptions =
      typeof isAi === "object" && isAi !== null
        ? isAi
        : { isAi: Boolean(isAi), aiDifficulty: difficulty };
    const body: Record<string, unknown> = {
      ...(opts.isAi && {
        is_ai: true,
        ai_difficulty: opts.aiDifficulty ?? "medium",
      }),
      ...(opts.isLocal2p && { is_local_2p: true }),
    };
    if (typeof opts.useClock === "boolean") {
      body.use_clock = opts.useClock;
    }
    if (opts.timeControlSec != null && Number.isFinite(opts.timeControlSec)) {
      body.time_control_sec = Math.round(opts.timeControlSec);
    }
    return api.post<GameDetail>("/games/", body);
  },

  get: (id: string) => api.get<GameDetail>(`/games/${id}/`),

  history: () =>
    api.get<{ count?: number; results: GameHistoryItem[] }>("/games/history/"),

  move: (
    id: string,
    payload: {
      from_row: number;
      from_col: number;
      to_row: number;
      to_col: number;
    },
  ) => api.post<MoveResponse>(`/games/${id}/move/`, payload),

  /** AI turn (REST). Requires backend `POST /games/<id>/ai-move/`. */
  aiMove: (id: string) => api.post<MoveResponse>(`/games/${id}/ai-move/`),

  resign: (id: string) =>
    api.post<{ status: string; winner: number | null }>(`/games/${id}/resign/`),

  undo: (id: string) => api.post<UndoResponse>(`/games/${id}/undo/`),

  legalMoves: (id: string, row: number, col: number) =>
    api.get<{
      moves: Array<{
        to_row: number;
        to_col: number;
        captured?: Array<{ row: number; col: number }>;
      }>;
    }>(`/games/${id}/legal-moves/?row=${row}&col=${col}`),
};

export const challengesApi = {
  incoming: () =>
    api.get<{ count?: number; results: GameChallenge[] }>(
      "/games/challenges/incoming/",
    ),
  outgoing: () =>
    api.get<{ count?: number; results: GameChallenge[] }>(
      "/games/challenges/outgoing/",
    ),
  create: (to_user_id: number, rematch_game_id?: string) =>
    api.post<GameChallenge>("/games/challenges/", {
      to_user_id,
      ...(rematch_game_id ? { rematch_game_id } : {}),
    }),
  accept: (challengeId: string) =>
    api.post<{ game_id: string; game: GameDetail }>(
      `/games/challenges/${challengeId}/accept/`,
    ),
  decline: (challengeId: string) =>
    api.post<{ ok: boolean }>(`/games/challenges/${challengeId}/decline/`),
  cancel: (challengeId: string) =>
    api.post<{ ok: boolean }>(`/games/challenges/${challengeId}/cancel/`),
};

export type MatchmakingJoinOptions = {
  ranked?: boolean;
  timeControlSec?: number;
  useClock?: boolean;
};

export const matchmakingApi = {
  join: (ranked?: boolean, opts?: MatchmakingJoinOptions) =>
    api.post<{ status: "matched" | "queued"; game_id?: string }>(
      "/matchmaking/join/",
      {
        ranked: opts?.ranked ?? ranked ?? false,
        ...(typeof opts?.useClock === "boolean" && { use_clock: opts.useClock }),
        ...(opts?.timeControlSec != null &&
          Number.isFinite(opts.timeControlSec) && {
            time_control_sec: Math.round(opts.timeControlSec),
          }),
      },
    ),
  cancel: (ranked?: boolean) =>
    api.post<{ removed: boolean }>("/matchmaking/cancel/", {
      ranked: ranked ?? false,
    }),
  /** Poll after join returned `queued` — picks up game when an opponent is found. */
  ready: () =>
    api.get<{ status: "matched" | "waiting"; game_id?: string }>(
      "/matchmaking/ready/",
    ),
};

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  rating: number;
  games_played: number;
  games_won: number;
  created_at?: string;
  /** Present when backend supports social linking (`apps.users` profile). */
  facebook_linked?: boolean;
  tiktok_linked?: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  id: number;
  username: string;
  rating: number;
  games_played: number;
  games_won: number;
};

export type LeaderboardResponse = {
  count: number;
  results: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

export const usersApi = {
  profile: () => api.get<UserProfile>("/users/profile/"),
  /** GET /users/search/?q= — min 2 characters. */
  search: (q: string) =>
    api.get<GamePlayerPublic[]>("/users/search/", { params: { q } }),
  /** Public; auth optional (`you` when signed in). */
  leaderboard: (params?: { limit?: number; offset?: number; min_games?: number }) =>
    api.get<LeaderboardResponse>("/users/leaderboard/", { params }),
};

/** In-app + push notification row. */
export type SocialNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  read_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type FriendRequestItem = {
  id: string;
  from_user: GamePlayerPublic;
  to_user: GamePlayerPublic;
  status: string;
  created_at: string;
};

export type RecommendedMatchResponse = {
  opponent: (GamePlayerPublic & { rating: number }) | null;
  rating_gap: number;
  in_rating_band: boolean;
  head_to_head: { wins: number; losses: number; draws: number };
};

export const socialApi = {
  notifications: (unreadOnly?: boolean) =>
    api.get<{ count?: number; results: SocialNotification[] }>(
      "/social/notifications/",
      {
        params: unreadOnly ? { unread: "1" } : undefined,
      },
    ),
  unreadCount: () =>
    api.get<{ count: number }>("/social/notifications/unread-count/"),
  markNotificationsRead: (ids?: string[]) =>
    api.post<{ ok: boolean; marked: number | string }>(
      "/social/notifications/mark-read/",
      ids ? { ids } : {},
    ),
  friends: () => api.get<GamePlayerPublic[]>("/social/friends/"),
  /** Friend closest to your rating + H2H stats; `opponent` null if you have no friends yet. */
  recommendedMatch: (maxGap?: number) =>
    api.get<RecommendedMatchResponse>("/social/recommended-match/", {
      params: maxGap != null ? { max_gap: maxGap } : undefined,
    }),
  friendRequestsIncoming: () =>
    api.get<{ count?: number; results: FriendRequestItem[] }>(
      "/social/friends/requests/incoming/",
    ),
  friendRequestsOutgoing: () =>
    api.get<{ count?: number; results: FriendRequestItem[] }>(
      "/social/friends/requests/outgoing/",
    ),
  sendFriendRequest: (to_user_id: number) =>
    api.post<FriendRequestItem>("/social/friends/requests/", { to_user_id }),
  acceptFriendRequest: (requestId: string) =>
    api.post<{ ok: boolean }>(
      `/social/friends/requests/${requestId}/accept/`,
    ),
  declineFriendRequest: (requestId: string) =>
    api.post<{ ok: boolean }>(
      `/social/friends/requests/${requestId}/decline/`,
    ),
  cancelFriendRequest: (requestId: string) =>
    api.post<{ ok: boolean }>(
      `/social/friends/requests/${requestId}/cancel/`,
    ),
  recentOpponents: () =>
    api.get<GamePlayerPublic[]>("/social/opponents/recent/"),
  vapidPublicKey: () =>
    api.get<{ enabled: boolean; public_key: string | null }>(
      "/social/push/vapid-public-key/",
    ),
  pushSubscribe: (body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) => api.post<{ ok: boolean }>("/social/push/subscribe/", body),
  pushUnsubscribe: (endpoint: string) =>
    api.post<{ ok: boolean; removed: number }>(
      "/social/push/unsubscribe/",
      { endpoint },
    ),
  linkFacebook: (access_token: string) =>
    api.post<{ ok: boolean; facebook_linked: boolean }>(
      "/social/link/facebook/",
      { access_token },
    ),
  unlinkFacebook: () =>
    api.post<{ ok: boolean; facebook_linked: boolean }>(
      "/social/unlink/facebook/",
    ),
  facebookFriendSuggestions: (access_token: string) =>
    api.post<{
      results: GamePlayerPublic[];
      hint: string;
    }>("/social/suggestions/facebook/", { access_token }),
  tiktokConfig: () =>
    api.get<{
      configured: boolean;
      client_key: string | null;
      redirect_uri: string | null;
      authorize_url_template: string;
    }>("/social/tiktok/config/"),
  linkTikTok: (body: { code: string; redirect_uri: string }) =>
    api.post<{ ok: boolean; tiktok_linked: boolean }>(
      "/social/link/tiktok/",
      body,
    ),
  unlinkTikTok: () =>
    api.post<{ ok: boolean; tiktok_linked: boolean }>(
      "/social/unlink/tiktok/",
    ),
};

export default api;

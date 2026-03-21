import axios, { type AxiosInstance } from "axios";
import { API_BASE_URL } from "@/lib/config";

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;

export function setApiToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

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

/** Move / ai-move response from Django `MoveView` / `AiMoveView`. */
export interface MoveResponse {
  board: number[][];
  current_turn: number;
  winner: number | null;
  status: string;
  captured: Array<{ row: number; col: number }>;
  /** Cell values (1–4) on the pre-move board for each `captured` square (trophy icons). */
  captured_piece_values?: number[];
}

/** Single ply as stored by Django `Move` (one row per human/AI move). */
export type GameMoveApi = {
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
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
  player_one?: number | string | null;
  player_two?: number | string | null;
  winner?: number | string | null;
  created_at?: string;
  finished_at?: string | null;
  /** Undo allowed (AI / local guest games with at least one move). */
  can_undo?: boolean;
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
}

export type CreateGameOptions = {
  /** Play vs AI (server-side opponent). */
  isAi?: boolean;
  aiDifficulty?: string;
  /** Same-device hot-seat — must create ACTIVE game (no second account). */
  isLocal2p?: boolean;
};

export const gamesApi = {
  create: (isAi?: boolean | CreateGameOptions, difficulty?: string) => {
    const opts: CreateGameOptions =
      typeof isAi === "object" && isAi !== null
        ? isAi
        : { isAi: Boolean(isAi), aiDifficulty: difficulty };
    return api.post<GameDetail>("/games/", {
      ...(opts.isAi && {
        is_ai: true,
        ai_difficulty: opts.aiDifficulty ?? "medium",
      }),
      ...(opts.isLocal2p && { is_local_2p: true }),
    });
  },

  get: (id: string) => api.get<GameDetail>(`/games/${id}/`),

  history: () => api.get<{ results: GameDetail[] }>("/games/history/"),

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

export const matchmakingApi = {
  join: (ranked?: boolean) =>
    api.post<{ status: "matched" | "queued"; game_id?: string }>(
      "/matchmaking/join/",
      { ranked: ranked ?? false },
    ),
  cancel: () => api.post("/matchmaking/cancel/"),
};

export default api;

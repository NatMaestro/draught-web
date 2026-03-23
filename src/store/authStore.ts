import { create } from "zustand";
import {
  authApi,
  loadPersistedAccessIntoMemory,
  persistAccessToken,
  persistRefreshToken,
  usersApi,
} from "@/lib/api";
import { clearResumeSnapshot } from "@/lib/resumeGameStorage";
import { clearGuestPlayAcknowledged } from "@/lib/playSession";

const USERNAME_KEY = "draught_username";
const USER_ID_KEY = "draught_user_id";

interface AuthState {
  accessToken: string | null;
  username: string | null;
  /** Set from GET /users/profile/ — used to detect P1 vs P2 in online games. */
  userId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadStoredToken: () => Promise<void>;
}

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

function readUserId(): number | null {
  try {
    const raw = localStorage.getItem(USER_ID_KEY);
    if (raw == null) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeUserId(id: number | null) {
  try {
    if (id == null) localStorage.removeItem(USER_ID_KEY);
    else localStorage.setItem(USER_ID_KEY, String(id));
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  username: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    try {
      const { data } = await authApi.login(username, password);
      persistAccessToken(data.access);
      persistRefreshToken(data.refresh);
      clearGuestPlayAcknowledged();
      try {
        const { data: prof } = await usersApi.profile();
        writeStorage(USERNAME_KEY, prof.username);
        writeUserId(prof.id);
        set({
          accessToken: data.access,
          username: prof.username,
          userId: prof.id,
          isAuthenticated: true,
        });
      } catch {
        writeStorage(USERNAME_KEY, username);
        writeUserId(null);
        set({
          accessToken: data.access,
          username,
          userId: null,
          isAuthenticated: true,
        });
      }
      return { ok: true };
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      const msg = err.response?.data?.detail ?? "Login failed";
      return {
        ok: false,
        error: typeof msg === "string" ? msg : JSON.stringify(msg),
      };
    }
  },

  register: async (data) => {
    try {
      await authApi.register(data);
      return get().login(data.username, data.password);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, string[]> } };
      const d = err.response?.data;
      const msg = d
        ? Object.entries(d)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join("; ")
        : "Registration failed";
      return { ok: false, error: msg };
    }
  },

  logout: async () => {
    persistAccessToken(null);
    persistRefreshToken(null);
    writeStorage(USERNAME_KEY, null);
    writeUserId(null);
    clearResumeSnapshot();
    clearGuestPlayAcknowledged();
    set({
      accessToken: null,
      username: null,
      userId: null,
      isAuthenticated: false,
    });
  },

  loadStoredToken: async () => {
    try {
      const token = loadPersistedAccessIntoMemory();
      const storedUsername = readStorage(USERNAME_KEY);
      const storedUserId = readUserId();
      if (token) {
        try {
          const { data: prof } = await usersApi.profile();
          writeStorage(USERNAME_KEY, prof.username);
          writeUserId(prof.id);
          set({
            accessToken: token,
            username: prof.username,
            userId: prof.id,
            isAuthenticated: true,
          });
        } catch {
          /** If refresh failed, interceptor cleared tokens — don’t stay “logged in”. */
          const still = loadPersistedAccessIntoMemory();
          if (!still) {
            set({
              accessToken: null,
              username: null,
              userId: null,
              isAuthenticated: false,
            });
            return;
          }
          set({
            accessToken: still,
            username: storedUsername,
            userId: storedUserId,
            isAuthenticated: true,
          });
        }
      } else {
        set({ isAuthenticated: false, username: null, userId: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));

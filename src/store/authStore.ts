import { create } from "zustand";
import { authApi, setApiToken } from "@/lib/api";

const TOKEN_KEY = "draught_access_token";
const USERNAME_KEY = "draught_username";

interface AuthState {
  accessToken: string | null;
  username: string | null;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  username: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    try {
      const { data } = await authApi.login(username, password);
      writeStorage(TOKEN_KEY, data.access);
      writeStorage(USERNAME_KEY, username);
      setApiToken(data.access);
      set({ accessToken: data.access, username, isAuthenticated: true });
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
    writeStorage(TOKEN_KEY, null);
    writeStorage(USERNAME_KEY, null);
    setApiToken(null);
    set({ accessToken: null, username: null, isAuthenticated: false });
  },

  loadStoredToken: async () => {
    try {
      const token = readStorage(TOKEN_KEY);
      const storedUsername = readStorage(USERNAME_KEY);
      if (token) {
        setApiToken(token);
        set({
          accessToken: token,
          username: storedUsername,
          isAuthenticated: true,
        });
      } else {
        set({ isAuthenticated: false, username: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));

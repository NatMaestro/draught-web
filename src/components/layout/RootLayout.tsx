import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSocialWebSocket } from "@/hooks/useSocialWebSocket";
import { useNavigateWhenChallengeAccepted } from "@/hooks/useNavigateWhenChallengeAccepted";
import { useAuthStore } from "@/store/authStore";

/** Loads JWT from storage. Must wrap routes so hooks run inside the router context. */
export function RootLayout() {
  const loadStoredToken = useAuthStore((s) => s.loadStoredToken);
  useSocialWebSocket();
  useNavigateWhenChallengeAccepted();
  useEffect(() => {
    void loadStoredToken();
  }, [loadStoredToken]);
  return <Outlet />;
}

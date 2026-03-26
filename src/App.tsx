import { useEffect } from "react";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { useSocialWebSocket } from "@/hooks/useSocialWebSocket";
import { useAuthStore } from "@/store/authStore";
import { AppShell } from "@/components/layout/AppShell";
import { SplashPage } from "@/pages/SplashPage";
import { HomePage } from "@/pages/HomePage";
import { PlayGamePage } from "@/pages/PlayGamePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { GetStartedPage } from "@/pages/GetStartedPage";
import { PuzzlePage } from "@/pages/PuzzlePage";
import { TrainPage } from "@/pages/TrainPage";
import { MorePage } from "@/pages/MorePage";
import { PlayMatchmakingPage } from "@/pages/PlayMatchmakingPage";
import { PlayFriendsPage } from "@/pages/PlayFriendsPage";
import { GamePlayPage } from "@/pages/GamePlayPage";
import { PlayLocalPage } from "@/pages/PlayLocalPage";
import { PlayAIPage } from "@/pages/PlayAIPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { GameReviewPage } from "@/pages/GameReviewPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { TournamentPage } from "@/pages/TournamentPage";

/** Loads JWT from storage. Must wrap routes so hooks run inside the router context. */
function RootLayout() {
  const loadStoredToken = useAuthStore((s) => s.loadStoredToken);
  useSocialWebSocket();
  useEffect(() => {
    void loadStoredToken();
  }, [loadStoredToken]);
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <SplashPage /> },
      {
        element: <AppShell />,
        children: [
          { path: "home", element: <HomePage /> },
          { path: "home/profile", element: <ProfilePage /> },
          { path: "puzzle", element: <PuzzlePage /> },
          { path: "train", element: <TrainPage /> },
          { path: "more", element: <MorePage /> },
          { path: "leaderboard", element: <LeaderboardPage /> },
          { path: "play/friends", element: <PlayFriendsPage /> },
          { path: "play/tournament", element: <TournamentPage /> },
        ],
      },
      { path: "friends", element: <Navigate to="/play/friends" replace /> },
      { path: "play", element: <PlayGamePage /> },
      { path: "play/local", element: <PlayLocalPage /> },
      { path: "play/matchmaking", element: <PlayMatchmakingPage /> },
      { path: "play/ai", element: <PlayAIPage /> },
      { path: "play/game/:gameId", element: <GamePlayPage /> },
      { path: "play/review/:gameId", element: <GameReviewPage /> },
      { path: "auth/login", element: <LoginPage /> },
      { path: "auth/register", element: <RegisterPage /> },
      { path: "auth/get-started", element: <GetStartedPage /> },
      { path: "*", element: <Navigate to="/home" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

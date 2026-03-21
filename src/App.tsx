import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import { PlaceholderPlayPage } from "@/pages/PlaceholderPlayPage";
import { GamePlayPage } from "@/pages/GamePlayPage";
import { PlayLocalPage } from "@/pages/PlayLocalPage";
import { PlayAIPage } from "@/pages/PlayAIPage";

function TokenBootstrap() {
  const loadStoredToken = useAuthStore((s) => s.loadStoredToken);
  useEffect(() => {
    void loadStoredToken();
  }, [loadStoredToken]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TokenBootstrap />
      <Routes>
        <Route path="/" element={<SplashPage />} />
        <Route element={<AppShell />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/puzzle" element={<PuzzlePage />} />
          <Route path="/train" element={<TrainPage />} />
          <Route path="/more" element={<MorePage />} />
        </Route>
        <Route path="/play" element={<PlayGamePage />} />
        <Route path="/play/local" element={<PlayLocalPage />} />
        <Route path="/play/matchmaking" element={<PlaceholderPlayPage />} />
        <Route path="/play/ai" element={<PlayAIPage />} />
        <Route path="/play/tournament" element={<PlaceholderPlayPage />} />
        <Route path="/play/game/:gameId" element={<GamePlayPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/get-started" element={<GetStartedPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

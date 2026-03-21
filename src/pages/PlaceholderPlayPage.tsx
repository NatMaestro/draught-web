import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const titles: Record<string, string> = {
  "/play/local": "Local game",
  "/play/matchmaking": "Play with a friend",
  "/play/ai": "Play with a bot",
  "/play/tournament": "Tournament",
};

export function PlaceholderPlayPage() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? "Play";

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-cream px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto w-full max-w-md flex-1">
        <Link to="/play" className="mb-6 inline-block text-text hover:underline">
          ← Back
        </Link>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-3xl text-text"
        >
          {title}
        </motion.h1>
        <p className="mt-3 text-muted">
          This flow will connect to the same Django API as the Expo app. Wire
          your game routes here next.
        </p>
        <Link
          to="/home"
          className="mt-8 inline-block rounded-full px-6 py-3 font-semibold text-text shadow-sm"
          style={{ backgroundColor: "#EFCA83" }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}

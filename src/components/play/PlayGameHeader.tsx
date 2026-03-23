import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function PlayGameHeader() {
  return (
    <div className="w-full overflow-visible">
      <header className="w-full overflow-hidden bg-header">
        <div className="pb-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="relative flex min-h-[44px] items-center justify-between">
            <Link
              to="/home"
              className="z-[2] p-1 text-text transition hover:opacity-80"
              aria-label="Go back"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <motion.h1
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-center text-xl font-bold tracking-wide text-text"
              style={{
                textShadow: "0 2px 2px rgba(0,0,0,0.25)",
              }}
            >
              Play a Game
            </motion.h1>
            <span className="w-[34px]" aria-hidden />
          </div>
        </div>
      </header>
      <div className="-mt-px flex w-full justify-center">
        <div className="h-0 w-0 border-x-[32px] border-t-[22px] border-x-transparent border-t-cream" />
      </div>
    </div>
  );
}

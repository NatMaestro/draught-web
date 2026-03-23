import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";
import { useAuthStore } from "@/store/authStore";

export function MorePage() {
  const { isAuthenticated, username, logout } = useAuthStore();

  return (
    <div className="safe-x pb-28 pt-[max(1.5rem,env(safe-area-inset-top))] md:pb-8 md:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl space-y-4"
      >
        <h1 className="font-display text-3xl text-text">More</h1>
        <div className="rounded-3xl border border-header/15 bg-white/50 p-6 shadow-card backdrop-blur-sm">
          {isAuthenticated ? (
            <>
              <p className="font-semibold text-text">Signed in as {username}</p>
              <button
                type="button"
                onClick={() => void logout()}
                className="mt-4 rounded-xl bg-text px-4 py-3 text-sm font-semibold text-cream"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/auth/login"
                className="rounded-xl px-5 py-3 text-center font-semibold text-text"
                style={{ backgroundColor: "#EFCA83" }}
              >
                Log in
              </Link>
              <Link
                to="/auth/register"
                className="rounded-xl border border-header/30 bg-sheet px-5 py-3 text-center font-semibold text-text"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <FeedbackLink className="font-medium text-text underline-offset-2 hover:underline">
            Report a bug or send feedback
          </FeedbackLink>
          <p>Draught web — mobile-first, desktop-enhanced.</p>
        </div>
      </motion.div>
    </div>
  );
}

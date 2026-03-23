import { Link } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Friends-only games (invites, friend list, social login) — placeholder until backend + UX ship.
 */
export function PlayFriendsPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-cream bg-mesh-radial safe-x pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md flex-1">
        <Link
          to="/play"
          className="mb-6 inline-block text-sm font-semibold text-text hover:underline"
        >
          ← Play menu
        </Link>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-3xl text-text"
        >
          Play with friends
        </motion.h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This will be for games with people you&apos;ve added in Draught —
          friend requests, your friends list, or linked accounts (e.g. Facebook
          if we enable it). You&apos;ll pick a time control and send an invite,
          not random matchmaking.
        </p>
        <p className="mt-4 rounded-xl border border-header/20 bg-sheet/70 px-4 py-3 text-sm text-text/90">
          For now, use{" "}
          <Link to="/play" className="font-semibold underline">
            Start
          </Link>{" "}
          on the play menu for <strong>online matchmaking</strong>, or{" "}
          <Link to="/play/local" className="font-semibold underline">
            Play in person
          </Link>{" "}
          on one device.
        </p>
        <Link
          to="/home"
          className="mt-8 inline-block rounded-full px-6 py-3 text-sm font-semibold text-text shadow-sm"
          style={{ backgroundColor: "#EFCA83" }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}

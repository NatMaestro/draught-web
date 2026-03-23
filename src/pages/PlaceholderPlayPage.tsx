import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMemo } from "react";

const COPY: Record<
  string,
  { title: string; body: string }
> = {
  "/play/tournament": {
    title: "Tournaments",
    body: "Bracket-style events and scheduled rounds are coming soon. Your move clock from the play menu will apply here once tournaments go live.",
  },
};

export function PlaceholderPlayPage() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const minutes = useMemo(() => {
    const m = searchParams.get("minutes");
    const n = m ? Number.parseInt(m, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const { title, body } = COPY[pathname] ?? {
    title: "Coming soon",
    body: "This play mode is not wired up yet.",
  };

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-cream bg-mesh-radial px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto w-full max-w-md flex-1">
        <Link to="/play" className="mb-6 inline-block text-sm text-text hover:underline">
          ← Play menu
        </Link>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-3xl text-text"
        >
          {title}
        </motion.h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
        {minutes != null ? (
          <p className="mt-3 rounded-xl border border-header/15 bg-sheet/70 px-3 py-2 text-xs text-muted">
            Move clock from play menu:{" "}
            <strong className="text-text">{minutes} min</strong>
          </p>
        ) : null}
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

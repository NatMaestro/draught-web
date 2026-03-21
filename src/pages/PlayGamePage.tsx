import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PlayGameHeader } from "@/components/play/PlayGameHeader";
import { SelectTimeModal } from "@/components/play/SelectTimeModal";

function SecondaryButton({
  label,
  to,
}: {
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center rounded-[20px] bg-sheet px-[18px] py-4 text-base font-semibold text-text shadow-sm transition hover:bg-sheet/90 active:scale-[0.99]"
    >
      {label}
    </Link>
  );
}

export function PlayGamePage() {
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const [headerBottomPx, setHeaderBottomPx] = useState(0);
  const [minutes, setMinutes] = useState(10);
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  useLayoutEffect(() => {
    const el = headerWrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setHeaderBottomPx(r.top + r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-cream pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: "#F0EADA" }}
    >
      <div ref={headerWrapRef}>
        <PlayGameHeader />
      </div>

      <div className="flex w-full items-center justify-center bg-cream px-4 pt-1">
        <motion.img
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          src="/play-a-game-logo.png"
          alt=""
          className="h-[140px] w-full max-w-[300px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-4">
        <motion.div whileTap={{ scale: 0.99 }}>
          <Link
            to="/play/local"
            className="flex items-center justify-center rounded-[28px] py-4 text-lg font-bold text-text shadow-md transition hover:opacity-95"
            style={{ backgroundColor: "#D8A477" }}
          >
            Start Game
          </Link>
        </motion.div>

        <div className="overflow-hidden rounded-[20px]">
          <button
            type="button"
            onClick={() => setTimeModalOpen(true)}
            className="flex w-full flex-row items-center justify-center gap-2 rounded-[20px] bg-sheet px-[18px] py-4 text-base font-semibold text-text shadow-sm transition hover:bg-sheet/90"
            aria-expanded={timeModalOpen}
            aria-haspopup="dialog"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>{minutes} min</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {timeModalOpen ? (
                <path d="M6 15l6-6 6 6" />
              ) : (
                <path d="M6 9l6 6 6-6" />
              )}
            </svg>
          </button>
        </div>

        <SecondaryButton label="Play with a Friend" to="/play/matchmaking" />
        <SecondaryButton label="Play with a Bot" to="/play/ai" />
        <SecondaryButton label="Play a Tournament" to="/play/tournament" />
      </div>

      <SelectTimeModal
        visible={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        selectedMinutes={minutes}
        onSelectMinutes={setMinutes}
        headerBottomOffsetPx={headerBottomPx}
      />
    </div>
  );
}

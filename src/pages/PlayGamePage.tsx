import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { PlayGameHeader } from "@/components/play/PlayGameHeader";
import { SelectTimeModal } from "@/components/play/SelectTimeModal";
import { PlayEntryAuthModal } from "@/components/play/PlayEntryAuthModal";
import {
  setGuestPlayAcknowledged,
  hasGuestPlayAcknowledged,
} from "@/lib/playSession";
import { safeReturnTo } from "@/lib/deepLink";
import { PlayMenuRow } from "@/components/play/PlayMenuRow";

export function PlayGamePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [searchParams] = useSearchParams();
  const authReturnPath = useMemo(() => {
    const r = searchParams.get("returnTo");
    if (r == null || r === "") return "/play";
    return safeReturnTo(r);
  }, [searchParams]);
  const headerWrapRef = useRef<HTMLDivElement>(null);
  const [headerBottomPx, setHeaderBottomPx] = useState(0);
  const [minutes, setMinutes] = useState(10);
  /** When false, games are created without clocks (untimed). */
  const [useClock, setUseClock] = useState(true);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [guestPlayAck, setGuestPlayAck] = useState(hasGuestPlayAcknowledged);

  useEffect(() => {
    if (isAuthenticated) setGuestPlayAck(true);
  }, [isAuthenticated]);

  useEffect(() => {
    const m = searchParams.get("minutes");
    if (m != null && m !== "") {
      const n = Number.parseInt(m, 10);
      if (Number.isFinite(n) && n > 0 && n <= 120) setMinutes(n);
    }
    if (searchParams.get("clock") === "off") {
      setUseClock(false);
    } else if (m != null && m !== "") {
      setUseClock(true);
    }
  }, [searchParams]);

  const showPlayEntryGate =
    !authLoading && !isAuthenticated && !guestPlayAck;

  const timeQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (useClock) {
      p.set("minutes", String(minutes));
    } else {
      p.set("clock", "off");
    }
    return p.toString();
  }, [minutes, useClock]);

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
      className="relative flex min-h-[100dvh] flex-col bg-cream safe-x pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
      style={{ backgroundColor: "#F0EADA" }}
    >
      <PlayEntryAuthModal
        open={showPlayEntryGate}
        returnToPath={authReturnPath}
        onPlayAsGuest={() => {
          setGuestPlayAcknowledged();
          setGuestPlayAck(true);
        }}
      />

      <div
        ref={headerWrapRef}
        className={showPlayEntryGate ? "pointer-events-none blur-[2px]" : ""}
      >
        <PlayGameHeader />
      </div>

      <div
        className={`flex w-full items-center justify-center bg-cream px-4 pt-1 ${showPlayEntryGate ? "pointer-events-none blur-[2px]" : ""}`}
      >
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

      <div
        className={`flex flex-1 flex-col gap-3 px-5 pb-6 pt-4 ${showPlayEntryGate ? "pointer-events-none blur-[2px]" : ""}`}
      >
        <p className="text-center text-xs leading-relaxed text-muted">
          Choose how much time each player has <strong className="font-semibold text-text/90">per turn</strong>{" "}
          (the full amount resets after each move; one multi-capture chain counts as one turn). Run out on your turn
          and you lose. Same setting applies to online, friends, and tournaments; for{" "}
          <strong className="font-semibold text-text/90">in-person</strong> it&apos;s a reminder only on this device.
        </p>

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
            <span>
              {useClock ? (
                <>
                  {minutes} min{" "}
                  <span className="font-normal text-muted">per turn</span>
                </>
              ) : (
                <span className="font-normal text-muted">No time limit</span>
              )}
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {timeModalOpen ? (
                <path d="M6 15l6-6 6 6" />
              ) : (
                <path d="M6 9l6 6 6-6" />
              )}
            </svg>
          </button>
        </div>

        <motion.div whileTap={{ scale: 0.99 }}>
          <Link
            to={`/play/matchmaking?${timeQuery}`}
            className="flex flex-col items-center justify-center rounded-[28px] py-4 text-lg font-bold text-text shadow-md transition hover:opacity-95"
            style={{ backgroundColor: "#D8A477" }}
          >
            Start
            <span className="mt-0.5 text-xs font-semibold text-text/80">
              Play online — find an opponent
            </span>
          </Link>
        </motion.div>

        <div className="mt-2 space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            More ways to play
          </p>
          <PlayMenuRow
            to="/play/friends"
            title="Play with friends"
            description="Invites, friend list, or linked accounts — challenge people you know."
          />
          <PlayMenuRow
            to={`/play/local?${timeQuery}`}
            title="Play in person"
            description="Same phone or tablet — pass-and-play, two players on one device."
          />
          <PlayMenuRow
            to={`/play/ai?${timeQuery}`}
            title="Play with a bot"
            description="Practice against AI at your pace."
          />
          <PlayMenuRow
            to={`/play/tournament?${timeQuery}`}
            title="Tournaments"
            description="Bracket events — coming soon."
          />
        </div>
      </div>

      <SelectTimeModal
        visible={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        selectedMinutes={minutes}
        useClock={useClock}
        onSelectMinutes={(m) => {
          setMinutes(m);
          setUseClock(true);
        }}
        onSelectNoTimeLimit={() => {
          setUseClock(false);
        }}
        headerBottomOffsetPx={headerBottomPx}
      />
    </div>
  );
}

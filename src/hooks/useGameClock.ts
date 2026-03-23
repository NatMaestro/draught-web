import { useEffect, useMemo, useRef, useState } from "react";
import type { ServerClockSnapshot } from "@/lib/api";

function clampMinutes(m: number): number {
  if (!Number.isFinite(m) || m < 1) return 10;
  return Math.min(120, Math.max(1, Math.floor(m)));
}

/**
 * Parse clock fields from API / WebSocket payloads (snake_case from Django).
 */
export function parseClockSnapshot(raw: unknown): ServerClockSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.use_clock === false) return null;
  const p1 = o.p1_time_remaining_sec;
  const p2 = o.p2_time_remaining_sec;
  const sn = o.server_now;
  if (typeof p1 !== "number" || typeof p2 !== "number") return null;
  if (typeof sn !== "string" || !sn) return null;
  const ts = o.turn_started_at;
  const tc = o.time_control_sec;
  return {
    p1_time_remaining_sec: p1,
    p2_time_remaining_sec: p2,
    turn_started_at:
      ts === null || typeof ts === "string" ? (ts as string | null) : null,
    server_now: sn,
    time_control_sec:
      typeof tc === "number" && Number.isFinite(tc) && tc > 0 ? tc : 600,
  };
}

/**
 * Fischer-style bank: server stores remaining at turn start + `turn_started_at`.
 * Clients sync using `server_now` offset so both players see the same countdown.
 *
 * @param activeClockTurn — **Server-confirmed** turn (lags optimistic `currentTurn` while a move
 *   is in flight). Pass `confirmedTurnForFlip` from `useGamePlay` so the active timer switches
 *   only after the move REST/WebSocket response updates clock + turn.
 * @param movePending — While true (e.g. `busy`), freeze displayed times so the clock does not tick
 *   during the in-flight request; new times apply when the response updates `serverClock`.
 */
export function useGameClock(
  gameId: string | undefined,
  clientMinutesFallback: number,
  activeClockTurn: number,
  status: string,
  gameOver: boolean,
  serverClock: ServerClockSnapshot | null,
  movePending = false,
  /** When false (untimed game), skip countdown logic. */
  clockEnabled = true,
) {
  const initialSec = clampMinutes(clientMinutesFallback) * 60;
  const [p1Local, setP1Local] = useState(initialSec);
  const [p2Local, setP2Local] = useState(initialSec);
  const turnRef = useRef(activeClockTurn);
  turnRef.current = activeClockTurn;

  const offsetMsRef = useRef(0);
  useEffect(() => {
    if (!serverClock?.server_now) return;
    const t = Date.parse(serverClock.server_now);
    if (Number.isFinite(t)) {
      offsetMsRef.current = t - Date.now();
    }
  }, [
    serverClock?.server_now,
    serverClock?.p1_time_remaining_sec,
    serverClock?.p2_time_remaining_sec,
    gameId,
  ]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (gameOver || status !== "active") return;
    const id = window.setInterval(() => setTick((x) => x + 1), 250);
    return () => window.clearInterval(id);
  }, [gameOver, status, gameId]);

  useEffect(() => {
    setP1Local(initialSec);
    setP2Local(initialSec);
  }, [gameId, initialSec]);

  useEffect(() => {
    if (serverClock) return;
    if (gameOver || status !== "active") return;
    const id = window.setInterval(() => {
      const t = turnRef.current;
      if (t === 2) {
        setP2Local((s) => Math.max(0, s - 1));
      } else {
        setP1Local((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [serverClock, gameOver, status, gameId]);

  /** Freeze display while waiting for move response (no phantom tick during RTT). */
  const lastPendingRef = useRef(false);
  const frozenDisplayRef = useRef<{
    p1Seconds: number;
    p2Seconds: number;
  } | null>(null);

  return useMemo((): { p1Seconds: number; p2Seconds: number } => {
    if (!clockEnabled) {
      return { p1Seconds: 0, p2Seconds: 0 };
    }
    const compute = (): { p1Seconds: number; p2Seconds: number } => {
      if (serverClock) {
        const p1 = serverClock.p1_time_remaining_sec;
        const p2 = serverClock.p2_time_remaining_sec;
        const turnStart = serverClock.turn_started_at
          ? Date.parse(serverClock.turn_started_at)
          : NaN;
        const serverNow = Date.now() + offsetMsRef.current;
        let elapsed = 0;
        if (
          Number.isFinite(turnStart) &&
          status === "active" &&
          !gameOver &&
          serverClock.turn_started_at
        ) {
          elapsed = Math.max(0, (serverNow - turnStart) / 1000);
        }
        const ct = activeClockTurn === 2 ? 2 : 1;
        if (ct === 1) {
          return {
            p1Seconds: Math.max(0, p1 - elapsed),
            p2Seconds: Math.max(0, p2),
          };
        }
        return {
          p1Seconds: Math.max(0, p1),
          p2Seconds: Math.max(0, p2 - elapsed),
        };
      }
      return { p1Seconds: p1Local, p2Seconds: p2Local };
    };

    const base = compute();

    if (movePending && serverClock) {
      if (!lastPendingRef.current) {
        frozenDisplayRef.current = {
          p1Seconds: base.p1Seconds,
          p2Seconds: base.p2Seconds,
        };
      }
      lastPendingRef.current = true;
      const fr = frozenDisplayRef.current;
      return fr
        ? { p1Seconds: fr.p1Seconds, p2Seconds: fr.p2Seconds }
        : base;
    }

    lastPendingRef.current = false;
    frozenDisplayRef.current = null;
    return base;
  }, [
    serverClock,
    activeClockTurn,
    gameOver,
    status,
    tick,
    p1Local,
    p2Local,
    movePending,
    clockEnabled,
  ]);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

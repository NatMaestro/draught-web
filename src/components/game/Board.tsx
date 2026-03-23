import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Piece } from "@/components/game/Piece";
import type { LegalDestination } from "@/lib/optimisticBoard";
import {
  DEFAULT_BOARD_ROTATION_MS,
  BOARD_ROTATION_MS_MAX,
  BOARD_ROTATION_MS_MIN,
} from "@/lib/boardUtils";

const SIZE = 10;

const DRAG_THRESHOLD_PX = 10;

export type BoardProps = {
  board: number[][];
  flip: boolean;
  currentTurn: number;
  selectedPiece: [number, number] | null;
  possibleMoves: LegalDestination[];
  /** When false, legal destinations are not highlighted (moves still work). */
  showMoveHighlights?: boolean;
  onSquareClick: (row: number, col: number) => void;
  /** Pointer drag: complete a move (same validation as tap-to-move). */
  onDragMove?: (from: [number, number], to: [number, number]) => void;
  /** Called when a drag passes the threshold — use to select the piece + load legal moves (highlights). */
  onDragPieceSelect?: (row: number, col: number) => void;
  /** Hint: highlight suggested destination square. */
  hintDestination?: [number, number] | null;
  /** AI games: last square the opponent (bot) moved to — stays until the human moves. */
  botLastMoveTo?: [number, number] | null;
  disabled?: boolean;
  /**
   * When false, pieces are not draggable and taps do nothing (e.g. online — not your turn).
   * Local 2P should stay true so both sides use the same device on their turn.
   */
  canInteract?: boolean;
  /** 180° rotation duration (ms); from measured API/WebSocket latency in local 2P. */
  rotationDurationMs?: number;
};

/**
 * Board flip: rotate(180deg); natural row/col grid.
 * Local 2P + “rotate for turn”: spin duration comes from last move round-trip (clamped).
 */
export const BOARD_ROTATION_MS = DEFAULT_BOARD_ROTATION_MS;
const ROTATION_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

function clientToLogical(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  flip: boolean,
): { row: number; col: number } | null {
  let x = clientX - boardRect.left;
  let y = clientY - boardRect.top;
  // Inverse of 180° rotation around centre → map screen coords to unrotated grid space
  if (flip) {
    x = boardRect.width - x;
    y = boardRect.height - y;
  }
  if (x < 0 || y < 0 || x >= boardRect.width || y >= boardRect.height) {
    return null;
  }
  const dc = Math.min(
    SIZE - 1,
    Math.floor((x / boardRect.width) * SIZE),
  );
  const dr = Math.min(
    SIZE - 1,
    Math.floor((y / boardRect.height) * SIZE),
  );
  return { row: dr, col: dc };
}

function isOwnPiece(cell: number, turn: number): boolean {
  return (
    (turn === 1 && (cell === 1 || cell === 3)) ||
    (turn === 2 && (cell === 2 || cell === 4))
  );
}

type PotentialDrag = {
  pointerId: number;
  from: [number, number];
  cellValue: number;
  startX: number;
  startY: number;
};

type DragVisual = {
  from: [number, number];
  cellValue: number;
  clientX: number;
  clientY: number;
};

export function Board({
  board,
  flip,
  currentTurn,
  selectedPiece,
  possibleMoves,
  showMoveHighlights = true,
  onSquareClick,
  onDragMove,
  onDragPieceSelect,
  hintDestination = null,
  botLastMoveTo = null,
  disabled,
  canInteract = true,
  rotationDurationMs = DEFAULT_BOARD_ROTATION_MS,
}: BoardProps) {
  const rotationMs = Math.min(
    BOARD_ROTATION_MS_MAX,
    Math.max(BOARD_ROTATION_MS_MIN, rotationDurationMs),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressNextClickRef = useRef(false);
  const tapHandledRef = useRef(false);
  const potentialDragRef = useRef<PotentialDrag | null>(null);
  const draggingRef = useRef(false);
  /** releasePointerCapture fires lostpointercapture synchronously; skip reset so drop still runs. */
  const ignoreNextLostCaptureRef = useRef(false);
  const pointerUpCleanupRef = useRef<(() => void) | null>(null);

  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  /** Block taps/drag while Framer rotation runs (hit-testing assumes 0° or 180°, not in-between). */
  const [rotationLocked, setRotationLocked] = useState(false);
  const skipNextRotationLock = useRef(true);

  const flipRef = useRef(flip);
  const onDragMoveRef = useRef(onDragMove);
  flipRef.current = flip;
  onDragMoveRef.current = onDragMove;

  const isHighlighted = (lr: number, lc: number) => {
    if (selectedPiece && selectedPiece[0] === lr && selectedPiece[1] === lc) {
      return "selected";
    }
    if (
      hintDestination &&
      hintDestination[0] === lr &&
      hintDestination[1] === lc
    ) {
      return "hint";
    }
    if (
      botLastMoveTo &&
      botLastMoveTo[0] === lr &&
      botLastMoveTo[1] === lc
    ) {
      return "botLast";
    }
    if (
      showMoveHighlights &&
      possibleMoves.some((m) => m.toRow === lr && m.toCol === lc)
    ) {
      return "move";
    }
    return null;
  };

  const resetDrag = useCallback(() => {
    potentialDragRef.current = null;
    draggingRef.current = false;
    setDragVisual(null);
  }, []);

  const removeGlobalPointerListeners = useCallback(() => {
    pointerUpCleanupRef.current?.();
    pointerUpCleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      removeGlobalPointerListeners();
    };
  }, [removeGlobalPointerListeners]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (skipNextRotationLock.current) {
      skipNextRotationLock.current = false;
      return;
    }
    if (prefersReducedMotion) return;
    setRotationLocked(true);
    const id = window.setTimeout(
      () => setRotationLocked(false),
      rotationMs + 80,
    );
    return () => clearTimeout(id);
  }, [flip, prefersReducedMotion, rotationMs]);

  const captureElRef = useRef<HTMLElement | null>(null);
  const finalizeStartedRef = useRef(false);

  const finalizePointer = useCallback(
    (e: PointerEvent) => {
      if (finalizeStartedRef.current) return;
      finalizeStartedRef.current = true;

      const p = potentialDragRef.current;
      if (!p) {
        finalizeStartedRef.current = false;
        return;
      }
      const lr = p.from[0];
      const lc = p.from[1];

      const wasDragging = draggingRef.current;

      ignoreNextLostCaptureRef.current = true;
      try {
        captureElRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      ignoreNextLostCaptureRef.current = false;

      draggingRef.current = false;
      potentialDragRef.current = null;
      captureElRef.current = null;

      if (wasDragging) {
        setDragVisual(null);
        const grid = gridRef.current;
        const onMove = onDragMoveRef.current;
        if (grid && onMove) {
          const rect = grid.getBoundingClientRect();
          const logical = clientToLogical(
            e.clientX,
            e.clientY,
            rect,
            flipRef.current,
          );
          if (logical) {
            const { row: toR, col: toC } = logical;
            if (toR !== p.from[0] || toC !== p.from[1]) {
              suppressNextClickRef.current = true;
              if (import.meta.env.DEV) {
                console.log("[Board drag] onDragMove", {
                  from: p.from,
                  to: [toR, toC],
                });
              }
              void onMove(p.from, [toR, toC]);
            }
          }
        }
        finalizeStartedRef.current = false;
        return;
      }

      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        tapHandledRef.current = true;
        onSquareClick(lr, lc);
      }
      finalizeStartedRef.current = false;
    },
    [onSquareClick],
  );

  const interactionDisabled = disabled || rotationLocked || !canInteract;

  const handlePiecePointerDown = (
    e: React.PointerEvent,
    lr: number,
    lc: number,
    cell: number,
    canDrag: boolean,
  ) => {
    if (!canDrag || !onDragMove || interactionDisabled) return;
    e.stopPropagation();
    finalizeStartedRef.current = false;

    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    captureElRef.current = el;
    potentialDragRef.current = {
      pointerId,
      from: [lr, lc],
      cellValue: cell,
      startX: e.clientX,
      startY: e.clientY,
    };

    removeGlobalPointerListeners();

    const onGlobalPointerEnd = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      removeGlobalPointerListeners();

      if (ev.type === "pointercancel") {
        ignoreNextLostCaptureRef.current = true;
        try {
          captureElRef.current?.releasePointerCapture(ev.pointerId);
        } catch {
          /* */
        }
        ignoreNextLostCaptureRef.current = false;
        captureElRef.current = null;
        resetDrag();
        finalizeStartedRef.current = false;
        return;
      }

      finalizePointer(ev);
    };

    window.addEventListener("pointerup", onGlobalPointerEnd, true);
    window.addEventListener("pointercancel", onGlobalPointerEnd, true);
    pointerUpCleanupRef.current = () => {
      window.removeEventListener("pointerup", onGlobalPointerEnd, true);
      window.removeEventListener("pointercancel", onGlobalPointerEnd, true);
    };
  };

  const handlePiecePointerMove = (e: React.PointerEvent) => {
    const p = potentialDragRef.current;
    if (!p) return;

    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;
    const dist = Math.hypot(dx, dy);

    if (draggingRef.current) {
      setDragVisual((prev) =>
        prev
          ? { ...prev, clientX: e.clientX, clientY: e.clientY }
          : null,
      );
      return;
    }

    if (dist >= DRAG_THRESHOLD_PX) {
      if (!draggingRef.current) {
        draggingRef.current = true;
        onDragPieceSelect?.(p.from[0], p.from[1]);
        setDragVisual({
          from: p.from,
          cellValue: p.cellValue,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    }
  };

  const floatingPiece =
    dragVisual && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{
              left: dragVisual.clientX,
              top: dragVisual.clientY,
              transform: "translate(-50%, -50%)",
            }}
            aria-hidden
          >
            <motion.div
              initial={{ scale: 0.92, filter: "brightness(1)" }}
              animate={{
                scale: 1.14,
                y: -10,
                filter:
                  "brightness(1.08) drop-shadow(0 14px 28px rgba(0,0,0,0.35))",
              }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
                mass: 0.55,
              }}
            >
              <div className="flex h-[min(14vw,56px)] w-[min(14vw,56px)] items-center justify-center rounded-full ring-2 ring-amber-300/80 ring-offset-2 ring-offset-[#F0EADA]">
                <Piece
                  value={dragVisual.cellValue}
                  className="h-full w-full"
                />
              </div>
            </motion.div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="mx-auto aspect-square w-[min(100%,92vw,680px,max(12rem,calc(100dvh-12.5rem)))] max-w-full min-w-[12rem] min-h-0 shrink-0 select-none touch-manipulation"
      role="grid"
      aria-label="Draught board — tap or drag pieces"
    >
      <motion.div
        className="h-full w-full will-change-transform"
        style={{ transformOrigin: "center center" }}
        animate={{ rotate: flip ? 180 : 0 }}
        transition={{
          duration: prefersReducedMotion ? 0 : rotationMs / 1000,
          ease: ROTATION_EASE,
        }}
      >
        <div
          ref={gridRef}
          className="grid h-full w-full gap-0 overflow-hidden rounded-xl border-2 border-header/40 shadow-lift"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const dr = Math.floor(i / SIZE);
          const dc = i % SIZE;
          const lr = dr;
          const lc = dc;
          const cell = board[lr]?.[lc] ?? 0;
          const playable = (lr + lc) % 2 === 0;
          const hi = isHighlighted(lr, lc);
          const canDrag =
            Boolean(onDragMove) &&
            !interactionDisabled &&
            playable &&
            cell !== 0 &&
            isOwnPiece(cell, currentTurn);

          const isDragSource =
            dragVisual !== null &&
            dragVisual.from[0] === lr &&
            dragVisual.from[1] === lc;

          return (
            <div
              key={`${lr}-${lc}`}
              role="button"
              tabIndex={interactionDisabled ? -1 : 0}
              aria-disabled={interactionDisabled}
              aria-label={`Square row ${lr + 1} column ${lc + 1}`}
              className={[
                "relative flex aspect-square min-h-0 min-w-0 items-center justify-center p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-header focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                playable ? "bg-darkTile" : "bg-lightTile",
                hi === "selected"
                  ? "z-[3] border-2 border-emerald-400 bg-emerald-500/45 shadow-[inset_0_0_20px_rgba(16,185,129,0.55),0_0_0_2px_rgba(52,211,153,0.9)]"
                  : "",
                hi === "hint"
                  ? "z-[2] border-2 border-violet-500 bg-violet-500/35 shadow-[0_0_0_2px_rgba(139,92,246,0.7),inset_0_0_18px_rgba(196,181,253,0.45)]"
                  : "",
                hi === "botLast"
                  ? "z-[2] border-2 border-sky-400 bg-sky-500/35 shadow-[0_0_0_2px_rgba(56,189,248,0.75),inset_0_0_18px_rgba(125,211,252,0.4)]"
                  : "",
                hi === "move"
                  ? "z-[2] border-2 border-amber-300 bg-amber-400/50 shadow-[0_0_0_2px_rgba(251,191,36,0.65),inset_0_0_18px_rgba(254,249,195,0.45)]"
                  : "",
                interactionDisabled
                  ? "cursor-not-allowed opacity-90"
                  : "cursor-pointer active:brightness-95",
              ].join(" ")}
              onKeyDown={(ke) => {
                if (interactionDisabled) return;
                if (
                  cell !== 0 &&
                  !isOwnPiece(cell, currentTurn)
                ) {
                  return;
                }
                if (ke.key === "Enter" || ke.key === " ") {
                  ke.preventDefault();
                  onSquareClick(lr, lc);
                }
              }}
              onClick={() => {
                if (interactionDisabled) return;
                if (
                  cell !== 0 &&
                  !isOwnPiece(cell, currentTurn)
                ) {
                  return;
                }
                if (suppressNextClickRef.current) {
                  suppressNextClickRef.current = false;
                  return;
                }
                if (tapHandledRef.current) {
                  tapHandledRef.current = false;
                  return;
                }
                onSquareClick(lr, lc);
              }}
            >
              {hi === "move" && cell === 0 ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <span className="h-[42%] w-[42%] rounded-full border-[3px] border-amber-100 bg-amber-400/95 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                </span>
              ) : null}
              {hi === "hint" && cell === 0 ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <span className="h-[42%] w-[42%] rounded-full border-[3px] border-violet-100 bg-violet-500/90 shadow-[0_0_12px_rgba(139,92,246,0.85)]" />
                </span>
              ) : null}
              {cell !== 0 ? (
                <span
                  className={[
                    "relative z-[1] flex h-full w-full items-center justify-center",
                    canDrag ? "touch-none" : "",
                    isDragSource ? "opacity-0" : "",
                  ].join(" ")}
                  onPointerDown={(e) =>
                    handlePiecePointerDown(e, lr, lc, cell, canDrag)
                  }
                  onPointerMove={canDrag ? handlePiecePointerMove : undefined}
                >
                  <Piece value={cell} />
                </span>
              ) : null}
            </div>
          );
        })}
        </div>
      </motion.div>
      {floatingPiece}
      {onDragMove ? (
        <p className="mt-1.5 text-center text-[10px] leading-tight text-muted sm:text-xs">
          {canInteract
            ? "Drag to move, or tap a piece then a square."
            : "Wait for your turn — opponent to move."}
        </p>
      ) : null}
    </div>
  );
}

export { SIZE };

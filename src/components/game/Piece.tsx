const P1 = 1;
const P1K = 3;
const P2K = 4;

type Cell = 0 | 1 | 2 | 3 | 4;

type PieceProps = {
  value: number;
  /** Overrides default cell sizing (e.g. floating drag preview). */
  className?: string;
};

export function Piece({ value, className }: PieceProps) {
  if (value === 0) return null;
  const v = value as Cell;
  const isP1 = v === P1 || v === P1K;
  const isKing = v === P1K || v === P2K;

  /** Width-based square so men stay circular even if a parent ever mis-sizes a tile. */
  const sizeClass = className ?? "aspect-square w-[78%] max-h-full max-w-full";

  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-black/25 shadow-md ${sizeClass}`}
      style={{
        background: isP1
          ? "linear-gradient(145deg, #ffd699 0%, #ff8c1a 55%, #c65d00 100%)"
          : "linear-gradient(145deg, #99ccff 0%, #1a2cff 50%, #0d1f99 100%)",
        boxShadow: isP1
          ? "0 2px 8px rgba(255, 140, 26, 0.55)"
          : "0 2px 8px rgba(26, 44, 255, 0.45)",
      }}
      aria-hidden
    >
      {isKing ? (
        <span className="text-[0.65em] font-bold leading-none text-white/95 drop-shadow">
          ♔
        </span>
      ) : null}
    </div>
  );
}

const SIZE = 10;
const BOARD_SIZE = 150;
const TILE_SIZE = BOARD_SIZE / SIZE;

export type MiniBoardVariant = "default" | "puzzle" | "bots" | "lesson";

type MiniBoardPreviewProps = {
  /** When set, shows a snapshot (e.g. current game) instead of a static pattern. */
  imageSrc?: string;
  alt?: string;
  /** Decorative static patterns for menu rows without a live snapshot. */
  variant?: MiniBoardVariant;
};

const variantRing: Record<MiniBoardVariant, string> = {
  default: "",
  puzzle: "ring-2 ring-amber-500/40 ring-offset-2 ring-offset-cream",
  bots: "ring-2 ring-blue-500/35 ring-offset-2 ring-offset-cream",
  lesson: "ring-2 ring-emerald-600/35 ring-offset-2 ring-offset-cream",
};

export function MiniBoardPreview({
  imageSrc,
  alt = "",
  variant = "default",
}: MiniBoardPreviewProps) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        width={BOARD_SIZE}
        height={BOARD_SIZE}
        className={`shrink-0 rounded-lg object-cover shadow-sm ${variantRing[variant]}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 flex-wrap overflow-hidden rounded-lg shadow-sm ${variantRing[variant]}`}
      style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      aria-hidden
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const row = Math.floor(i / SIZE);
        const col = i % SIZE;
        const isDark = (row + col) % 2 === 0;
        const isTopPiece = isDark && row < 4;
        const isBottomPiece = isDark && row > 5;

        return (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              backgroundColor: isDark ? "#3b2200" : "#e6c3a5",
            }}
          >
            {(isTopPiece || isBottomPiece) && (
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: TILE_SIZE * 0.7,
                  height: TILE_SIZE * 0.7,
                  backgroundColor: isTopPiece ? "#ff8c1a" : "#1a2cff",
                  boxShadow: `0 0 8px ${isTopPiece ? "#ff8c1a" : "#1a2cff"}`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: "70%",
                    height: "70%",
                    backgroundColor: isTopPiece ? "#ffd699" : "#66ccff",
                  }}
                >
                  <div
                    className="rounded-full opacity-60"
                    style={{
                      width: "40%",
                      height: "40%",
                      backgroundColor: "#fff",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

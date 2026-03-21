import { Piece } from "@/components/game/Piece";

const MAX_ICONS = 5;

type Props = {
  /** Cell values (1–4) of captured opponent pieces, in capture order. */
  pieces: number[];
  /** Show at most this many piece icons; remainder as +N */
  maxIcons?: number;
};

/**
 * Up to `maxIcons` piece icons, then "+N" for the rest (Chess.com-style trophy row).
 */
export function CapturedPiecesRow({ pieces, maxIcons = MAX_ICONS }: Props) {
  if (pieces.length === 0) {
    return <span className="text-[10px] text-muted sm:text-xs">—</span>;
  }
  const shown = pieces.slice(0, maxIcons);
  const rest = pieces.length - maxIcons;
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {shown.map((v, i) => (
        <div
          key={`cap-${i}-${v}`}
          className="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
          title="Captured piece"
        >
          <Piece value={v} className="h-full w-full" />
        </div>
      ))}
      {rest > 0 ? (
        <span className="pl-0.5 text-[11px] font-bold tabular-nums text-text sm:text-xs">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

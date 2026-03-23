import { Link } from "react-router-dom";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";

type Props = {
  onOpenRules?: () => void;
  /** e.g. `hidden md:flex` to hide the strip on small screens when the header duplicates nav */
  className?: string;
  /**
   * When set (e.g. guest in active game), called instead of `<Link>` so parent can show forfeit confirm.
   */
  onPlayMenuNavigate?: () => void;
  onHomeNavigate?: () => void;
};

/**
 * Left column: play menu & quick links (Chess.com-style nav strip).
 */
export function GamePlaySidebar({
  onOpenRules,
  className = "",
  onPlayMenuNavigate,
  onHomeNavigate,
}: Props) {
  return (
    <aside
      className={`flex w-full shrink-0 flex-row items-center gap-1 border-b border-header/25 bg-header py-2 pl-2 pr-2 md:w-52 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:py-4 ${className}`}
    >
      {onPlayMenuNavigate ? (
        <button
          type="button"
          onClick={onPlayMenuNavigate}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-text hover:bg-black/10"
        >
          <span aria-hidden className="text-lg">
            ←
          </span>
          <span className="hidden md:inline">Play menu</span>
        </button>
      ) : (
        <Link
          to="/play"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-text hover:bg-black/10"
        >
          <span aria-hidden className="text-lg">
            ←
          </span>
          <span className="hidden md:inline">Play menu</span>
        </Link>
      )}
      {onHomeNavigate ? (
        <button
          type="button"
          onClick={onHomeNavigate}
          className="rounded-lg px-2 py-2 text-left text-sm text-text/90 hover:bg-black/10"
        >
          Home
        </button>
      ) : (
        <Link
          to="/"
          className="rounded-lg px-2 py-2 text-sm text-text/90 hover:bg-black/10"
        >
          Home
        </Link>
      )}
      {onOpenRules ? (
        <button
          type="button"
          onClick={onOpenRules}
          className="rounded-lg px-2 py-2 text-left text-sm text-text/90 hover:bg-black/10"
        >
          Rules
        </button>
      ) : null}
      <FeedbackLink className="rounded-lg px-2 py-2 text-sm text-text/90 hover:bg-black/10 md:mt-auto">
        Feedback
      </FeedbackLink>
    </aside>
  );
}

import { Link } from "react-router-dom";
import { FeedbackLink } from "@/components/feedback/FeedbackLink";

type Props = {
  onOpenRules?: () => void;
};

/**
 * Left column: play menu & quick links (Chess.com-style nav strip).
 */
export function GamePlaySidebar({ onOpenRules }: Props) {
  return (
    <aside className="flex w-full shrink-0 flex-row items-center gap-1 border-b border-header/25 bg-header py-2 pl-2 pr-2 lg:w-52 lg:flex-col lg:items-stretch lg:gap-0 lg:border-b-0 lg:border-r lg:py-4">
      <Link
        to="/play"
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-text hover:bg-black/10"
      >
        <span aria-hidden className="text-lg">
          ←
        </span>
        <span className="hidden lg:inline">Play menu</span>
      </Link>
      <Link
        to="/"
        className="rounded-lg px-2 py-2 text-sm text-text/90 hover:bg-black/10"
      >
        Home
      </Link>
      {onOpenRules ? (
        <button
          type="button"
          onClick={onOpenRules}
          className="rounded-lg px-2 py-2 text-left text-sm text-text/90 hover:bg-black/10"
        >
          Rules
        </button>
      ) : null}
      <FeedbackLink className="rounded-lg px-2 py-2 text-sm text-text/90 hover:bg-black/10 lg:mt-auto">
        Feedback
      </FeedbackLink>
    </aside>
  );
}

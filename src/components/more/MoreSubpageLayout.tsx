import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
};

export function MoreSubpageLayout({
  title,
  backTo = "/more",
  backLabel = "More",
  children,
}: Props) {
  return (
    <div className="safe-x pb-28 pt-[max(0.5rem,env(safe-area-inset-top))] md:pb-10">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 border-b border-header/20 bg-cream/95 px-2 py-3 backdrop-blur-md"
        style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
      >
        <Link
          to={backTo}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text transition hover:bg-header/15"
          style={{ backgroundColor: "#F5E6A8" }}
          aria-label={`Back to ${backLabel}`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden
          >
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="min-w-0 flex-1 text-center font-display text-lg font-semibold tracking-tight text-text sm:text-xl">
          {title}
        </h1>
        <span className="w-10 shrink-0" aria-hidden />
      </header>
      <div className="mx-auto max-w-xl px-2 pt-4">{children}</div>
    </div>
  );
}

export function MoreHubLinkRow({
  to,
  title: rowTitle,
  description,
  icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex w-full items-center gap-3 rounded-2xl border border-header/15 bg-white/50 px-3 py-3 text-left shadow-sm transition hover:bg-white/80 active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sheet/90 text-text shadow-inner">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-text">{rowTitle}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 text-muted opacity-70"
        aria-hidden
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

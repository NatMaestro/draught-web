export type DraughtLoaderTone = "onLight" | "onDark";

const cellLight = "bg-text";
const cellDark = "bg-white";

function CheckerSpinner({
  size,
  tone,
  className = "",
}: {
  size: "sm" | "md" | "lg";
  tone: DraughtLoaderTone;
  className?: string;
}) {
  const cell = tone === "onLight" ? cellLight : cellDark;
  const grid =
    size === "sm"
      ? "h-7 w-7 gap-0.5"
      : size === "md"
        ? "h-10 w-10 gap-1"
        : "h-[3.25rem] w-[3.25rem] gap-1";
  const rounded = size === "sm" ? "rounded-[2px]" : "rounded-[3px]";

  return (
    <div
      className={`grid grid-cols-2 ${grid} ${className}`}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`draught-checker-cell ${rounded} ${cell}`}
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </div>
  );
}

type BaseProps = {
  tone?: DraughtLoaderTone;
  className?: string;
  /** Accessible name when there is no visible label */
  ariaLabel?: string;
};

/** Spinner only — for buttons, compact rows (compose with your own label). */
export function DraughtLoaderSpinner({
  size = "md",
  tone = "onLight",
  className,
  ariaLabel,
}: BaseProps & { size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`inline-flex shrink-0 ${className ?? ""}`} role="img" aria-label={ariaLabel ?? "Loading"}>
      <CheckerSpinner size={size} tone={tone} />
    </span>
  );
}

type DraughtLoaderProps = BaseProps & {
  variant?: "fullscreen" | "section" | "inline";
  /** Shown under the spinner (and for screen readers when provided) */
  label?: string;
  /** Extra wrapper classes */
  wrapperClassName?: string;
};

/**
 * Branded loading UI: staggered 2×2 checker animation.
 * - `fullscreen` — auth gates, full-page waits (min-height viewport, mesh background)
 * - `section` — list / panel initial load
 * - `inline` — one row with optional label
 */
export function DraughtLoader({
  variant = "section",
  label,
  tone = "onLight",
  ariaLabel,
  className,
  wrapperClassName,
}: DraughtLoaderProps) {
  const announce = ariaLabel ?? label ?? "Loading";
  const spinnerSize = variant === "inline" ? "md" : "lg";

  const inner = (
    <>
      <CheckerSpinner size={spinnerSize} tone={tone} />
      {label ? (
        <p
          className={`mt-4 text-center text-sm font-medium leading-snug ${
            tone === "onDark" ? "text-white/85" : "text-muted"
          }`}
        >
          {label}
        </p>
      ) : null}
    </>
  );

  if (variant === "fullscreen") {
    return (
      <div
        className={`flex min-h-[100dvh] flex-col items-center justify-center bg-cream bg-mesh-radial px-6 dark:bg-mesh-radial-dark ${wrapperClassName ?? ""}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={announce}
      >
        <div className={`flex flex-col items-center ${className ?? ""}`}>{inner}</div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={`flex items-center gap-3 ${tone === "onDark" ? "text-white/90" : "text-muted"} ${className ?? ""}`}
        role="status"
        aria-live="polite"
        aria-label={announce}
      >
        <CheckerSpinner size="md" tone={tone} />
        {label ? <span className="text-sm font-medium">{label}</span> : null}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center py-10 ${className ?? ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={announce}
    >
      {inner}
    </div>
  );
}

/** Inline row: spinner + text — for buttons and CTAs */
export function DraughtLoaderButtonContent({
  loading,
  loadingText,
  idleText,
  tone = "onDark",
}: {
  loading: boolean;
  loadingText: string;
  idleText: string;
  tone?: DraughtLoaderTone;
}) {
  if (!loading) return <>{idleText}</>;
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <DraughtLoaderSpinner size="sm" tone={tone} ariaLabel={loadingText} />
      <span>{loadingText}</span>
    </span>
  );
}

/** Optional: centered block for game shell */
export function DraughtLoaderGameShell({ label = "Loading game" }: { label?: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <CheckerSpinner size="lg" tone="onLight" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}

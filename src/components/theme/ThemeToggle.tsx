import { useThemeStore } from "@/store/themeStore";

type Props = {
  className?: string;
  /** Compact icon-only (e.g. sidebar). */
  variant?: "default" | "compact";
};

export function ThemeToggle({ className = "", variant = "default" }: Props) {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => toggle()}
        className={`rounded-xl border border-header/30 bg-cream/80 px-3 py-2 text-sm font-semibold text-text transition hover:bg-sheet dark:border-header/40 dark:bg-sheet/40 ${className}`}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={mode === "dark" ? "Light mode" : "Dark mode"}
      >
        <span aria-hidden className="text-lg leading-none">
          {mode === "dark" ? "☀️" : "🌙"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle()}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border border-header/20 bg-white/45 px-4 py-3 text-left text-sm font-semibold text-text transition hover:bg-white/60 dark:border-header/30 dark:bg-sheet/50 dark:hover:bg-sheet/70 ${className}`}
      aria-pressed={mode === "dark"}
    >
      <span>Appearance</span>
      <span className="rounded-full bg-header/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-text dark:bg-header/35">
        {mode === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  );
}

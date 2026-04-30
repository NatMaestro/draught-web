import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
  isIos: boolean;
  isMobile: boolean;
  canPromptInstall: boolean;
  onChromiumInstall: () => void | Promise<void>;
  installBusy: boolean;
};

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-text">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-header/25 text-xs font-bold text-text"
        aria-hidden
      >
        {n}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}

/**
 * Step-by-step install / “Add to Home Screen” help. iOS has no Chrome install sheet; Android & desktop use PWA install where supported.
 */
export function InstallAppHelpModal({
  open,
  onClose,
  isIos,
  isMobile,
  canPromptInstall,
  onChromiumInstall,
  installBusy,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const showChromiumInstall = !isIos && canPromptInstall;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-help-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] max-h-[min(90dvh,560px)] w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-sheet shadow-2xl dark:border-white/10 sm:mb-0"
      >
        <div className="flex max-h-[min(90dvh,560px)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-header/10 px-5 py-4 dark:border-white/10">
            <div className="min-w-0">
              <h2
                id="install-help-title"
                className="font-display text-xl font-normal tracking-tight text-text"
              >
                Add Draught like an app
              </h2>
              <p className="mt-1 text-sm text-muted">
                Follow the steps for your device. After that, open Draught from your new icon —
                not from a normal browser tab — so the address bar stays hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-muted transition hover:bg-header/15 hover:text-text"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            {isIos ? (
              <section aria-labelledby="steps-ios">
                <h3 id="steps-ios" className="text-xs font-bold uppercase tracking-wider text-muted">
                  iPhone & iPad (Safari)
                </h3>
                <ol className="mt-3 list-none space-y-3 p-0">
                  <Step n={1}>
                    Open this page in <strong className="text-text">Safari</strong> (not Chrome or an
                    in-app browser — the Share steps may be missing there).
                  </Step>
                  <Step n={2}>
                    Tap the <strong className="text-text">Share</strong> button (square with an arrow pointing
                    up). On iPhone it&apos;s often centered at the bottom edge of the screen.
                  </Step>
                  <Step n={3}>
                    Scroll the share sheet and tap <strong className="text-text">Add to Home Screen</strong>.
                  </Step>
                  <Step n={4}>
                    Optionally edit the name, then tap <strong className="text-text">Add</strong> in the top
                    corner to confirm.
                  </Step>
                  <Step n={5}>
                    Leave Safari and go to your <strong className="text-text">Home Screen</strong>. Tap the
                    new <strong className="text-text">Draught</strong> icon to play — full screen without the
                    Safari address bar.
                  </Step>
                </ol>
              </section>
            ) : (
              <>
                <section aria-labelledby="steps-mobile-chrome">
                  <h3 id="steps-mobile-chrome" className="text-xs font-bold uppercase tracking-wider text-muted">
                    {isMobile ? "Android & Chrome (mobile)" : "Computer (Chrome, Edge, Brave)"}
                  </h3>
                  <ol className="mt-3 list-none space-y-3 p-0">
                    {showChromiumInstall ? (
                      <Step n={1}>
                        {isMobile ? "Tap" : "Click"}{" "}
                        <strong className="text-text">Install Draught now</strong> below — or open your browser{" "}
                        <strong className="text-text">⋮ menu</strong> → <strong className="text-text">Install app</strong>{" "}
                        {isMobile ? "" : "(sometimes shown as Install Draught…) "}
                        if you prefer.
                      </Step>
                    ) : (
                      <Step n={1}>
                        {isMobile ? "Tap" : "Open"} your browser&apos;s{" "}
                        <strong className="text-text">⋮</strong> {!isMobile ? "or ☰ " : ""}menu, then look for{" "}
                        <strong className="text-text">Install app</strong>,{" "}
                        <strong className="text-text">Add Draught to Home screen</strong>, or an{" "}
                        <strong className="text-text">Install</strong> icon beside the address bar.
                      </Step>
                    )}
                    <Step n={2}>
                      Confirm in the browser or system dialog. The app should appear alongside your other apps.
                    </Step>
                    <Step n={3}>
                      <strong className="text-text">Important:</strong> open Draught from that{" "}
                      <strong className="text-text">launcher icon</strong>. Opening the website again inside
                      a normal browser tab will still show the address bar.
                    </Step>
                  </ol>
                </section>

                {!isMobile ? (
                  <p className="mt-4 rounded-2xl bg-header/10 px-3 py-2 text-xs text-muted dark:bg-white/5">
                    On Windows or Mac use Chrome or Edge — Firefox may not offer the same install shortcut.
                  </p>
                ) : null}
              </>
            )}

            {showChromiumInstall ? (
              <div className="mt-6 border-t border-header/10 pt-4 dark:border-white/10">
                <button
                  type="button"
                  disabled={installBusy}
                  onClick={() => void onChromiumInstall()}
                  className="flex w-full items-center justify-center rounded-2xl bg-header py-3.5 text-base font-bold text-text shadow-md transition hover:opacity-95 disabled:opacity-60"
                >
                  {installBusy ? "Opening install…" : "Install Draught now"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="border-t border-header/10 px-5 py-3 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-header/25 py-3 text-sm font-semibold text-text transition hover:bg-header/10 dark:border-white/20"
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

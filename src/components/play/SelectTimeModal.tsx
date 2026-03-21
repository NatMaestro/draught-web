import { AnimatePresence, motion } from "framer-motion";

export type TimeSection = {
  id: string;
  label: string;
  subtitle?: string;
  options: readonly number[];
};

const DEFAULT_SECTIONS: readonly TimeSection[] = [
  { id: "flash", label: "Flash", options: [1, 2, 3] },
  { id: "twinkle", label: "Twinkle", options: [5, 10, 15] },
  { id: "quick", label: "Quick One", options: [10, 15, 20] },
  {
    id: "long",
    label: "We Got Time",
    subtitle: "(Max time per move)",
    options: [30, 45, 60],
  },
];

type SelectTimeModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedMinutes: number;
  onSelectMinutes: (minutes: number) => void;
  sections?: readonly TimeSection[];
  headerBottomOffsetPx?: number;
};

export function SelectTimeModal({
  visible,
  onClose,
  selectedMinutes,
  onSelectMinutes,
  sections = DEFAULT_SECTIONS,
  headerBottomOffsetPx = 0,
}: SelectTimeModalProps) {
  const bottomPad = "max(1rem, env(safe-area-inset-bottom, 0px))";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute left-0 right-0 z-0 bg-black/45"
            style={{ top: headerBottomOffsetPx, bottom: 0 }}
            onClick={onClose}
          />
          <div
            className="pointer-events-none flex flex-1 flex-col justify-end"
            style={{ paddingTop: headerBottomOffsetPx, zIndex: 1 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="time-modal-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="pointer-events-auto w-full rounded-t-3xl bg-time-modal-bg shadow-lift"
              style={{ paddingBottom: bottomPad }}
            >
              <div className="rounded-t-3xl bg-time-modal-strip px-4 pb-3 pt-3">
                <div className="flex flex-row items-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex min-w-[44px] items-center justify-center py-1 text-text"
                    aria-label="Close"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <h2
                    id="time-modal-title"
                    className="flex-1 text-center text-lg font-bold text-text"
                  >
                    Select time
                  </h2>
                  <span className="min-w-[44px]" aria-hidden />
                </div>
              </div>
              <div className="max-h-[min(70vh,520px)] overflow-y-auto px-4 pb-3 pt-2">
                {sections.map((section) => (
                  <div key={section.id} className="mb-4">
                    <p className="mb-1 text-sm font-semibold text-text">
                      {section.label}
                      {section.subtitle ? (
                        <span className="font-normal text-muted">
                          {" "}
                          {section.subtitle}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {section.options.map((m) => {
                        const selected = selectedMinutes === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              onSelectMinutes(m);
                              onClose();
                            }}
                            className={`min-w-[64px] rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                              selected
                                ? "bg-active text-text shadow-md"
                                : "bg-sheet text-text hover:bg-muted/20"
                            }`}
                          >
                            {m} min
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

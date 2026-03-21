import type { ReactNode } from "react";
import { MiniBoardPreview } from "@/components/home/MiniBoardPreview";

type HomeRowProps = {
  title: string;
  subtitle: ReactNode;
  onPress: () => void;
  /** Right-side preview; defaults to a static mini board. */
  preview?: ReactNode;
};

export function HomeRow({ title, subtitle, onPress, preview }: HomeRowProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center justify-between border-b border-black/[0.06] py-4 text-left transition hover:bg-black/[0.02] active:bg-black/[0.04] md:rounded-xl md:border-0 md:px-4 md:py-5 md:hover:shadow-card"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="mb-1 text-[17px] font-bold text-text">{title}</p>
        <div className="text-[13px] text-muted">{subtitle}</div>
      </div>
      {preview ?? <MiniBoardPreview variant="default" />}
    </button>
  );
}

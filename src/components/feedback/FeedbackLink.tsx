import type { ReactNode } from "react";
import { FEEDBACK_FORM_URL } from "@/lib/config";

type Props = {
  className?: string;
  /** Visible label (default: "Feedback"). */
  children?: ReactNode;
};

/**
 * External link to a feedback form (e.g. Google Forms).
 * Renders nothing when `VITE_FEEDBACK_FORM_URL` is unset.
 */
export function FeedbackLink({ className, children = "Feedback" }: Props) {
  if (!FEEDBACK_FORM_URL) {
    return null;
  }

  return (
    <a
      href={FEEDBACK_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

import { Link } from "react-router-dom";

type Props = {
  to: string;
  title: string;
  description?: string;
};

/** Secondary option on the play hub — title + optional muted line. */
export function PlayMenuRow({ to, title, description }: Props) {
  return (
    <Link
      to={to}
      className="flex flex-col rounded-[20px] border border-header/15 bg-sheet/80 px-[18px] py-4 text-left shadow-sm transition hover:bg-sheet active:scale-[0.99]"
    >
      <span className="text-base font-semibold text-text">{title}</span>
      {description ? (
        <span className="mt-1 text-xs leading-snug text-muted">{description}</span>
      ) : null}
    </Link>
  );
}

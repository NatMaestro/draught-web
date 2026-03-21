import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const links = [
  { to: "/home", label: "Play", desc: "Home & matches" },
  { to: "/puzzle", label: "Puzzle", desc: "Spot the move" },
  { to: "/train", label: "Train", desc: "Lessons" },
  { to: "/more", label: "More", desc: "Settings" },
];

export function DesktopSidebar() {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-header/20 bg-header/90 py-8 pl-6 pr-4 backdrop-blur-xl xl:flex">
      <div className="mb-10 px-2">
        <div className="font-display text-3xl font-normal tracking-tight text-text">
          Draught
        </div>
        <p className="mt-1 text-sm text-text/80">The Spirit of Africa</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ to, label, desc }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative rounded-2xl px-4 py-3 transition ${
                isActive
                  ? "bg-active/90 text-text shadow-md"
                  : "text-text/85 hover:bg-black/5"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-active/90 shadow-md"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10 block font-semibold">{label}</span>
                <span className="relative z-10 block text-xs font-medium opacity-70">
                  {desc}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <NavLink
        to="/play"
        className="relative z-10 mt-4 rounded-2xl bg-text px-4 py-4 text-center font-bold text-cream shadow-lift transition hover:opacity-95"
      >
        Play a game
      </NavLink>
    </aside>
  );
}

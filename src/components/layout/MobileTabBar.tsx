import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { to: "/home", label: "Play", icon: CheckerIcon },
  { to: "/puzzle", label: "Puzzle", icon: PuzzleIcon },
  { to: "/train", label: "Train", icon: SchoolIcon },
  { to: "/more", label: "More", icon: MenuIcon },
];

function CheckerIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" opacity={active ? 1 : 0.65} />
    </svg>
  );
}

function PuzzleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        d="M10.5 4.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 6.83 9 6s.67-1.5 1.5-1.5zm-6 6c.83 0 1.5.67 1.5 1.5S5.33 13.5 4.5 13.5 3 12.83 3 12s.67-1.5 1.5-1.5zm6 6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S9 18.83 9 18s.67-1.5 1.5-1.5zm6-6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S15 12.83 15 12s.67-1.5 1.5-1.5zm0-6c.83 0 1.5.67 1.5 1.5S16.33 7.5 15.5 7.5 14 6.83 14 6s.67-1.5 1.5-1.5zm6 6c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S20 12.83 20 12s.67-1.5 1.5-1.5z"
        opacity={active ? 1 : 0.65}
      />
    </svg>
  );
}

function SchoolIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" opacity={active ? 1 : 0.65} />
      <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" opacity={active ? 1 : 0.65} />
    </svg>
  );
}

function MenuIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" opacity={active ? 1 : 0.65} />
    </svg>
  );
}

export function MobileTabBar() {
  return (
    <nav
      className="safe-pb fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-tab-bar/95 backdrop-blur-md dark:border-white/10 md:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1 pt-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-w-[52px] flex-col items-center gap-1 pb-2 text-[13px] font-semibold ${
                isActive ? "text-text" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.span
                  layout
                  className={`flex h-11 w-[52px] items-center justify-center rounded-[10px] ${
                    isActive ? "bg-tab-active" : ""
                  }`}
                  whileTap={{ scale: 0.96 }}
                >
                  <Icon active={isActive} />
                </motion.span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

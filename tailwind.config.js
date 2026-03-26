/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Layout: treat `md` (768px+) as tablet + desktop — sidebar, game side panels, no mobile HUD.
  // Optional ad column on game routes uses `lg` (1024px+) to avoid crowding mid-size tablets.
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--color-cream) / <alpha-value>)",
        header: "rgb(var(--color-header) / <alpha-value>)",
        active: "rgb(var(--color-active) / <alpha-value>)",
        sheet: "rgb(var(--color-sheet) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        "tab-bar": "rgb(var(--color-tab-bar) / <alpha-value>)",
        "tab-active": "rgb(var(--color-tab-active) / <alpha-value>)",
        darkTile: "rgb(var(--color-dark-tile) / <alpha-value>)",
        lightTile: "rgb(var(--color-light-tile) / <alpha-value>)",
        avatar: "rgb(var(--color-avatar) / <alpha-value>)",
        "time-modal-bg": "rgb(var(--color-time-modal-bg) / <alpha-value>)",
        "time-modal-strip": "rgb(var(--color-time-modal-strip) / <alpha-value>)",
        peach: "rgb(var(--color-peach) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        "brand-fb": "rgb(var(--color-brand-fb) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        "row-muted": "rgb(var(--color-row-muted) / <alpha-value>)",
        "icon-sky": "rgb(var(--color-icon-sky) / <alpha-value>)",
        "icon-coral": "rgb(var(--color-icon-coral) / <alpha-value>)",
        "icon-purple": "rgb(var(--color-icon-purple) / <alpha-value>)",
        "icon-mint": "rgb(var(--color-icon-mint) / <alpha-value>)",
        "icon-gold": "rgb(var(--color-icon-gold) / <alpha-value>)",
        "icon-stone": "rgb(var(--color-icon-stone) / <alpha-value>)",
        "icon-olive": "rgb(var(--color-icon-olive) / <alpha-value>)",
        "icon-blue": "rgb(var(--color-icon-blue) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(216, 164, 119, 0.45)",
        card: "0 4px 24px rgba(26, 26, 26, 0.06)",
        lift: "0 12px 40px rgba(26, 26, 26, 0.12)",
      },
      backgroundImage: {
        "mesh-radial":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(239, 202, 131, 0.35), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(216, 164, 119, 0.12), transparent)",
        "mesh-radial-dark":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200, 150, 90, 0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(216, 164, 119, 0.06), transparent)",
      },
      keyframes: {
        "chat-in": {
          "0%": { opacity: "0.88", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "chat-in": "chat-in 0.1s ease-out both",
      },
    },
  },
  plugins: [],
};

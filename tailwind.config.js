/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Layout: treat `md` (768px+) as tablet + desktop — sidebar, game side panels, no mobile HUD.
  // Optional ad column on game routes uses `lg` (1024px+) to avoid crowding mid-size tablets.
  theme: {
    extend: {
      colors: {
        cream: "#F0EADA",
        header: "#D8A477",
        active: "#EFCA83",
        sheet: "#E8E0D4",
        text: "#1A1A1A",
        muted: "#6B5D4F",
        "tab-bar": "#E8D4B8",
        "tab-active": "#D4A574",
        darkTile: "#3D2B1F",
        lightTile: "#F5E6D3",
        avatar: "#F5E6A8",
        "time-modal-bg": "#EDE6DC",
        "time-modal-strip": "#E5D9C8",
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
      },
    },
  },
  plugins: [],
};

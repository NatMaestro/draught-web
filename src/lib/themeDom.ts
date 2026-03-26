/** Syncs `<html class="dark">` + `theme-color` meta — must not run with stale pre-hydration state. */
export function applyRootTheme(mode: "light" | "dark") {
  document.documentElement.classList.toggle("dark", mode === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", mode === "dark" ? "#1a1814" : "#D8A477");
  }
}

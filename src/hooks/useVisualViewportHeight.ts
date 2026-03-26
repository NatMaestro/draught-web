import { useEffect, useState } from "react";

/**
 * Tracks `visualViewport.height` so fixed bottom sheets stay within the visible
 * area when the mobile keyboard opens (avoids full-screen “zoom” feel from bad dvh).
 */
export function useVisualViewportHeight(): number {
  const [h, setH] = useState(() =>
    typeof window !== "undefined"
      ? window.visualViewport?.height ?? window.innerHeight
      : 640,
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setH(vv.height);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return h;
}

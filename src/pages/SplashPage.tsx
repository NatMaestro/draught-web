import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

function SplashMark() {
  const [imgOk, setImgOk] = useState(true);
  if (!imgOk) {
    return (
      <div className="h-[200px] w-[200px] rounded-3xl bg-gradient-to-br from-header to-active shadow-glow" />
    );
  }
  return (
    <img
      src="/assets/splash-icon.png"
      alt=""
      width={200}
      height={200}
      className="h-[200px] w-[200px] object-contain drop-shadow-glow"
      onError={() => setImgOk(false)}
    />
  );
}

export function SplashPage() {
  const navigate = useNavigate();
  const isLoading = useAuthStore((s) => s.isLoading);
  const [fadeDone, setFadeDone] = useState(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFadeDone(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hasNavigated.current) return;
    if (isLoading) return;
    if (!fadeDone) return;
    hasNavigated.current = true;
    navigate("/home", { replace: true });
  }, [isLoading, fadeDone, navigate]);

  return (
    <motion.div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-cream px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <SplashMark />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="font-display mt-6 text-center text-[22px] italic text-text"
      >
        The Spirit of Africa, One Move at a Time.
      </motion.p>
    </motion.div>
  );
}

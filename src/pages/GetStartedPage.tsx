import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function GetStartedPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  const handleGetStarted = () => {
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    navigate(`/auth/register${q}`);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-center bg-cream safe-x pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        to="/"
        replace
        className="absolute left-[max(1.5rem,env(safe-area-inset-left))] top-[max(3rem,env(safe-area-inset-top))] text-text hover:underline"
      >
        ← Back
      </Link>
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-6 text-center text-[22px] font-bold text-text">
          What is your email?
        </h1>
        <div className="mb-6 flex flex-row items-center rounded-xl border border-header/10 bg-sheet/90 px-4 py-3.5">
          <span className="mr-3 text-lg" aria-hidden>
            ✉
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoCapitalize="none"
            autoCorrect="off"
            className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-muted outline-none"
          />
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleGetStarted}
          className="w-full rounded-xl bg-active py-4 text-base font-bold text-text shadow-md"
        >
          Get Started
        </motion.button>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/auth/login" className="font-semibold text-text underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

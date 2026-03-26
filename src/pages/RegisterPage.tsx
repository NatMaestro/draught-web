import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { setGuestPlayAcknowledged } from "@/lib/playSession";
import { safeReturnTo } from "@/lib/deepLink";
import { DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

function BoardLogo() {
  const size = 4;
  return (
    <div
      className="flex flex-wrap overflow-hidden rounded"
      style={{ width: 80, height: 80 }}
    >
      {Array.from({ length: size * size }).map((_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        const isDark = (row + col) % 2 === 0;
        const hasPiece = isDark && (row <= 1 || row >= size - 2);
        const isP1 = row >= size - 2;
        return (
          <div
            key={i}
            className={`flex items-center justify-center ${isDark ? "bg-darkTile" : "bg-lightTile"}`}
            style={{
              width: 20,
              height: 20,
            }}
          >
            {hasPiece ? (
              <div
                className={`rounded-full border ${isP1 ? "border-darkTile bg-header" : "border-header bg-avatar"}`}
                style={{
                  width: 12,
                  height: 12,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const afterRegister = useMemo(
    () => safeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    setError("");
    if (password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      const result = await register({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      });
      if (result.ok) {
        navigate(afterRegister, { replace: true });
      } else {
        setError(result.error ?? "Registration failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const field =
    "mb-3 w-full rounded-xl border border-header/10 bg-sheet/90 px-4 py-3.5 text-base text-text placeholder:text-muted outline-none focus:ring-2 focus:ring-active/50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="min-h-[100dvh] bg-cream safe-x py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between py-2">
          <Link to="/auth/get-started" className="text-base text-text hover:underline">
            ← Back
          </Link>
          <Link
            to={`/auth/login?returnTo=${encodeURIComponent(afterRegister)}`}
            className="text-base font-bold text-text hover:underline"
          >
            Log In
          </Link>
        </div>
        <h1 className="mb-4 text-center text-[22px] font-bold text-text">
          Create your Draught account
        </h1>
        <div className="mb-6 flex justify-center">
          <BoardLogo />
        </div>
        <p className="mb-4 text-center text-sm text-muted">
          Join the board — one move at a time.
        </p>
        {error ? (
          <p className="mb-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <input
          className={field}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          disabled={isLoading}
        />
        <input
          className={field}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
          disabled={isLoading}
        />
        <input
          className={field}
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <input
          className={field}
          placeholder="Confirm password"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          disabled={isLoading}
        />
        <motion.button
          type="button"
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          disabled={isLoading}
          aria-busy={isLoading}
          onClick={() => void handleRegister()}
          className="mt-2 w-full rounded-xl bg-active py-4 text-base font-bold text-text shadow-md disabled:opacity-70"
        >
          <DraughtLoaderButtonContent
            loading={isLoading}
            loadingText="Creating account…"
            idleText="Create account"
            tone="onLight"
          />
        </motion.button>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            setGuestPlayAcknowledged();
            navigate("/play", { replace: true });
          }}
          className="mt-4 w-full text-center text-sm text-muted underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Play as guest
        </button>
      </div>
    </div>
  );
}

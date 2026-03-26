import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { safeReturnTo } from "@/lib/deepLink";
import { DraughtLoaderButtonContent } from "@/components/ui/DraughtLoader";

export function LoginPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const afterLogin = useMemo(
    () => safeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    setIsLoading(true);
    const result = await login(username, password);
    if (result.ok) {
      navigate(afterLogin, { replace: true });
    } else {
      setError(result.error ?? "Login failed");
    } 
    setIsLoading(false);
  };

  const inputWrap =
    "flex flex-row items-center rounded-xl px-4 py-3.5 mb-3 bg-sheet/90 border border-header/10";

  return (
    <div className="min-h-[100dvh] bg-cream safe-x pt-[max(3rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center gap-2">
          <Link to="/home" className="text-xl text-text hover:underline">
            ←
          </Link>
          <h1 className="text-2xl font-bold text-text">Log In</h1>
        </div>
        {error ? (
          <p className="mb-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className={inputWrap}>
          <span className="mr-3 text-lg" aria-hidden>
            ✉
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoCapitalize="none"
            className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-muted outline-none"
          />
        </div>
        <div className={inputWrap}>
          <span className="mr-3 text-lg" aria-hidden>
            🔒
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="min-w-0 flex-1 bg-transparent text-base text-text placeholder:text-muted outline-none"
          />
        </div>
        <button type="button" className="mb-6 text-sm text-text underline-offset-2 hover:underline">
          Forgot password?
        </button>
        <div className="mb-4 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-xl bg-sheet py-3.5 text-center text-text"
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="rounded-xl bg-sheet py-3.5 text-center text-text"
          >
            Continue with Facebook
          </button>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
          onClick={() => void handleLogin()}
          className="w-full rounded-xl bg-active py-4 text-base font-bold text-text shadow-md disabled:opacity-70"
        >
          <DraughtLoaderButtonContent
            loading={isLoading}
            loadingText="Logging in…"
            idleText="Login"
            tone="onLight"
          />
        </motion.button>
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            to={`/auth/register?returnTo=${encodeURIComponent(afterLogin)}`}
            className="font-semibold text-text underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");
const nameSchema = z.string().trim().min(1, "Name required").max(60);

export function AuthScreen({
  onClose,
  onSignedIn,
  next,
}: {
  onClose: () => void;
  onSignedIn: () => void;
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setInfo(null);
  };

  const handleGoogle = async () => {
    reset();
    setBusy(true);
    try {
      const redirectBase = window.location.origin;
      const redirectUri = next
        ? `${redirectBase}/auth?next=${encodeURIComponent(next)}`
        : redirectBase;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : "Google sign-in failed.");
      } else if (!result.redirected) {
        onSignedIn();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setBusy(true);
    try {
      const cleanEmail = emailSchema.parse(email);
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setInfo("Check your inbox for a password reset link.");
      } else if (mode === "signup") {
        const cleanName = nameSchema.parse(name);
        const cleanPw = passwordSchema.parse(password);
        const emailRedirectTo = next
          ? `${window.location.origin}/auth?next=${encodeURIComponent(next)}`
          : window.location.origin;
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPw,
          options: {
            emailRedirectTo,
            data: { display_name: cleanName },
          },
        });
        if (error) throw error;
        setInfo("Account created. Check your email to confirm — then sign in.");
        setMode("signin");
      } else {
        const cleanPw = passwordSchema.parse(password);
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPw,
        });
        if (error) throw error;
        onSignedIn();
      }
    } catch (err) {
      if (err instanceof z.ZodError) setError(err.issues[0]?.message ?? "Invalid input");
      else if (err instanceof Error) setError(err.message);
      else setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back";

  return (
    <main className="radial-bg flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="font-display text-xs uppercase tracking-[0.25em] opacity-70 hover:opacity-100"
          >
            ← Back
          </button>
          <span
            className="font-display text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "var(--cw-muted-soft)" }}
          >
            ChromaWeave
          </span>
        </div>

        <h1 className="font-display title-shimmer text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--cw-muted)" }}>
          {mode === "signup"
            ? "Sync your progress and tapestries across every device."
            : mode === "forgot"
            ? "Enter your email and we'll send you a reset link."
            : "Sign in to continue weaving."}
        </p>

        {mode !== "forgot" && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="glass-panel font-display mt-6 flex w-full min-h-12 items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            aria-label="Continue with Google"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29 35.5 26.6 36.5 24 36.5c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.5-4.2 6l6.2 5.2C41 36 44 30.5 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>
        )}

        {mode !== "forgot" && (
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--cw-muted-soft)" }}>
            <span className="h-px flex-1" style={{ background: "var(--cw-glass-border)" }} />
            or with email
            <span className="h-px flex-1" style={{ background: "var(--cw-glass-border)" }} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                maxLength={60}
                required
                className="auth-input"
                placeholder="Maya"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              maxLength={255}
              required
              className="auth-input"
              placeholder="you@example.com"
            />
          </Field>
          {mode !== "forgot" && (
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={8}
                  maxLength={128}
                  required
                  className="auth-input pr-14"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="font-display absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-rose-400">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="text-sm font-medium text-emerald-300">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="glow-button font-display mt-2 w-full rounded-2xl px-6 py-4 text-base font-bold disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset link"
              : "Sign in"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-xs" style={{ color: "var(--cw-muted)" }}>
          {mode === "signin" && (
            <>
              <button type="button" className="underline-offset-4 hover:underline" onClick={() => { setMode("forgot"); reset(); }}>
                Forgot your password?
              </button>
              <button type="button" className="underline-offset-4 hover:underline" onClick={() => { setMode("signup"); reset(); }}>
                New here? <span className="font-semibold">Create an account</span>
              </button>
            </>
          )}
          {mode === "signup" && (
            <button type="button" className="underline-offset-4 hover:underline" onClick={() => { setMode("signin"); reset(); }}>
              Already have an account? <span className="font-semibold">Sign in</span>
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" className="underline-offset-4 hover:underline" onClick={() => { setMode("signin"); reset(); }}>
              ← Back to sign in
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[10px]" style={{ color: "var(--cw-muted-soft)" }}>
          Passwords are hashed and stored securely. We never see them.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-display mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--cw-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
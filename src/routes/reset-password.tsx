import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ChromaWeave" },
      { name: "description", content: "Set a new password for your ChromaWeave account." },
    ],
  }),
  component: ResetPasswordPage,
});

const pwSchema = z.string().min(8, "At least 8 characters").max(128);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase emits PASSWORD_RECOVERY when the user lands from the email link.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cleaned = pwSchema.parse(pw);
      if (cleaned !== pw2) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: cleaned });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/" }), 1200);
    } catch (err) {
      if (err instanceof z.ZodError) setError(err.issues[0]?.message ?? "Invalid password");
      else if (err instanceof Error) setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="radial-bg flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7">
        <h1 className="font-display title-shimmer text-3xl font-extrabold">Set a new password</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--cw-muted)" }}>
          {ready ? "Choose a strong password (8+ characters)." : "Verifying your reset link…"}
        </p>

        {ready && !done && (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className="auth-input pr-14"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="font-display absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] uppercase tracking-wider opacity-70 hover:opacity-100"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={show ? "text" : "password"}
              className="auth-input"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Confirm new password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="glow-button font-display w-full rounded-2xl px-6 py-4 text-base font-bold disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {done && (
          <p role="status" className="mt-6 text-emerald-300">
            Password updated. Redirecting…
          </p>
        )}
      </div>
    </main>
  );
}
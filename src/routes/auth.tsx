import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { supabase } from "@/integrations/supabase/client";

// Same-origin relative path only. Rejects //other.com, https://…, javascript:, etc.
function sanitizeNext(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export const Route = createFileRoute("/auth")({
  // Browser-only: Supabase session lives in localStorage, absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: sanitizeNext(s.next) }),
  head: () => ({ meta: [{ title: "Sign in — ChromaWeave" }] }),
  component: AuthRoute,
});

function AuthRoute() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  // If session already exists (e.g. after Google OAuth round-trip), continue.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) window.location.assign(next);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") window.location.assign(next);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [next]);

  return (
    <AuthScreen
      next={next}
      onClose={() => navigate({ to: "/" })}
      onSignedIn={() => window.location.assign(next)}
    />
  );
}
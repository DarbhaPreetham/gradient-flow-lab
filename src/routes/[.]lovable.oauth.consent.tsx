import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace on the browser client — narrow local type so TS sees the methods.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthAuth = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};
function oauth(): OAuthAuth {
  return (supabase.auth as unknown as { oauth: OAuthAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: getSession() reads localStorage, which SSR can't see.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="radial-bg flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="glass-panel max-w-md rounded-3xl p-7 text-center">
        <h1 className="font-display text-xl font-bold">Could not load this authorization</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--cw-muted)" }}>
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setErr(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setErr("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="radial-bg flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7">
        <span
          className="font-display text-[10px] uppercase tracking-[0.35em]"
          style={{ color: "var(--cw-muted-soft)" }}
        >
          ChromaWeave
        </span>
        <h1 className="font-display title-shimmer mt-2 text-2xl font-extrabold">
          Connect {clientName} to ChromaWeave
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--cw-muted)" }}>
          {clientName} will be able to call this app's enabled tools while you are signed in.
          This does not bypass ChromaWeave's permissions or backend policies.
        </p>
        {details?.scope && (
          <p className="mt-2 text-xs" style={{ color: "var(--cw-muted-soft)" }}>
            Requested scope: {details.scope}
          </p>
        )}
        {err && (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-400">
            {err}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="glow-button font-display w-full rounded-2xl px-6 py-4 text-base font-bold disabled:opacity-60"
          >
            {busy ? "Please wait…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="glass-panel font-display w-full rounded-2xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
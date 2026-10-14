import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared admin-auth check for Route Handlers under src/app/api/ — the Node
 * server's equivalent of php/api/_auth.php, which this replaces now that
 * uploads/revalidation run as real Next.js API routes instead of a separate
 * PHP service (docs/NODE_MIGRATION.md).
 *
 * Same bridge as the PHP version and supabase/functions/publish: forward
 * the caller's own Supabase access token and ask public.is_admin() (a
 * SECURITY DEFINER function, EXECUTE granted to `authenticated`) whether
 * that user is an admin, rather than holding the service role key on this
 * server at all — PLAN.md §6.2 is explicit that SiteGround must never hold
 * it, and that constraint didn't change just because this is a real Node
 * server now. The returned client stays authenticated as that same user
 * (not an anon or service-role client), so any further read/write it does
 * — the site_meta update in the revalidate route, Storage writes in
 * upload/delete — is itself subject to the normal is_admin()-gated RLS
 * policies, not a bypass.
 */
export class AdminAuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireAdmin(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw new AdminAuthError(401, "Missing Authorization header");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    throw new AdminAuthError(401, "Invalid or expired session");
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    throw new AdminAuthError(403, "Not an admin");
  }

  return supabase;
}

/** Wraps a route handler body, turning AdminAuthError into the right JSON response. */
export async function withAdmin(
  req: Request,
  handler: (supabase: SupabaseClient) => Promise<Response>,
): Promise<Response> {
  try {
    const supabase = await requireAdmin(req);
    return await handler(supabase);
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return Response.json({ ok: false, error: e.message }, { status: e.status });
    }
    throw e;
  }
}

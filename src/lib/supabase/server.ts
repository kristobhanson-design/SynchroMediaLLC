import { createClient } from "@supabase/supabase-js";

/**
 * Build-time client — used only inside async Server Components during
 * `next build` (this is a static export; there is no request-time server to
 * run this against). Always unauthenticated (anon key, no session), so it
 * only ever sees what the public-read RLS policies allow: published
 * projects, active services, all of site_content. See
 * supabase/migrations/20260820163901_rls_policies.sql.
 *
 * `auth: { persistSession: false }` because a build process has no browser
 * storage to persist to, and no user to keep signed in.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

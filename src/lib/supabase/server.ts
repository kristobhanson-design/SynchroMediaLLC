import { createClient } from "@supabase/supabase-js";

/**
 * Anon-role server client — used inside async Server Components and the
 * cached fetchers in src/lib/content.ts. Runs at request time now (there's
 * a real Node server — see docs/NODE_MIGRATION.md), not just at `next
 * build`; content.ts's unstable_cache wrapping is what keeps that from
 * meaning "one Supabase round trip per visitor" — see its own comment.
 * Always unauthenticated (anon key, no session), so it only ever sees what
 * the public-read RLS policies allow: published projects, active services,
 * all of site_content. See supabase/migrations/20260820163901_rls_policies.sql.
 *
 * `auth: { persistSession: false }` because there's no browser storage to
 * persist to here, and no user to keep signed in — this client is never
 * used as anyone's logged-in session.
 */
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

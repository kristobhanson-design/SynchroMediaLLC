import { createClient } from "@supabase/supabase-js";

/**
 * Browser client — used only by /admin's client components. Sessions
 * persist in localStorage (supabase-js default), so a reload keeps you
 * logged in. Never import this from a server component: the public site's
 * build-time reads use ./server.ts instead, which has no session/auth
 * concerns since it only ever reads published rows under anon-role RLS.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

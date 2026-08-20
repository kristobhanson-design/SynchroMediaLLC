-- Hardening pass, driven by the Supabase security advisors after the initial
-- schema landed. Both findings were real; both are cheap to close.

-- 1. set_updated_at had a mutable search_path. A trigger function without a
--    pinned search_path can be redirected if anyone can create objects in a
--    schema that resolves earlier. Pinning to '' forces fully-qualified
--    resolution; now() lives in pg_catalog, which is always in scope.
--
--    `create or replace` keeps the seven existing triggers bound to it — this
--    was verified by updating a row and confirming updated_at still moved.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2. is_admin() was callable by anon over /rest/v1/rpc/is_admin. Anon never
--    needs it: every policy that calls it is scoped TO authenticated, and
--    role-scoped policies are not evaluated for other roles. The original
--    `revoke ... from public` did not cover this, because Supabase grants the
--    anon role separately rather than through PUBLIC.
--
--    authenticated MUST keep EXECUTE. RLS policy expressions are evaluated
--    with the caller's own privileges, so revoking it there would break every
--    admin policy rather than tighten anything. The advisor still flags this
--    and that is expected — the function takes no arguments and returns only
--    the caller's own admin status, so there is nothing to leak.
revoke execute on function public.is_admin() from anon;

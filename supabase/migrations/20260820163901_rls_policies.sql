-- Synchro Media LLC — Row Level Security
--
-- On this architecture the site is statically exported and the admin panel is a
-- browser app talking straight to PostgREST. There is no server tier in front
-- of the database, so RLS is not defence-in-depth — it IS the defence.
-- See PLAN.md §5.1 and §6. Phase 8 tests these adversarially.

-- Start from zero rather than trusting inherited defaults, then grant back
-- exactly what each role needs.
revoke all on all tables in schema public from anon, authenticated;

alter table public.admin_users     enable row level security;
alter table public.projects        enable row level security;
alter table public.project_images  enable row level security;
alter table public.services        enable row level security;
alter table public.site_content    enable row level security;
alter table public.testimonials    enable row level security;
alter table public.quote_requests  enable row level security;

-- ------------------------------------------------------------ admin_users --
-- No grants and no policies: unreachable through the API by any client role.
-- Managed exclusively from the Supabase dashboard (service_role bypasses RLS).
-- public.is_admin() is SECURITY DEFINER, so policies can still consult it.

-- ---------------------------------------------------------------- projects --

grant select on public.projects to anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (status = 'published');

create policy projects_admin_all on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------- project_images --
-- Readable only when the parent project is published. The subquery is itself
-- subject to projects' RLS, which is exactly what we want.

grant select on public.project_images to anon, authenticated;
grant select, insert, update, delete on public.project_images to authenticated;

create policy project_images_public_read on public.project_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.status = 'published'
    )
  );

create policy project_images_admin_all on public.project_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- services --

grant select on public.services to anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;

create policy services_public_read on public.services
  for select to anon, authenticated
  using (is_active);

create policy services_admin_all on public.services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------ site_content --
-- All rows are public site copy, so all rows are readable.

grant select on public.site_content to anon, authenticated;
grant select, insert, update, delete on public.site_content to authenticated;

create policy site_content_public_read on public.site_content
  for select to anon, authenticated
  using (true);

create policy site_content_admin_all on public.site_content
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------ testimonials --

grant select on public.testimonials to anon, authenticated;
grant select, insert, update, delete on public.testimonials to authenticated;

create policy testimonials_public_read on public.testimonials
  for select to anon, authenticated
  using (is_published);

create policy testimonials_admin_all on public.testimonials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------- quote_requests --
-- No anon grants at all. The public NEVER touches this table, not even to
-- insert: submissions go through the quote Edge Function, which holds the
-- service role key. A publicly insertable leads table is spammable and
-- enumerable. Admins read and triage; nobody deletes through the API.

grant select, update on public.quote_requests to authenticated;

create policy quote_requests_admin_read on public.quote_requests
  for select to authenticated
  using (public.is_admin());

create policy quote_requests_admin_update on public.quote_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sequences/functions: keep the default-privilege surface tight for anything
-- added later without an explicit grant.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

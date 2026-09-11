-- Admin panel — schema additions (PLAN.md §5/§7, this session's admin build).
--
-- Three gaps found while planning the admin panel against what's actually
-- live on the site:

-- 1. services.audience only allowed dealership/personal/event. The live
--    Services section has a 4th real category, "Advertising" — same shape
--    of bug already fixed once this session for quote_requests.audience.
alter table public.services
  drop constraint services_audience_check;

-- 2. The live "What we shoot" list (6 items: title + blurb, numbered) is a
--    second, structurally different content type that's been competing for
--    the same table conceptually. Rather than a second table, one `kind`
--    discriminator lets one CRUD screen cover both: 'package' is the 4
--    pricing/audience cards, 'style' is the 6-item shooting-style list.
--    Style rows have no real audience, so audience becomes nullable too.
alter table public.services
  alter column audience drop not null;

alter table public.services
  add constraint services_audience_check
  check (audience is null or audience in ('dealership', 'personal', 'event', 'advertising'));

alter table public.services
  add column kind text not null default 'package' check (kind in ('package', 'style'));

-- 3. Nothing tracks "when was the site last published" — needed for the
--    admin dashboard's pending-changes indicator (PLAN.md §2.4/§7: "the
--    single worst failure mode is editing happily for twenty minutes
--    without realizing nothing is live"). Single-row table by convention
--    (id is always 1), same pattern as a settings singleton.
create table public.site_meta (
  id                 smallint primary key default 1 check (id = 1),
  last_published_at  timestamptz,
  updated_at         timestamptz not null default now()
);

create trigger site_meta_set_updated_at
  before update on public.site_meta
  for each row execute function public.set_updated_at();

insert into public.site_meta (id, last_published_at) values (1, now());

alter table public.site_meta enable row level security;

grant select on public.site_meta to anon, authenticated;
grant update on public.site_meta to authenticated;

create policy site_meta_public_read on public.site_meta
  for select to anon, authenticated
  using (true);

create policy site_meta_admin_write on public.site_meta
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

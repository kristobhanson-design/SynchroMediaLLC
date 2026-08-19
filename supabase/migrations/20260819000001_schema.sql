-- Synchro Media LLC — core schema
-- See PLAN.md §5. Text + CHECK constraints are used instead of Postgres enums
-- because adding a value later is a one-line change rather than a migration
-- dance.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers --

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ admin_users --
-- Allowlist of accounts permitted to write. Deliberately NOT manageable through
-- the API (see the RLS migration): rows are added from the Supabase dashboard
-- only, so a stolen admin session cannot grant itself an accomplice.

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so the policies below can consult this table without
-- re-triggering RLS on it (which would recurse infinitely).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- projects --

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  category         text not null
                     check (category in ('dealership', 'personal', 'event')),

  client_name      text,
  -- Some dealers will not want to be named. Show the work, hide the client.
  is_client_public boolean not null default false,

  vehicle_year     smallint check (vehicle_year between 1885 and 2100),
  vehicle_make     text,
  vehicle_model    text,
  location         text,
  shoot_date       date,

  summary          text,
  body             text,

  cover_image_id   uuid,           -- FK added after project_images exists
  video_url        text,
  video_provider   text check (video_provider in ('youtube', 'vimeo')),

  status           text not null default 'draft'
                     check (status in ('draft', 'published')),
  is_featured      boolean not null default false,
  sort_order       integer not null default 0,

  seo_title        text,
  seo_description  text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A published project with no cover renders a hole on /work.
  constraint published_needs_cover
    check (status <> 'published' or cover_image_id is not null),
  -- video_url and video_provider are meaningful only together.
  constraint video_fields_paired
    check ((video_url is null) = (video_provider is null))
);

create index projects_status_idx    on public.projects (status);
create index projects_category_idx  on public.projects (category);
create index projects_featured_idx  on public.projects (is_featured)
  where is_featured;
create index projects_order_idx     on public.projects (sort_order, created_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- project_images --
-- storage_path holds the variant-less, extension-less base written by
-- php/api/upload.php, e.g. "uploads/<project_id>/<uuid>". Variants live
-- alongside as "<storage_path>-<width>.webp". Keep in sync with
-- src/lib/images.ts.

create table public.project_images (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  storage_path  text not null unique,
  alt_text      text,
  width         integer not null check (width > 0),
  height        integer not null check (height > 0),
  blur_data_url text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index project_images_project_idx
  on public.project_images (project_id, sort_order);

alter table public.projects
  add constraint projects_cover_image_fk
  foreign key (cover_image_id)
  references public.project_images (id)
  on delete set null;

-- ---------------------------------------------------------------- services --

create table public.services (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  audience            text not null
                        check (audience in ('dealership', 'personal', 'event')),
  blurb               text,
  starting_price_cents integer check (starting_price_cents >= 0),
  price_note          text,
  bullets             jsonb not null default '[]'::jsonb,
  sort_order          integer not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint bullets_is_array check (jsonb_typeof(bullets) = 'array')
);

create index services_active_idx on public.services (is_active, sort_order);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ site_content --
-- Every editable string on the public site, addressed by key. This is what
-- makes the site self-editable without a deploy (PLAN.md §5).

create table public.site_content (
  key          text primary key,
  label        text not null,
  content_type text not null default 'text'
                 check (content_type in ('text', 'richtext', 'image')),
  value        text not null default '',
  group_name   text not null default 'general',
  sort_order   integer not null default 0,
  updated_at   timestamptz not null default now()
);

create index site_content_group_idx on public.site_content (group_name, sort_order);

create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ testimonials --

create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null,
  author_name  text not null,
  author_role  text,
  company      text,
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index testimonials_published_idx
  on public.testimonials (is_published, sort_order);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- quote_requests --
-- Inbound leads. Written ONLY by the quote Edge Function using the service
-- role key; never insertable by the public (see the RLS migration).

create table public.quote_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  name            text not null,
  email           text not null,
  phone           text,
  company         text,
  audience        text not null
                    check (audience in ('dealership', 'personal', 'event')),

  service_id      uuid references public.services (id) on delete set null,
  vehicle_details text,
  location        text,
  -- Free text on purpose: real answers look like "weekends in September".
  preferred_dates text,
  timeline        text,
  budget_range    text,
  message         text,
  source_page     text,

  status          text not null default 'new'
                    check (status in ('new', 'contacted', 'quoted',
                                      'scheduled', 'won', 'lost')),
  admin_notes     text,
  contacted_at    timestamptz
);

create index quote_requests_status_idx  on public.quote_requests (status, created_at desc);
create index quote_requests_created_idx on public.quote_requests (created_at desc);

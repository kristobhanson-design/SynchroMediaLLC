# Synchro Media LLC — Website Build Plan

**Status:** Planning. No code written yet.
**Architecture:** SiteGround-hosted static site + Supabase + PHP image service
**Service area:** Atlanta metro, Georgia
**Last updated:** 2026-08-19 (v8 — restructured around SiteGround as host)

---

## 1. What we're building

A portfolio-and-lead-generation site for an automotive photo/video business, with a self-service admin panel so you can update the portfolio and site copy without touching code.

**Three audiences, in priority order:**

| Audience | What they need to see | Where they land |
|---|---|---|
| Dealership decision-makers | Turnaround time, per-unit pricing, consistency across a lot, delivery format | `/dealerships` |
| Private owners | Beautiful work, that you're easy to hire, roughly what it costs | `/` → `/work` |
| Event organizers | Coverage scope, volume, speed | `/work` filtered to events |

**Core loop:** visitor sees work → trusts you → submits a quote request with preferred dates → you get an email → you confirm the shoot by replying. Every request also lands in a pipeline board in your admin panel so nothing gets lost in your inbox.

### In scope
- Public marketing site (6 pages), statically generated
- Filterable portfolio with detail pages
- Dealership-facing B2B section
- Quote request form with scheduling preferences
- Admin panel: portfolio CRUD, image upload/reorder, editable site copy, services/pricing, lead pipeline
- Self-hosted image pipeline with responsive variants
- Transactional email (notification to you + auto-reply to client)
- SEO, analytics, performance, security hardening

### Explicitly out of scope
- Client login / delivery portal
- Blog / content marketing pages — addable later without rework
- Online payment or deposits
- Self-hosted video — see §2.6
- Live calendar booking — see §5.2

### The hosting decision

Everything runs on **SiteGround**, using storage you already pay for. This costs **$0/month beyond your existing plan** — the cheapest complete path available — and it's the plan of record from here.

It costs about **four to five extra days of build** versus a Node host, and it puts two things on our shoulders that a managed platform would handle: a file upload endpoint that has to be exactly right (§6), and a publish pipeline with a few minutes of latency (§2.4). Both are solved problems and both are addressed in detail below. Alternatives considered are archived in the Appendix; they are no longer live options.

---

## 2. Architecture

### 2.1 Decisions

| Layer | Choice | Notes |
|---|---|---|
| Site generation | **Next.js 15+ static export** (`output: 'export'`), TypeScript | Public pages are pre-rendered HTML — fast, and fully indexable |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Accessible primitives restyled to your brand; you own the component code |
| Hosting | **SiteGround — GoGeek recommended** | See §2.2 |
| Database + Auth | **Supabase** (free tier) | Postgres + your admin login. Images live on SiteGround, so the 1 GB storage cap never binds |
| Image processing | **PHP 8 + Imagick** on SiteGround | Enabled by default on PHP 7.4+. Generates responsive variants at upload |
| Quote form backend | **Supabase Edge Function** (Deno) | Validation, Turnstile, Resend — 500k free invocations/mo |
| Email | **Resend** | 3,000/mo free |
| Spam defense | **Cloudflare Turnstile** + honeypot + rate limit | Invisible to real users |
| CDN + DNS | **Cloudflare** free plan, in front of SiteGround | Caches images at the edge; keeps your bandwidth use low |
| CI/CD | **GitHub Actions** → SFTP deploy | Build and publish pipeline |
| Analytics | **Umami Cloud** or **Plausible** | Privacy-first, no cookie banner |

### 2.2 Which SiteGround plan

**GoGeek is what I'd budget for.** GrowBig works; StartUp does not.

| | StartUp | GrowBig | GoGeek |
|---|---|---|---|
| Storage | 10 GB | 50 GB | 100 GB |
| Inodes (file count) | ~200k | ~400k | ~600k |
| Staging environment | No | Yes | Yes |
| Git integration | No | No | Yes |

Storage and inodes are not the constraint — 500 photos at six variants each is roughly 3,000 files and a few GB. **Staging is the constraint.** Without a staging environment I have nowhere to verify a deploy before it hits your live site, and on a business site that isn't acceptable. That rules out StartUp.

GoGeek adds Git integration and headroom. If cost matters more than convenience, GrowBig is genuinely fine.

### 2.3 How the pieces fit

```
Visitor  ──►  Cloudflare CDN  ──►  SiteGround
                                     ├── static HTML/CSS/JS   (the public site)
                                     ├── /uploads/*            (your images, all variants)
                                     └── /api/*.php            (upload + delete, admin only)

You  ──►  /admin  (client-side app, served from SiteGround)
              ├──►  Supabase       — read/write projects, copy, leads   (RLS enforced)
              ├──►  /api/upload.php — image upload, returns paths
              └──►  GitHub Actions  — "Publish" triggers a rebuild

Quote form  ──►  Supabase Edge Function  ──►  Postgres + Resend
```

Three systems, each doing one job: **SiteGround** serves files and processes images, **Supabase** holds data and identity, **GitHub Actions** turns data into a deployed site.

### 2.4 The publish pipeline

This is the part that behaves differently from a live-server site, so it's worth designing deliberately rather than tolerating.

The public site is static, meaning content is baked in at build time. A change in the admin panel is not visible on the site until a rebuild runs.

**Publishing is a deliberate action, not automatic.** The admin panel shows a persistent status indicator:

> **3 unpublished changes** · last published 2 hours ago  →  **[ Publish ]**

Clicking Publish fires a `repository_dispatch` to GitHub Actions, which builds the static site and deploys it over SFTP. The admin polls build status and shows **Building → Deploying → Live**, with the failure surfaced if something breaks. Roughly **2–4 minutes** end to end.

Why manual rather than automatic on every save: editing five fields would otherwise trigger five rebuilds. Batching means you finish your edits, then publish once, and you always know exactly what state the live site is in.

**How we compare state:** the deploy writes a `build-manifest.json` with a timestamp; the admin compares it against the most recent `updated_at` across your content tables. That's what drives the pending-changes count.

**Previewing before you publish:** because the admin is a React app using the same components as the public site, it renders a live preview of any draft at `/admin/preview/[id]` using data straight from Supabase. You see exactly what will ship, instantly, without a rebuild.

### 2.5 Images — the pipeline

This is the most important system in the build, and the one carrying the most risk. It's specified tightly on purpose.

**Upload flow:**

1. **Browser resizes first.** The admin panel downsamples to max 3000px on the long edge before uploading. This keeps PHP's memory use sane (Imagick on a 24 MP file can want 256 MB+) and makes uploads over bad wifi actually complete.
2. **POST to `/api/upload.php`** with your Supabase access token.
3. **PHP authenticates** by calling Supabase's `/auth/v1/user` with the bearer token and checking the returned user against the `admin_users` allowlist. Server-to-server validation, rather than verifying the JWT signature locally — one extra round-trip, far harder to get subtly wrong. Correctness beats cleverness on a security boundary.
4. **PHP validates the file** by inspecting actual image content, not the extension and not the client-supplied MIME type. Hard size cap. Reject anything that doesn't decode as a real image.
5. **Imagick generates variants:** WebP at 400 / 800 / 1200 / 2000px, a 1200px JPEG fallback, and a 20px blur placeholder returned as base64. *(AVIF too if the server's Imagick build supports it — I'll confirm in Phase 1.)*
6. **Files written** to `/uploads/{project_id}/{uuid}-{width}.webp`. Filenames are server-generated UUIDs; no path segment is ever taken from user input.
7. **PHP returns** paths, dimensions, and the blur placeholder; the admin writes them to Supabase.

**Delivery:** public pages emit a plain `<img srcset>` with the variants, `width`/`height` set to prevent layout shift, blur placeholder inline, lazy loading below the fold. Cloudflare caches everything at the edge, so SiteGround serves each file approximately once.

**Targets:** Largest Contentful Paint under 2.0s on 4G, Cumulative Layout Shift near zero, homepage payload under 1 MB.

**On watermarking / right-click blocking:** I'd skip both. Right-click blocking is trivially bypassed and reads as amateurish; visible watermarks cheapen the work against competitors showing clean images. Real protection is that displayed images cap at 2000px, originals never go on the server, and metadata carries your copyright. Say the word and I'll add a subtle corner mark.

**One workflow note:** your original full-resolution files are **not** stored here — only web variants. Your masters stay in your own backup (Lightroom catalog, external drive, cloud). The site is a display layer, not an archive, and 100 GB fills up fast if you treat it as one.

### 2.6 Video

Stills-led, with a few embeds. YouTube or Vimeo links pasted into the admin panel, rendered with a **click-to-load facade** — a poster frame that only pulls in the player iframe when clicked, keeping ~1 MB of player JavaScript off every page load. Vimeo Plus (~$12/mo) is worth it if you want no suggested-video ads and no YouTube branding.

The schema carries a `video_provider` column, so self-hosting later is an isolated change.

---

## 3. Visual direction

You have no branding yet, so I'm proposing a full direction. This is the part most worth arguing with me about — it's cheap to change now and expensive later.

### 3.1 Concept: instrument panel

"Synchro" implies precision, timing, mechanical sync. The design language borrows from spec sheets and gauge clusters, not from car-culture clichés (no racing stripes, no chrome, no italic speed lines). Restraint reads as expensive; dealerships and owners of nice cars respond to expensive.

**The photography is the only source of color.** Everything else is neutral. A red car should be the loudest thing on any page it appears on.

### 3.2 Palette — dark canvas

Dark backgrounds are near-universal in serious photography portfolios for a reason: images look better, the interface recedes, and it separates you from the flat-white template sites your competitors use.

```
Ink        #0A0A0B   page background
Surface    #141416   cards, admin panels
Line       #26262A   hairline borders — 1px, never a shadow
Muted      #8A8A93   secondary text, metadata
Paper      #F4F4F5   primary text
Signal     #C8442A   accent — a deep oxide red, used sparingly
```

`Signal` appears only on interactive things that matter: the primary button, an active filter, a focus ring. Never as decoration. If a page has more than two red elements, something's wrong.

Admin panel uses the same tokens so it feels like part of your business rather than a bolted-on CMS.

### 3.3 Typography

- **Geist Sans** — headings and body. Neutral, modern, engineered-feeling, wide weight range, free and self-hosted (no Google Fonts request, faster and better for privacy).
- **Geist Mono** — micro-labels, spec data, image captions. This is where the automotive feel lives: `2019 · PORSCHE 911 GT3 · SCOTTSDALE`.

Rules: headings in tight tracking at large sizes; uppercase mono labels at 11px with wide tracking; body at 16–17px with 1.6 line height. A strict type scale, no arbitrary sizes.

### 3.4 Layout and motion

- Wide margins, generous vertical rhythm. Whitespace is the main luxury signal.
- Editorial gallery grid — varied tile sizes and deliberate rhythm, not a uniform 3-column square grid that looks like a stock photo site.
- Radii ≤ 2px. No drop shadows anywhere; separation comes from hairline borders and background steps.
- Motion is minimal and fast: images fade up on scroll (250ms), page transitions crossfade. No parallax, no counters, no scroll-jacking. Everything respects `prefers-reduced-motion`.
- Fully responsive; the portfolio is designed mobile-first since most first visits will be phones.

### 3.5 Logo

I'll produce a wordmark, not an icon-and-name lockup — a clean type-driven `SYNCHRO MEDIA` with a considered detail (likely a tightened S/Y pair or a fine baseline rule suggesting alignment/sync). Deliverables: horizontal wordmark, stacked variant, favicon monogram, light and dark versions, SVG + PNG. If you'd rather hire a designer for this, the site is built so the logo is one file to swap.

---

---

## 4. Site map

| Route | Purpose |
|---|---|
| `/` | Hero image or short reel, positioning line, 6 featured projects, service summary, dealership teaser, testimonial, quote CTA |
| `/work` | Full portfolio, filterable: Dealership · Personal · Events. Client-side filter, no page reload |
| `/work/[slug]` | Project page — full gallery, vehicle spec block, optional video, context paragraph, next-project link |
| `/dealerships` | B2B pitch. See §4.1 |
| `/services` | Packages and starting prices for private/event clients, all admin-editable |
| `/about` | Company bio, your bio, portrait, gear/approach, service area |
| `/contact` | Quote request form + direct contact details |
| `/privacy` | Privacy policy — required, since you collect personal data |
| `/admin/*` | Password-protected. Not linked from the public site, excluded from `robots.txt` |

### 4.1 The dealership page — where the money is

This page is the highest-leverage thing on the site and gets a different structure from the rest. Dealers don't buy on aesthetics; they buy on throughput, consistency, and whether your files drop into their listing workflow without friction. It covers:

- **Turnaround SLA** stated plainly ("shot by 2pm, delivered by 9am next day")
- **Per-unit and volume pricing** tiers
- **Consistency** — a strip showing 8+ vehicles shot to identical framing and lighting, which is the actual dealer pain point
- **Delivery** — how files arrive (shared drive, FTP, direct to their DMS/listing provider) and in what specs. Worth naming that you export to the dimension and count requirements of the major listing platforms; dealers deal with rejected or badly cropped uploads constantly and nobody advertises solving it
- **Before/after** — phone snapshots vs. your work, side by side. This sells harder than any copy
- **Recurring engagement CTA** — a weekly/biweekly lot cadence, not a one-off booking

---

### 4.2 Atlanta — what local-first actually means here

You're competing in a metro of roughly six million people with one of the densest dealership corridors in the Southeast. Local positioning has to be specific enough to be credible, not just the word "Atlanta" sprinkled into headings.

**Where the dealership money is.** The volume is not downtown — it's the perimeter and the northern suburbs. Gwinnett County alone (Duluth, Buford, Lawrenceville) has an enormous concentration of franchise dealers, along with Marietta and Kennesaw in Cobb, Alpharetta and Roswell in North Fulton, Chamblee/Doraville along Buford Highway, and the Union City corridor to the south. The `/dealerships` page should name the counties you'll serve and state your travel radius plainly, because a sales manager in Buford's first question is whether you'll actually come to them.

**Locations sell the personal work.** Atlanta has a recognizable visual vocabulary and your portfolio should show you know it: the Jackson Street Bridge skyline (iconic, and heavily shot — worth having a fresher alternative), Ponce City Market and the BeltLine, Pullman Yards, the industrial West End, Stone Mountain, Buford Dam and Lake Lanier, and for track work, Road Atlanta in Braselton, Atlanta Motor Speedway in Hampton, and Atlanta Motorsports Park in Dawsonville. Tagging projects by location — the schema already supports it — makes the portfolio browsable by "I want that backdrop," which is exactly how private clients choose.

**Events are a real lane here.** Caffeine and Octane is one of the largest monthly car gatherings in the country and it's in your backyard; the Atlanta Concours d'Elegance draws a very different, higher-end crowd. Import Alliance and the region's Cars and Coffee circuit fill out the calendar. Event coverage is worth its own portfolio category and its own line on `/services`.

**Two local realities the site should reflect:**

- **Pollen season.** For roughly six weeks in spring, everything in Atlanta is coated yellow. This genuinely affects car photography — a freshly detailed car is compromised in twenty minutes outdoors. Your quote form's flexibility field and your scheduling copy should acknowledge weather and season dependence, and honestly, being the photographer who *mentions* this is a small credibility signal to anyone local.
- **Summer storms and humidity.** Afternoon thunderstorms are routine June through August, which is another argument for the request-and-confirm scheduling model in §5.2 over a rigid booking calendar. Golden hour is your asset; the copy should imply you plan around light and weather rather than just showing up.

**SEO targets** for launch metadata and `LocalBusiness` structured data: *automotive photographer Atlanta*, *car photography Atlanta*, *dealership vehicle photography Atlanta*, *car event photographer Georgia*. Suburb-level pages (Marietta, Alpharetta, Duluth, Buford) are the natural second wave — the architecture supports adding them later without rework, and I'd hold off until the core site has been live and indexed for a couple of months.

---

---

## 5. Data model (Supabase / Postgres)

Simplified — full DDL with constraints, indexes, and triggers comes in Phase 1.

```
projects            portfolio pieces
  id, slug, title, category, client_name, is_client_public,
  vehicle_year, vehicle_make, vehicle_model, location, shoot_date,
  summary, body, cover_image_id, video_url, video_provider,
  status (draft|published), is_featured, sort_order, seo_title,
  seo_description, created_at, updated_at

project_images
  id, project_id, storage_path, alt_text, width, height,
  blur_data_url, sort_order, created_at

services            packages shown on /services and /dealerships
  id, slug, name, audience, blurb, starting_price_cents,
  price_note, bullets (jsonb), sort_order, is_active

site_content        every editable string on the site
  key, label, content_type (text|richtext|image), value,
  group, sort_order, updated_at
  -- e.g. key='home.hero.headline', key='about.owner_bio'

testimonials
  id, quote, author_name, author_role, company,
  is_published, sort_order

quote_requests      inbound leads
  id, created_at, name, email, phone, company, audience,
  service_id, vehicle_details, location, preferred_dates,
  timeline, budget_range, message, source_page,
  status (new|contacted|quoted|scheduled|won|lost),
  admin_notes, contacted_at

admin_users         allowlist of who may access /admin
  user_id, email, created_at
```

**`site_content` is what makes the site self-editable.** Every headline, paragraph, and bio on the public site reads from this table by key. Adding an editable field later is one row, not a code change. Values are read at build time and baked into the static pages, so they cost nothing at runtime — and they update on your next publish (§2.4).

### 5.1 Row Level Security — now the primary defense

On a server-rendered site, sensitive operations sit behind server code and RLS is a second layer. **Here there is no server**, so the admin panel talks to Supabase directly from your browser and RLS is the *only* thing standing between a stranger and your data. That raises its importance from good practice to load-bearing.

The policies:

- **Anonymous visitors:** `SELECT` only, and only on published rows — `projects.status='published'`, `services.is_active`, `testimonials.is_published`. Draft work is invisible even to someone querying the API directly.
- **`quote_requests`:** no public access at all, including insert. Submissions go exclusively through the Edge Function (§8), which holds the service role key server-side. A publicly insertable leads table would be enumerable and spammable.
- **Admin writes:** every insert/update/delete policy requires `auth.uid()` to exist in `admin_users`. Adding a second person later is one row.
- **`admin_users` itself:** readable and writable by nobody through the API. Managed only from the Supabase dashboard, so a compromised admin session can't grant itself company.

**Because RLS is load-bearing, Phase 8 includes explicit adversarial testing** — I write a test suite that authenticates as anonymous and as a non-admin user and asserts that every table rejects reads and writes it should. Not a review of the policies; an attempt to break them.

**One accepted consequence:** your admin JavaScript bundle is publicly downloadable. That's not a breach — the data stays protected by RLS — but it does reveal the admin's structure to anyone curious. The mitigation is that knowing the structure buys an attacker nothing when the policies are correct, which is exactly why the testing above matters.

### 5.2 On scheduling

You chose request-first, which I think is right for this business. Shoots aren't 30-minute calls — they depend on weather, location, vehicle count, and light. Letting a stranger drop a 3-hour block onto your calendar creates conflicts you then have to unwind.

So the form collects **preferred dates, time-of-day preference, and flexibility**, and you confirm by replying. The lead board tracks each request through `new → contacted → quoted → scheduled → won/lost`.

If you later want real self-service booking, the clean upgrade is embedding Cal.com for **consultation calls only** — keeping actual shoots on the request-and-confirm flow. That's a one-day addition whenever you want it.

---

---

## 6. Security — the PHP image service

This gets its own section because it's the one part of this architecture that doesn't exist in a managed-platform build, and because file upload endpoints are among the most commonly exploited things on the web. It is entirely solvable. It just has to be done exactly, not approximately.

### 6.1 The threat

An unauthenticated or sloppily validated upload endpoint lets an attacker put a file of their choosing onto your server. If that file can then be executed, they are running code on your hosting account — reading your database credentials, serving malware from your domain, or sending spam that gets your domain blacklisted. You would likely not notice for weeks.

### 6.2 The controls

Every one of these ships in Phase 4. None is optional.

| Control | Implementation |
|---|---|
| **Authentication** | Every request carries your Supabase access token. PHP validates it server-to-server against `/auth/v1/user`, then checks the user id against `admin_users`. No token, no upload |
| **Execution disabled in `/uploads/`** | `.htaccess` turning the PHP engine off for the entire directory tree. Even a successfully uploaded `.php` is inert — this is the single most important line in the build |
| **Content validation** | Files are verified by decoding them as images. Extension and client-supplied MIME type are ignored entirely |
| **Server-generated filenames** | UUID + dimension. No user input ever reaches a filesystem path — no traversal, no overwriting |
| **Extension allowlist** | Written extensions are fixed by the server (`.webp`, `.jpg`), never derived from the upload |
| **Size + rate limits** | Hard byte cap per file; per-session upload rate limit; PHP `upload_max_filesize` and `post_max_size` set deliberately rather than left at defaults |
| **Delete endpoint** | Same auth, plus verification that the target path sits inside `/uploads/` and belongs to a project you own |
| **Directory listing off** | No browsing `/uploads/` |
| **Secrets** | No Supabase service role key on SiteGround, ever. The PHP service only validates tokens; it never holds elevated database credentials |

### 6.3 Verification, not assumption

Phase 8 is a dedicated hardening pass where I actively try to break what I built:

- Upload a PHP file renamed to `.jpg` and confirm it cannot execute
- Upload a polyglot file (valid image *and* valid PHP) and confirm the same
- Attempt uploads with no token, an expired token, and a valid non-admin token
- Attempt path traversal in every field that touches the filesystem
- Attempt to delete another project's files
- Run the RLS adversarial suite from §5.1
- Confirm Cloudflare is not caching anything under `/api/`

I'll hand you the results as a written checklist, not a verbal "it's fine."

### 6.4 Ongoing

- **Keep PHP on a supported version** in Site Tools. An abandoned PHP version is the most common way a site like this gets compromised a year later. This goes in your runbook (§9, Phase 9).
- SiteGround's daily backups cover the site files and images; the database backup is separate and covered in §10.2.
- Cloudflare sits in front, so the origin isn't directly exposed to casual scanning.

---

## 7. Admin panel

At `/admin`, behind Supabase Auth email + password. A client-side React app served as static files, same visual language as the public site, usable on a phone because you'll want to publish from the road.

| Screen | What you can do |
|---|---|
| **Dashboard** | New leads, unpublished-changes indicator, publish button, recent activity |
| **Leads** | Pipeline board. Open a request, see everything submitted, add private notes, change status, reply by email |
| **Portfolio** | List all projects, drag to reorder, toggle featured, publish/unpublish, duplicate |
| **Project editor** | All fields, plus multi-file drag-and-drop upload with per-file progress, drag-to-reorder gallery, set cover image, alt text per image |
| **Preview** | Renders any draft exactly as it will appear, live from Supabase, no rebuild needed (§2.4) |
| **Services** | Edit packages, prices, bullets, ordering, active state |
| **Site content** | Every editable string grouped by page — hero headline, company bio, your bio, dealership copy |
| **Testimonials** | Add, edit, publish, reorder |
| **Settings** | Contact details, social links, service area, your password |

**Deliberate choices:**
- **The publish indicator is always visible.** On a static site the single worst failure mode is editing happily for twenty minutes without realizing nothing is live. The UI never lets that happen.
- Drafts and preview, so nothing half-finished ships by accident
- Bulk upload with client-side resize and per-file progress — uploading 30 photos over hotel wifi has to actually complete
- Drag-to-reorder everywhere, so you control presentation order without sort-priority fields
- Optimistic UI with toasts; the panel should feel instant even though publishing isn't

---

## 8. Quote request flow

1. Visitor submits from `/contact`, `/dealerships`, or a project page. Fields adapt to whether they pick dealership, personal, or event — a dealer sees "monthly vehicle volume," an owner sees "vehicle details."
2. Client-side validation (Zod + React Hook Form) for fast feedback.
3. **POST to a Supabase Edge Function**, which re-validates everything server-side. Browser validation is UX, not security.
4. The function verifies the Turnstile token, checks the honeypot, and rate-limits by IP.
5. Row written to `quote_requests` using the service role key — held inside the Edge Function, never in the browser and never on SiteGround.
6. **You** get an email with everything, readable on a phone, linking straight to the lead in your admin panel.
7. **They** get an immediate branded auto-reply confirming receipt and stating when you'll respond.
8. On-page success state, not a redirect to a dead thank-you page.

**Email failure must never lose a lead.** The database write happens first and succeeds independently; send failures are logged and surfaced on the dashboard.

Note that this flow is entirely live — it does not depend on the build pipeline. **A visitor can always submit a quote, even if a deploy is broken.** Worth knowing: the static site can go stale without costing you a customer, which is a meaningful safety property of this design.

---

## 9. Build phases

| Phase | Work | Est. |
|---|---|---|
| **1 — Foundation** | Repo, Next.js static export config, Tailwind, Supabase project, full schema, RLS policies, seed data, admin auth. SiteGround account config: PHP version, Imagick confirmation (incl. AVIF support), SFTP keys, staging environment, Cloudflare in front. | 2 days |
| **2 — Design system** | Logo, tokens, type scale, core components (buttons, forms, nav, footer, image grid, lightbox). Delivered as a component gallery you review before real pages exist. | 2–3 days |
| **3 — Public site** | All 6 pages with placeholder content, fully responsive. **This is where you'll have the most opinions.** | 3–4 days |
| **4 — Image service** | The PHP upload/delete endpoints, Imagick variant generation, and **every control in §6.2**. Split out from the admin panel deliberately — it's security-critical and deserves its own focused pass. | 2 days |
| **5 — Admin panel** | Auth flow, all CRUD screens, upload UI with client-side resize, drag-reorder, preview renderer, lead board. | 4–5 days |
| **6 — Publish pipeline** | GitHub Actions build + SFTP deploy, `repository_dispatch` trigger, build manifest, status polling, staging deploy target, rollback procedure. | 2–3 days |
| **7 — Leads & email** | Edge Function, Turnstile, rate limiting, both email templates, pipeline statuses. | 1–2 days |
| **8 — Security & hardening** | The full §6.3 verification pass plus the §5.1 RLS adversarial suite. Written results handed to you. | 1 day |
| **9 — Polish & launch** | SEO (metadata, sitemap, `LocalBusiness` + `ImageObject` JSON-LD, OG images), performance pass against §2.5 targets, accessibility audit (keyboard nav, contrast, screen reader on gallery and lightbox), analytics, privacy policy, database backup automation, uptime + keepalive monitors, **your written runbook**, DNS cutover, launch. | 3 days |

**Roughly 20–25 working days.** The SiteGround architecture adds about 4–5 days over a managed-platform build, concentrated in Phases 4, 6, and 8.

**The critical path runs through you, not me.** Phase 5 needs your real photos and Phase 9 needs final copy. Start assembling your 8–12 strongest projects now — images, vehicle details, location, and a sentence of context each. That set is what the site sells with, and gathering it reliably takes longer than people expect.

---

## 10. Services and costs

### 10.1 What you pay

| Service | Role | Cost |
|---|---|---|
| **SiteGround GoGeek** (or GrowBig) | Static site, 100 GB image storage, PHP/Imagick, daily backups, staging, domain, DNS, business email | **Already paying** |
| **Supabase** free tier | Postgres + Auth + Edge Functions | **$0** |
| **Cloudflare** free plan | CDN, DNS, Turnstile | **$0** |
| **Resend** | Transactional email, 3,000/mo | **$0** |
| **GitHub + Actions** | Repo, build, deploy, scheduled backups | **$0** |
| **UptimeRobot** | Uptime alerts + Supabase keepalive | **$0** |
| **Umami / Plausible** | Analytics | **$0–9/mo** |

**Additional monthly cost beyond your existing SiteGround plan: $0.**

**Software licensing: nothing to buy.** Next.js, React, Tailwind, shadcn/ui, Imagick, PHP, and Geist fonts are all free and open source. If you later want a commercial typeface instead of Geist, web licenses run $200–600 one-time.

### 10.2 Two Supabase free-tier realities we design around

**No backups.** The free tier retains no snapshots. Your lead database is a revenue asset and cannot be unprotected, so Phase 9 sets up a **scheduled GitHub Action running `pg_dump`**, encrypted and retained. I verify an actual restore before launch — a backup you haven't restored from is a guess. SiteGround's own daily backups separately cover your images and site files, which gives you a clean split: SiteGround protects the files, GitHub protects the data.

**Free projects pause after 7 days without API requests.** Data survives, but the project goes offline until manually resumed — and it would fail precisely when a dealership clicks your link during a quiet stretch. Fix: UptimeRobot pings a cheap Supabase REST query every 5 minutes, which handles uptime alerting and keepalive in one.

If you'd rather not carry either, Supabase Pro ($25/mo) removes both. Not needed at launch, and worth revisiting once leads are flowing.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| **The upload endpoint is compromised** | §6 in full, verified adversarially in Phase 8, plus keeping PHP current via your runbook. Highest-severity risk in this build and treated accordingly |
| **RLS misconfiguration exposes data** | RLS is load-bearing here (§5.1). Adversarial test suite in Phase 8, not just a policy review |
| **Publish pipeline breaks silently** | Build status surfaced in the admin, failures shown not swallowed, staging deploy before production, documented rollback. Quote submissions bypass the pipeline entirely (§8) so leads keep arriving regardless |
| **Image weight tanks performance** | Pipeline in §2.5 with hard budgets enforced in Phase 9 |
| **Empty-portfolio launch** | Ship with 8–12 projects minimum. Start gathering in Phase 1, not Phase 5 |
| **Admin goes unused, site goes stale** | Bulk upload, drafts, instant preview, mobile-usable, drag-reorder. If publishing a shoot takes more than five minutes, I built it wrong |
| **Single-admin lockout** | `admin_users` supports a backup account from day one; password reset wired in Phase 5 |
| **Client confidentiality** | `is_client_public` per project — show the work, hide the client |
| **Local SEO takes months** | Correct `LocalBusiness` schema and per-page metadata from launch. Google Business Profile is your highest-return next step; suburb landing pages are the natural second wave |

---

## 12. Next steps

**You:**
1. Confirm your SiteGround plan — **GrowBig or GoGeek**. StartUp won't work (no staging, §2.2). If you're on StartUp, upgrading is the one purchase this plan requires.
2. Confirm the exact domain name.
3. Decide whether you want business email at the domain — SiteGround includes it, and `blake@synchromedia.com` beats a Gmail address on a dealership pitch.
4. React to the visual direction in §3 — the dark canvas and oxide red especially. Cheapest thing to change now, expensive later. Send sites you like or hate.
5. Start assembling your 8–12 strongest projects: images, vehicle details, location, a sentence of context each. **This is the critical path.**
6. Decide your stated response time for the client auto-reply — pick a number you'll actually hit.
7. Tell me which Atlanta lanes in §4.2 you're already working and which you want to break into. That changes what the homepage leads with.

**Me, on greenlight:**
Phase 1 — repo, Supabase project, schema, RLS, auth, and SiteGround configuration including confirming Imagick's AVIF support, which determines the exact variant set in §2.5.

---

## Appendix — Alternatives considered

Recorded so the reasoning isn't lost, and so a future developer understands why the architecture looks the way it does. **These are closed, not open options.**

| Path | Extra monthly | Build delta | Why not chosen |
|---|---|---|---|
| **SiteGround + PHP images** *(chosen)* | **$0** | +4–5 days | Uses storage already paid for. Costs build time and a security surface we control tightly |
| SiteGround + Supabase Storage | $25 (Supabase Pro) | +3–4 days | Strictly worse — pays for storage you already own |
| Hetzner VPS + Coolify | ~$12 | +1–2 days | Cheaper than managed, full feature set, but you become the sysadmin |
| Vercel Pro + Supabase | $20 → $45 | baseline | Simplest and most capable; rejected on cost |
| WordPress on SiteGround | $0 | different project | Solves media and admin out of the box, but abandons Supabase and the custom design |

**Two facts that drove the decision:** SiteGround's shared and cloud plans do not support Node.js, which rules out a live Next.js server there; and Imagick is enabled by default on PHP 7.4+, which makes a self-hosted responsive image pipeline genuinely viable rather than a compromise.

**What would change the calculus later:** if the operational load of the publish pipeline becomes annoying, or if you want a client delivery portal (which wants a real server), the migration path is Vercel or a VPS. The Supabase schema, the design system, and all page content move unchanged — only the image service and deploy pipeline would be rebuilt. Roughly a three-day migration, not a rewrite.

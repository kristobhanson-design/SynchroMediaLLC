# Setup — accounts and services

Things only you can do, because they need your logins. Everything here is
Phase 1 (PLAN.md §9). Nothing below costs money.

Work through them in order; each section says what to send me when it's done.

---

## 1. Supabase project

> **Project created:** ref `gxzxlcopknxzcfpphyyv`
> → `https://gxzxlcopknxzcfpphyyv.supabase.co`

1. Sign up at [supabase.com](https://supabase.com) and create a project.
   - **Name:** `synchro-media`
   - **Region:** `us-east-1` (N. Virginia) — closest to Atlanta
   - **Plan:** Free
   - Save the database password somewhere safe; it is shown once.
2. Wait for provisioning (~2 min).
3. **Migrations.** Once the Supabase MCP server is authenticated (see below),
   I can apply these myself and verify the result — you don't need to do this
   step manually. If you'd rather run them by hand, open **SQL Editor** and run
   the three files in `supabase/migrations/` **in filename order**, one at a
   time:
   - `20260819000001_schema.sql`
   - `20260819000002_rls.sql`
   - `20260819000003_seed.sql`

   Each should report success. If one errors, stop and send me the message —
   don't run the next.
4. Create your admin login: **Authentication → Users → Add user**.
   Use a real email and a strong password. Tick *Auto Confirm User*.
5. Copy the new user's UUID, then run in the SQL editor:

   ```sql
   insert into public.admin_users (user_id, email)
   values ('PASTE-UUID-HERE', 'your@email.com');
   ```

   This allowlist is what every write policy checks. Creating an auth user
   alone grants nothing.

**Send me:** your Project URL and the **anon/public** key
(Project Settings → API).

> Send the anon key only. It is designed to be public and ships in the browser
> bundle. **Never send the `service_role` key** — it bypasses all security and
> belongs only in Edge Function secrets.

---

## 2. SiteGround

Plan: **GrowBig** (50 GB, staging, SSH). Domain: **synchromediallc.com**.

### 2a. PHP version and Imagick

Site Tools → **Devs → PHP Manager**. Set PHP to **8.2 or newer**.

Then confirm Imagick is present and knows WebP. Site Tools → **Devs → SSH Keys
Manager**, then from your terminal:

```bash
php -m | grep -i imagick && php -r 'print_r(Imagick::queryFormats("WEBP"));'
```

Expected: `imagick`, then an array containing `WEBP`.

Also worth checking whether AVIF is available — it saves ~20% over WebP, and
determines the exact variant set in PLAN.md §2.5:

```bash
php -r 'print_r(Imagick::queryFormats("AVIF"));'
```

An empty array just means we ship WebP only. Not a problem, only a decision.

### 2b. Staging

Site Tools → **WordPress → Staging** creates a staging copy. If staging is only
offered for WordPress installs on your plan, tell me — we'll use a
`staging.synchromediallc.com` subdomain instead, which works just as well for a
static site.

### 2c. SFTP account for deploys

Site Tools → **Site → FTP Accounts**. Create an account used only by CI:

- **Username:** `deploy`
- **Path:** the document root for synchromediallc.com

**Send me:** the FTP hostname, username, and the document root path.
**Send the password separately** from the other details, and not in a plain
chat log if you can avoid it — I'll put it straight into GitHub Actions secrets
where it's encrypted.

---

## 3. Cloudflare

Free plan. This puts a CDN in front of SiteGround so images are served from an
Atlanta edge node, and gives us Turnstile for the quote form.

1. Sign up at [cloudflare.com](https://cloudflare.com), **Add a site** →
   `synchromediallc.com`, choose **Free**.
2. Cloudflare lists your current DNS records — check the A record points at
   your SiteGround IP, and that **MX records are present** if you use
   SiteGround email. Losing MX records breaks your email.
3. Cloudflare gives you two nameservers. Set them at your registrar.
   *(If the domain is registered at SiteGround: Site Tools → Domain → DNS.)*
4. SSL/TLS → set encryption mode to **Full (strict)**.

**Careful:** DNS changes take up to 48h to propagate. Do this before we have
anything live, not during launch week.

**Send me:** confirmation once the domain shows *Active* in Cloudflare.

---

## 4. GitHub

1. Create a **private** repo named `synchro-media`.
2. Send me the URL — I'll push what's built so far.

Repository secrets get added in Phase 6 when the deploy pipeline is built.
Nothing to do now beyond creating it.

---

## What I need from you, in one list

- [ ] Supabase Project URL + **anon** key
- [ ] Confirmation the three migrations ran clean
- [ ] Confirmation you're in `admin_users`
- [ ] PHP version, and the Imagick WebP/AVIF results
- [ ] SFTP host, username, document root (password separately)
- [ ] Cloudflare showing *Active*
- [ ] GitHub repo URL

None of it blocks me. Phase 2 (design system) needs none of the above, so I can
keep building while you work through it.

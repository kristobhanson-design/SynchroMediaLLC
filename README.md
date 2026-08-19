# Synchro Media LLC — synchromediallc.com

Automotive photography and video for dealerships, private owners and car events
across metro Atlanta.

## Documentation

| | |
|---|---|
| [PLAN.md](PLAN.md) | Architecture, design direction, data model, build phases. Start here |
| [docs/SETUP.md](docs/SETUP.md) | Account setup steps — Supabase, SiteGround, Cloudflare, GitHub |

## Architecture in one paragraph

The public site is a **statically exported Next.js app** served by
**SiteGround** (which cannot run Node). Content lives in **Supabase**
(Postgres + Auth); the admin panel at `/admin` is a browser app that talks to
it directly, so **RLS is the only security boundary** — see PLAN.md §5.1.
Images are uploaded to a small **PHP + Imagick service** on SiteGround that
generates responsive variants at upload time (§2.5, §6). Publishing triggers a
**GitHub Actions** rebuild and SFTP deploy (§2.4).

## Local development

Requires Node 24 LTS.

```bash
npm install
cp .env.example .env.local   # then fill in Supabase values
npm run dev
```

```bash
npm run build
```

`next build` emits the deployable site to `out/`.

## Layout

```
src/            Next.js app (public site + admin)
supabase/
  migrations/   Schema, RLS policies, seed content
  functions/    Edge Functions (quote form) — Phase 7
php/            Image service + Apache config, deployed to SiteGround
  .htaccess     Security headers (next.config `headers` is unavailable here)
  api/          upload.php / delete.php — Phase 4
  uploads/      Persistent image storage. NEVER wiped by a deploy
docs/
```

## Non-obvious things

- **`php/uploads/.htaccess` is the most important file in the repo.** It stops
  anything in the upload directory from executing. It deliberately avoids
  `php_flag engine off`, which 500s under PHP-FPM.
- **Deploys must not delete `uploads/` or `api/`.** The SFTP sync excludes
  them; they are server state, not build output.
- **`headers` in `next.config.ts` does nothing** under `output: 'export'`.
  Security headers live in `php/.htaccess`.
- **Image variant widths are declared in three places** and must stay in sync:
  `src/lib/images.ts`, `next.config.ts`, and `php/api/upload.php`.

# Moving to SiteGround's Node.js Project

Why: the site has run as a static export (`output: "export"`, built by
GitHub Actions, rsynced to an Apache docroot) since launch, because
SiteGround couldn't run a Node server. That forced three workarounds —
admin edits only go live after a full rebuild+redeploy ("Publish" = a
multi-minute CI run), image uploads go through a separate PHP/GD service,
and security headers live in `php/.htaccess` instead of `next.config.ts` —
all three of which exist only because there was no server. Now that
SiteGround's Node.js Projects give us a real one, this branch
(`siteground-node-migration`) removes all three.

**What changed in the code**, so you know what this cutover actually
depends on:

- `next.config.ts` — `output: "export"` is gone. Security headers moved
  here from `php/.htaccess`.
- `src/lib/content.ts` — content is now fetched at request time and cached
  by tag (`unstable_cache`), instead of once at build time. `src/app/api/
  revalidate/route.ts` is the new Publish target: it invalidates that tag,
  which is a sub-second operation instead of the old rebuild-and-redeploy.
  This also means the `GITHUB_TOKEN` Edge Function secret that was blocking
  Publish is no longer needed at all — the whole dependency is gone, not
  just unblocked.
- `src/app/api/upload/route.ts` / `src/app/api/delete/route.ts` — replace
  `php/api/upload.php` / `delete.php`. Uses `sharp` instead of GD, and
  writes to a new Supabase Storage bucket (`project-images`, migration
  `20261014000000_project_images_storage.sql`) instead of local disk —
  see `src/lib/images.ts`'s comment: a GitHub-connected auto-redeploy
  product shouldn't be trusted to preserve arbitrary local files across
  deploys the way the old rsync (with its careful `/uploads` exclude) did.
- `supabase/functions/publish/index.ts` and `php/api/*` are marked
  deprecated in place, not deleted yet — `main` still needs them until the
  steps below are done. Final cleanup list is at the bottom.

## Steps (yours — these are all dashboard/credential actions)

1. **Create the Node.js Project.** Client Area → Websites → Node.js
   Projects → create one. Connect it to the `kristobhanson-design/
   SynchroMediaLLC` GitHub repo, branch `siteground-node-migration` for
   now (switch to `main` after this branch is merged). Framework preset
   should auto-detect Next.js; if it offers to fill in build
   command/output directory, the right values are build command
   `npm run build`, start command `npm start` (standard Next.js, not a
   static output directory — there isn't one anymore).
2. **Environment variables**, in that project's Site Tools (not GitHub
   Actions secrets — this is a separate settings panel): copy every
   `NEXT_PUBLIC_*` value from `.env.production`. Nothing non-public needs
   adding — this server still never holds the Supabase service role key
   (PLAN.md §6.2), same rule as before, just enforced in a different place
   now (see `src/lib/admin-auth.ts`'s comment).
3. **Let it build and deploy to the temporary domain** SiteGround gives it.
   Before pointing the real domain at it, sanity-check on that temp URL:
   homepage loads with real content, `/admin` login works, a test image
   upload actually appears (proves the Storage bucket + RLS policies
   below are right), and Publish updates the live page within a few
   seconds of clicking it (no CI run to wait on — if it takes longer than
   that, something's still pointed at the old pipeline).
4. **Storage bucket migration**: I added
   `supabase/migrations/20261014000000_project_images_storage.sql` but
   couldn't apply it — Supabase looked paused (same inactivity signature
   as the 2026-09-11 incident: control-plane calls work, direct DB calls
   time out). Resume the project from the Supabase dashboard; I'll apply
   it myself once it's reachable, no action needed from you beyond the
   resume.
5. **Point the domain.** Once the temp-URL checks above all pass, assign
   `synchromediallc.com` to this Node.js Project in Site Tools. This is
   the actual cutover moment — traffic moves from the Apache static site
   to the new server.
6. **Confirm it's live for real**, same bar as the original 2026-09-11
   deploy verification: homepage serves real Supabase content (not a
   fallback), a real admin login → edit → Publish round-trip reflects
   within seconds, a real image upload survives a page reload.

## Cleanup, once step 6 is confirmed (not before)

- Merge `siteground-node-migration` into `main`.
- Delete `.github/workflows/deploy.yml` and the `SITEGROUND_*` GitHub
  secrets — SiteGround's own GitHub connection (step 1) replaces it
  entirely; nothing left needs rsync/SSH access to the old Apache host.
- Delete `php/` entirely (`api/upload.php`, `api/delete.php`,
  `api/_auth.php`, `.htaccess`, `uploads/.htaccess`) and
  `supabase/functions/publish/` (`supabase functions delete publish`,
  then remove the `GITHUB_TOKEN`/`GITHUB_REPO` Edge Function secrets if
  they were ever set).
- Decommission the old Apache static site / document root on SiteGround,
  once you're confident nothing still points at it.

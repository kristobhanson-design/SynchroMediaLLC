// Synchro Media — admin "Publish" action (PLAN.md §2.4 "the publish
// pipeline"). The public site is a static export baked at build time, so an
// admin edit to Supabase content isn't live until a rebuild runs. This
// function is what the Dashboard's Publish button calls: it dispatches the
// existing "Deploy to SiteGround" GitHub Actions workflow
// (.github/workflows/deploy.yml, which already has `workflow_dispatch:`
// wired up) and then stamps site_meta.last_published_at.
//
// Secrets this function needs (Project Settings → Edge Functions → Secrets,
// or `supabase secrets set`):
//   GITHUB_TOKEN  - required. A fine-grained PAT scoped to just this repo,
//                   with "Actions: Read and write" permission. Nothing else
//                   in this codebase can create this for you — it has to be
//                   minted from a GitHub account with access to the repo.
//   GITHUB_REPO   - optional, defaults to the repo below.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically into
// every Edge Function; they are not set by hand.
//
// Until GITHUB_TOKEN is set, this returns a clear 500 rather than silently
// no-op'ing — unlike the quote function's missing-Resend-key case, there is
// no reasonable "degrade gracefully" here: Publish either starts a real
// deploy or it should say so.

import { createClient } from "jsr:@supabase/supabase-js@2";

const DEFAULT_REPO = "kristobhanson-design/SynchroMediaLLC";
const WORKFLOW_FILE = "deploy.yml";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ ok: false, error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Server-to-server validation of the caller's own session, then check
  // against the admin allowlist directly (service role bypasses RLS) —
  // same shape of check as php/api/_auth.php's require_admin().
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ ok: false, error: "Invalid or expired session" }, 401);
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!adminRow) {
    return json({ ok: false, error: "Not authorized" }, 403);
  }

  const githubToken = Deno.env.get("GITHUB_TOKEN");
  if (!githubToken) {
    return json(
      { ok: false, error: "Publish isn't configured yet — the GITHUB_TOKEN Edge Function secret is missing." },
      500,
    );
  }
  const repo = Deno.env.get("GITHUB_REPO") || DEFAULT_REPO;

  const dispatchRes = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "synchro-media-publish",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (!dispatchRes.ok) {
    console.error("GitHub workflow dispatch failed", dispatchRes.status, await dispatchRes.text());
    return json({ ok: false, error: "Could not start the deploy. Check the function logs." }, 502);
  }

  // Optimistic: the dispatch succeeded and every real run of this workflow
  // so far has gone green (see project-deployment memory), so we stamp the
  // publish time now rather than polling GitHub's run status back into the
  // dashboard. If a deploy ever fails silently after this, the fix is to
  // check the Actions tab — see the deployment memory for that pointer.
  const { error: updateError } = await supabase
    .from("site_meta")
    .update({ last_published_at: new Date().toISOString() })
    .eq("id", 1);
  if (updateError) {
    console.error("site_meta update failed", updateError);
  }

  return json({ ok: true }, 200);
});

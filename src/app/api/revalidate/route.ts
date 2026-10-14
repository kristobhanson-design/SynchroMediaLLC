import { revalidateTag } from "next/cache";
import { withAdmin } from "@/lib/admin-auth";
import { SITE_CONTENT_TAG } from "@/lib/content";

/**
 * The new "Publish" target (Dashboard.tsx's handlePublish), replacing
 * supabase/functions/publish/index.ts now that the site is a real Node
 * server instead of a static export (docs/NODE_MIGRATION.md).
 *
 * The old Edge Function existed because a static export has no concept of
 * "refresh the content" short of a full rebuild+redeploy — it dispatched
 * GitHub Actions' deploy.yml via workflow_dispatch and waited on a
 * multi-minute CI run for even a one-line copy edit. With content fetched
 * at request time and cached by tag (src/lib/content.ts), publishing is
 * just invalidating that tag — same-origin, no CORS, no GitHub PAT, no CI
 * run. This also retires the open "GITHUB_TOKEN Edge Function secret is
 * missing" blocker from project-admin-panel memory: nothing here needs a
 * GitHub credential at all.
 *
 * `{ expire: 0 }` (not the recommended `"max"` profile) deliberately: Publish
 * is a human clicking a button who explicitly wants the change live now, not
 * "eventually, serving stale content meanwhile" — same intent the old
 * full-rebuild model had. See revalidateTag's own docs on this tradeoff.
 */
export async function POST(req: Request) {
  return withAdmin(req, async (supabase) => {
    revalidateTag(SITE_CONTENT_TAG, { expire: 0 });

    const { error } = await supabase
      .from("site_meta")
      .update({ last_published_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      // Non-fatal: the actual revalidation above already happened, so the
      // live content is already correct — only the Dashboard's "last
      // published at" timestamp would be stale. Matches the old Edge
      // Function's same call being best-effort for the same reason.
      console.error("site_meta update failed", error);
    }

    return Response.json({ ok: true });
  });
}

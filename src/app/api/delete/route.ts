import { withAdmin } from "@/lib/admin-auth";
import { VARIANT_WIDTHS } from "@/lib/images";

/**
 * Image delete — replaces php/api/delete.php. Same auth as upload (PLAN.md
 * §6.2 "Delete endpoint: same auth, plus verification that the target path
 * sits inside the uploads namespace"). Ownership-by-project is still
 * skipped: one admin account, and withAdmin() already gates this endpoint
 * entirely. Revisit if a second admin is ever added.
 */
const STORAGE_BUCKET = "project-images";
const STORAGE_PATH_RE = /^uploads\/[0-9a-fA-F-]{36}\/[0-9a-f]{32}$/;

export async function POST(req: Request) {
  return withAdmin(req, async (supabase) => {
    const body = await req.json().catch(() => null);
    const storagePath = typeof body?.storage_path === "string" ? body.storage_path : "";

    // Must be exactly "uploads/<project-uuid>/<uuid>" — two fixed-shape
    // segments, so there's no way to address an object outside this
    // project's own upload namespace inside the shared bucket.
    if (!STORAGE_PATH_RE.test(storagePath)) {
      return Response.json({ ok: false, error: "Invalid storage_path" }, { status: 400 });
    }

    const objectPaths = VARIANT_WIDTHS.map((width) => `${storagePath}-${width}.webp`);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(objectPaths);
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, deleted: data?.length ?? 0 });
  });
}

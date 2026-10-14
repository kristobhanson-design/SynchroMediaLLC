import sharp from "sharp";
import { withAdmin } from "@/lib/admin-auth";
import { VARIANT_WIDTHS } from "@/lib/images";

/**
 * Image upload — replaces php/api/upload.php now that the site runs as a
 * real Node server instead of a static export (docs/NODE_MIGRATION.md).
 * Auth is handled by admin-auth.ts's withAdmin(); everything below only
 * runs once that's passed.
 *
 * sharp replaces GD here (GD was itself a 2026-09-12 fallback after
 * Imagick turned out to be unavailable on the old PHP host — see
 * project-admin-panel memory). sharp is already a project dependency
 * (moved from devDependencies — see package.json) and has real advantages
 * over both: `.rotate()` with no arguments auto-orients from the EXIF tag
 * directly (GD needed ~15 lines of manual exif_read_data/imagerotate
 * handling for this), and `.blur(sigma)` is a real single-pass Gaussian
 * blur (GD's imagefilter(IMG_FILTER_GAUSSIAN_BLUR) is mild per call, hence
 * the old code's 6-pass loop).
 *
 * Variants are written to Supabase Storage, not local disk — see
 * src/lib/images.ts's STORAGE_BUCKET comment for why local disk isn't
 * trustworthy under SiteGround's Node.js Project model.
 *
 * Deliberately deferred, same as the PHP version before it: a non-WebP
 * fallback, AVIF variants, and a per-session upload rate limit. None of
 * those are load-bearing for a single-admin authenticated endpoint.
 */

// Keep in sync with src/lib/images.ts VARIANT_WIDTHS.
const MAX_BYTES = 15 * 1024 * 1024;
const STORAGE_BUCKET = "project-images";
const PROJECT_ID_RE = /^[0-9a-fA-F-]{36}$/;

export async function POST(req: Request) {
  return withAdmin(req, async (supabase) => {
    const form = await req.formData();
    const projectId = form.get("project_id");
    const file = form.get("file");

    if (typeof projectId !== "string" || !PROJECT_ID_RE.test(projectId)) {
      return Response.json({ ok: false, error: "Missing or invalid project_id" }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return Response.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ ok: false, error: "File too large (max 15MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate by decoding actual image content — never trust the
    // extension or the client-supplied MIME type (PLAN.md §6.2 "Content
    // validation"). sharp throws on genuinely undecodable input.
    let meta;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      return Response.json({ ok: false, error: "Could not decode image" }, { status: 400 });
    }
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      return Response.json({ ok: false, error: "File is not a valid JPEG, PNG, or WebP image" }, { status: 400 });
    }

    // EXIF orientations 5-8 involve a 90°/270° rotation, which swaps the
    // reported dimensions once .rotate() below applies it. metadata() only
    // reports the pre-rotation values, so swap by hand to match what the
    // client actually ends up seeing — same post-rotation values the old
    // GD code returned after its own manual orientation fix.
    const rotated = (meta.orientation ?? 1) >= 5;
    const origWidth = (rotated ? meta.height : meta.width) ?? 0;
    const origHeight = (rotated ? meta.width : meta.height) ?? 0;

    const oriented = sharp(buffer).rotate();

    // Server-generated filename only — no path segment ever comes from
    // user input (PLAN.md §6.2 "Server-generated filenames").
    const uuid = crypto.randomUUID().replace(/-/g, "");
    const storagePath = `uploads/${projectId}/${uuid}`;

    for (const width of VARIANT_WIDTHS) {
      // withoutEnlargement: never upscale past the original, same as the
      // old resized()'s `min($targetWidth, $srcWidth)`. The written
      // filename still uses the nominal width regardless (see
      // src/lib/images.ts's own comment on this).
      const variant = await oriented
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(`${storagePath}-${width}.webp`, variant, { contentType: "image/webp", upsert: true });
      if (error) {
        return Response.json({ ok: false, error: `Upload failed: ${error.message}` }, { status: 500 });
      }
    }

    // 20px-class blur placeholder, inlined as base64 (PLAN.md §2.5 step 5).
    const blurBuffer = await oriented
      .clone()
      .resize({ width: 24, withoutEnlargement: true })
      .blur(8)
      .webp({ quality: 40 })
      .toBuffer();
    const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

    return Response.json({
      ok: true,
      storage_path: storagePath,
      width: origWidth,
      height: origHeight,
      blur_data_url: blurDataUrl,
    });
  });
}

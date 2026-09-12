<?php
/**
 * Image upload — PLAN.md §2.5 and §6.2. Auth is handled by _auth.php's
 * require_admin(); everything below only runs once that has passed.
 *
 * Uses GD, not Imagick. Confirmed via SSH on 2026-09-12 (see
 * project-admin-panel memory): Imagick isn't installed on this SiteGround
 * plan at all — not even present-but-disabled, checked the filesystem
 * directly and found nothing. GD is available and this build supports
 * WebP (and AVIF, though that's not wired up here — see below).
 *
 * Deliberately deferred (matches the pattern already used for Resend/
 * Turnstile elsewhere in this project — see project-quote-form-backend
 * memory): a JPEG fallback, AVIF variants (this GD build can produce them,
 * but src/lib/images.ts and next.config.ts would both need updating to
 * pick between formats per-browser — real work beyond just getting
 * uploads working), and a per-session upload rate limit. None of those
 * are load-bearing — this is a single-admin authenticated endpoint, not a
 * public one.
 */

require_once __DIR__ . '/_auth.php';

require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_response(405, ['ok' => false, 'error' => 'Method not allowed']);
}

if (!extension_loaded('gd') || !function_exists('imagewebp')) {
  json_response(500, ['ok' => false, 'error' => 'GD with WebP support is not available on this server']);
}

// Keep in sync with src/lib/images.ts VARIANT_WIDTHS.
const VARIANT_WIDTHS = [400, 800, 1200, 2000];
// Browser already downsamples to 3000px long edge before uploading — this
// cap is a backstop against a client that skips that step, not the primary
// size control.
const MAX_BYTES = 15 * 1024 * 1024;

$projectId = $_POST['project_id'] ?? '';
if (!preg_match('/^[0-9a-fA-F-]{36}$/', $projectId)) {
  json_response(400, ['ok' => false, 'error' => 'Missing or invalid project_id']);
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  json_response(400, ['ok' => false, 'error' => 'No file uploaded']);
}

$tmpPath = $_FILES['file']['tmp_name'];
if (!is_uploaded_file($tmpPath)) {
  json_response(400, ['ok' => false, 'error' => 'Invalid upload']);
}
if (filesize($tmpPath) > MAX_BYTES) {
  json_response(413, ['ok' => false, 'error' => 'File too large (max 15MB)']);
}

// Validate by decoding actual image content — never trust the extension or
// the client-supplied MIME type (PLAN.md §6.2 "Content validation").
$info = @getimagesize($tmpPath);
if ($info === false || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
  json_response(400, ['ok' => false, 'error' => 'File is not a valid JPEG, PNG, or WebP image']);
}

$source = @imagecreatefromstring(file_get_contents($tmpPath));
if ($source === false) {
  json_response(400, ['ok' => false, 'error' => 'Could not decode image']);
}

// GD has no built-in auto-orient (Imagick's autoOrient()) — apply the EXIF
// orientation tag by hand. Only JPEGs carry one.
if ($info[2] === IMAGETYPE_JPEG) {
  $exif = @exif_read_data($tmpPath);
  $orientation = $exif['Orientation'] ?? 1;
  $rotated = match ($orientation) {
    3 => imagerotate($source, 180, 0),
    6 => imagerotate($source, -90, 0),
    8 => imagerotate($source, 90, 0),
    default => null,
  };
  if ($rotated !== null) {
    imagedestroy($source);
    $source = $rotated;
  }
}

$origWidth = imagesx($source);
$origHeight = imagesy($source);

/** Resizes to fit within $targetWidth, preserving aspect ratio, never upscaling. */
function resized(\GdImage $src, int $srcWidth, int $srcHeight, int $targetWidth): \GdImage {
  $targetWidth = min($targetWidth, $srcWidth);
  $targetHeight = max(1, (int) round($srcHeight * ($targetWidth / $srcWidth)));
  $dst = imagecreatetruecolor($targetWidth, $targetHeight);
  // Preserve alpha for PNG/WebP sources with transparency.
  imagealphablending($dst, false);
  imagesavealpha($dst, true);
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $targetWidth, $targetHeight, $srcWidth, $srcHeight);
  return $dst;
}

// Server-generated filename only — no path segment ever comes from user
// input (PLAN.md §6.2 "Server-generated filenames").
$uuid = bin2hex(random_bytes(16));
$dir = __DIR__ . '/../uploads/' . $projectId;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
  imagedestroy($source);
  json_response(500, ['ok' => false, 'error' => 'Could not create upload directory']);
}

foreach (VARIANT_WIDTHS as $width) {
  // The written filename always uses the nominal width so
  // src/lib/images.ts's fixed variant set stays correct even for a source
  // narrower than one of the larger breakpoints — resized() itself caps
  // the actual pixel content at the original size.
  $variant = resized($source, $origWidth, $origHeight, $width);
  imagewebp($variant, "$dir/$uuid-$width.webp", 82);
  imagedestroy($variant);
}

// 20px blur placeholder, inlined as base64 (PLAN.md §2.5 step 5). GD's
// Gaussian blur filter is mild per application, so it's applied a few
// times to get a real blur rather than a light softening.
$blur = resized($source, $origWidth, $origHeight, 24);
for ($i = 0; $i < 6; $i++) {
  imagefilter($blur, IMG_FILTER_GAUSSIAN_BLUR);
}
ob_start();
imagewebp($blur, null, 40);
$blurBytes = ob_get_clean();
imagedestroy($blur);
$blurDataUrl = 'data:image/webp;base64,' . base64_encode((string) $blurBytes);

imagedestroy($source);

// Extension-less, variant-less base — see project_images.storage_path's
// comment in the schema migration. Variants live alongside as
// "<storage_path>-<width>.webp".
json_response(200, [
  'ok' => true,
  'storage_path' => "uploads/$projectId/$uuid",
  'width' => $origWidth,
  'height' => $origHeight,
  'blur_data_url' => $blurDataUrl,
]);

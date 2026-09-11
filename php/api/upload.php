<?php
/**
 * Image upload — PLAN.md §2.5 and §6.2. Auth is handled by _auth.php's
 * require_admin(); everything below only runs once that has passed.
 *
 * Deliberately deferred (matches the pattern already used for Resend/
 * Turnstile elsewhere in this project — see project-quote-form-backend
 * memory): the 1200px JPEG fallback, AVIF variants, and a per-session
 * upload rate limit. None of those are load-bearing — this is a single-
 * admin authenticated endpoint, not a public one — and src/lib/images.ts
 * only ever requests the WebP variants generated below.
 */

require_once __DIR__ . '/_auth.php';

require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_response(405, ['ok' => false, 'error' => 'Method not allowed']);
}

if (!extension_loaded('imagick')) {
  json_response(500, ['ok' => false, 'error' => 'Imagick is not available on this server']);
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

try {
  $source = new Imagick($tmpPath);
  $source->autoOrient();
} catch (\Throwable $e) {
  json_response(400, ['ok' => false, 'error' => 'Could not decode image']);
}

$origWidth = $source->getImageWidth();
$origHeight = $source->getImageHeight();

// Server-generated filename only — no path segment ever comes from user
// input (PLAN.md §6.2 "Server-generated filenames").
$uuid = bin2hex(random_bytes(16));
$dir = __DIR__ . '/../uploads/' . $projectId;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
  $source->destroy();
  json_response(500, ['ok' => false, 'error' => 'Could not create upload directory']);
}

foreach (VARIANT_WIDTHS as $width) {
  $variant = clone $source;
  // Never upscale past the original — the written filename still uses the
  // nominal width so src/lib/images.ts's fixed variant set stays correct
  // even for a source narrower than one of the larger breakpoints.
  $targetWidth = min($width, $origWidth);
  $variant->resizeImage($targetWidth, 0, Imagick::FILTER_LANCZOS, 1);
  $variant->setImageFormat('webp');
  $variant->setImageCompressionQuality(82);
  $variant->stripImage();
  $variant->writeImage("$dir/$uuid-$width.webp");
  $variant->clear();
  $variant->destroy();
}

// 20px blur placeholder, inlined as base64 (PLAN.md §2.5 step 5).
$blur = clone $source;
$blur->resizeImage(24, 0, Imagick::FILTER_LANCZOS, 1);
$blur->blurImage(0, 4);
$blur->setImageFormat('webp');
$blur->setImageCompressionQuality(40);
$blurDataUrl = 'data:image/webp;base64,' . base64_encode($blur->getImageBlob());
$blur->clear();
$blur->destroy();

$source->clear();
$source->destroy();

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

<?php
/**
 * Image delete — PLAN.md §6.2 "Delete endpoint: same auth, plus
 * verification that the target path sits inside /uploads/". Ownership-by-
 * project is skipped: there is exactly one admin account today and
 * is_admin() already gates this endpoint entirely, so that extra check
 * would add complexity without adding any real protection yet. Revisit if
 * a second admin is ever added.
 */

require_once __DIR__ . '/_auth.php';

require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_response(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$input = json_decode(file_get_contents('php://input'), true);
$storagePath = is_array($input) ? ($input['storage_path'] ?? '') : '';

// Must be exactly "uploads/<project-uuid>/<uuid>" — two fixed-shape
// segments, no dots or slashes possible inside either, so a resolved
// realpath can never leave the uploads root.
if (!preg_match('#^uploads/([0-9a-fA-F-]{36})/([0-9a-f]{32})$#', $storagePath, $m)) {
  json_response(400, ['ok' => false, 'error' => 'Invalid storage_path']);
}

$uploadsRoot = realpath(__DIR__ . '/../uploads');
if ($uploadsRoot === false) {
  json_response(500, ['ok' => false, 'error' => 'Uploads directory missing']);
}

$dir = $uploadsRoot . '/' . $m[1];
$uuid = $m[2];

$deleted = 0;
foreach ([400, 800, 1200, 2000] as $width) {
  $real = realpath("$dir/$uuid-$width.webp");
  // strpos check keeps this inside uploads/ even if the regex above were
  // ever loosened — belt and braces on a delete endpoint.
  if ($real !== false && strpos($real, $uploadsRoot . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
    unlink($real);
    $deleted++;
  }
}

json_response(200, ['ok' => true, 'deleted' => $deleted]);

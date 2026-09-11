<?php
/**
 * Shared admin-auth check for every endpoint in this directory.
 *
 * admin_users is deliberately unreachable via the API (no grants to any
 * role — see supabase/migrations/20260820163901_rls_policies.sql), and this
 * server must never hold the service role key (PLAN.md §6.2: "No Supabase
 * service role key on SiteGround, ever"). The bridge is public.is_admin():
 * a SECURITY DEFINER function, EXECUTE granted to `authenticated`, that
 * evaluates auth.uid() against admin_users server-side and returns a plain
 * boolean. We forward the caller's own Supabase access token to it — same
 * pattern already proven by supabase/functions/quote.
 *
 * SUPABASE_URL/ANON_KEY are safe to hardcode: both are the same publishable
 * values already committed in .env.production (they ship inside the site's
 * JS bundle regardless of where else they live — see that file's own
 * comment). RLS is what protects the data, not keeping these secret.
 */

const SUPABASE_URL = 'https://gxzxlcopknxzcfpphyyv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_CyflqsDU3hHK2i-wzVrYnw_PvjWPnnI';

function json_response(int $status, array $body): never {
  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($body);
  exit;
}

function bearer_token(): ?string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
    return trim($m[1]);
  }
  return null;
}

function supabase_post(string $path, string $token, array $body = []): array {
  $ch = curl_init(SUPABASE_URL . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body),
    CURLOPT_HTTPHEADER => [
      'Authorization: Bearer ' . $token,
      'apikey: ' . SUPABASE_ANON_KEY,
      'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT => 10,
  ]);
  $raw = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$status, $raw === false ? null : json_decode($raw, true)];
}

function supabase_get(string $path, string $token): array {
  $ch = curl_init(SUPABASE_URL . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
      'Authorization: Bearer ' . $token,
      'apikey: ' . SUPABASE_ANON_KEY,
    ],
    CURLOPT_TIMEOUT => 10,
  ]);
  $raw = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$status, $raw === false ? null : json_decode($raw, true)];
}

/** Exits with 401/403 on failure. Returns nothing on success — just continue. */
function require_admin(): void {
  $token = bearer_token();
  if (!$token) {
    json_response(401, ['ok' => false, 'error' => 'Missing Authorization header']);
  }

  [$userStatus, $user] = supabase_get('/auth/v1/user', $token);
  if ($userStatus !== 200 || !isset($user['id'])) {
    json_response(401, ['ok' => false, 'error' => 'Invalid or expired session']);
  }

  [$adminStatus, $isAdmin] = supabase_post('/rest/v1/rpc/is_admin', $token);
  if ($adminStatus !== 200 || $isAdmin !== true) {
    json_response(403, ['ok' => false, 'error' => 'Not an admin']);
  }
}

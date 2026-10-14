import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node.js server build — SiteGround's "Node.js Project" product runs a
  // real `next start`-style server now (see docs/NODE_MIGRATION.md), so the
  // static-export workaround this repo used until 2026-10 (output:"export",
  // rsync to Apache, a whole separate PHP API for uploads) is gone. This is
  // deliberately NOT `output: "standalone"`: SiteGround's own build step
  // runs `npm run build` + `npm start` against the full repo, it isn't a
  // Docker-style "copy a minimal folder" deploy, so there's nothing for
  // `standalone`'s trimmed node_modules copy to buy us here.

  // No longer load-bearing now that there's a real server and content is
  // fetched + cache-tagged at request time (src/lib/content.ts) instead of
  // baked in at build time, but harmless to keep: it only affects how a
  // bare "/work" URL resolves, not whether a server exists.
  trailingSlash: true,

  images: {
    // Kept as a custom loader rather than switching to the built-in
    // optimizer: variants are still pre-generated at upload time (now by
    // src/app/api/upload/route.ts using sharp, writing into Supabase
    // Storage instead of local disk — see that route's own comment for
    // why), so there's nothing for Next's own optimizer to do per request
    // that isn't already done. Re-optimizing an already-optimized WebP
    // variant on every request would just be wasted CPU on every page load.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Must match VARIANT_WIDTHS in src/lib/images.ts and the upload route.
    deviceSizes: [400, 800, 1200, 2000],
    imageSizes: [400, 800],
  },

  // Security headers used to live in php/.htaccess (the only place they
  // could, under output:"export" — `headers` is unsupported there). Ported
  // here verbatim now that a real server can set them itself. HSTS stays
  // commented out for the same reason the old .htaccess comment gave: it's
  // only safe to turn on once HTTPS is confirmed solid end to end on the
  // new hosting path, and it's hard to walk back once real visitors have
  // cached it.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
        ],
      },
      {
        // The admin panel and any API response must never be cached by an
        // intermediate proxy — same intent as the old .htaccess rule for
        // *.php responses, just matched by path instead of extension now
        // that there's no .php at all.
        source: "/(admin|api)/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;

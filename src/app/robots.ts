import type { MetadataRoute } from "next";

// Required under output:'export' — see next.config.ts and the static-export
// docs' "Route Handlers" section (metadata routes are handled the same way).
export const dynamic = "force-static";

// No sitemap entry: there's no sitemap.xml route in this repo, and pointing
// crawlers at one that 404s is worse than omitting it. Add one here if a
// sitemap route is ever built.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
  };
}

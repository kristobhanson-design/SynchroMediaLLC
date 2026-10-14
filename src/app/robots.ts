import type { MetadataRoute } from "next";

// Was required under output:'export' (see next.config.ts's history) — kept
// now that there's a real server too, since nothing here needs to be
// per-request dynamic and a static robots.txt is one less thing to cache
// wrong.
export const dynamic = "force-static";

// No sitemap entry: there's no sitemap.xml route in this repo, and pointing
// crawlers at one that 404s is worse than omitting it. Add one here if a
// sitemap route is ever built.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
  };
}

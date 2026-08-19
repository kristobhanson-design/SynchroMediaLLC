import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `next build` emits ./out for SFTP deploy to SiteGround.
  // SiteGround runs Apache and cannot run a Node server (see PLAN.md §2).
  output: "export",

  // Apache serves /work/index.html for /work/ — trailing slashes avoid 404s.
  trailingSlash: true,

  images: {
    // The default optimizer needs a Node server. Ours are pre-generated at
    // upload time by php/api/upload.php, so we just map width -> variant file.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Must match VARIANT_WIDTHS in src/lib/images.ts and upload.php.
    deviceSizes: [400, 800, 1200, 2000],
    imageSizes: [400, 800],
  },

  // NOTE: `headers` is unsupported under output:'export'. Security headers
  // (CSP, X-Frame-Options, HSTS) are set in php/.htaccess instead. See §6.
};

export default nextConfig;

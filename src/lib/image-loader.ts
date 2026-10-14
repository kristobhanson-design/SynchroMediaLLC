import { variantUrl } from "./images";

/**
 * Custom next/image loader (next.config.ts -> images.loaderFile).
 *
 * Variants are pre-generated at upload time (src/app/api/upload/route.ts,
 * via sharp) and live in Supabase Storage, not this app's own filesystem —
 * see src/lib/images.ts's STORAGE_BUCKET comment for why. A custom loader
 * still gives us srcset generation, lazy loading and blur placeholders
 * without asking Next's own optimizer to redundantly re-encode an
 * already-sized WebP file on every request. `quality` is ignored: it's
 * baked in when the upload route writes the variant.
 */
export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
}): string {
  return variantUrl(src, width);
}

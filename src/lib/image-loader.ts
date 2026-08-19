import { variantUrl } from "./images";

/**
 * Custom next/image loader (next.config.ts -> images.loaderFile).
 *
 * Static export disables the built-in optimizer, but a custom loader still
 * gives us srcset generation, lazy loading and blur placeholders. `quality` is
 * ignored: it is baked in when Imagick writes the variant at upload time.
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

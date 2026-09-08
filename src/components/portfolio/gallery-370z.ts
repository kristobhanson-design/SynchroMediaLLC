import manifest from "../../../public/hero/370z/manifest.json";

export const GALLERY_370Z = (manifest.frames as string[]).map(
  (f) => `/hero/370z/${f}`
);

export const GALLERY_370Z_COVER = "/hero/370z/poster.webp";

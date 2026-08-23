import manifest from "../../../public/hero/370z/manifest.json";

export const HERO = {
  dir: "/hero/370z",
  poster: "/hero/370z/poster.webp",
  frames: manifest.frames as string[],
  width: manifest.width as number,
  height: manifest.height as number,
};

/**
 * Caption bands, positioned in scroll progress (0..1 through the pinned hero).
 *
 * The beats follow the shoot itself rather than being imposed on it: the
 * exterior orbit, then the details a buyer asks about, then the interior, then
 * the close. The hero is not decoration here — it IS the sales argument, since
 * what a dealer is buying is exactly this: a complete listing set of their car.
 */
export type Band = {
  from: number;
  to: number;
  label: string;
  head: string;
  sub?: string;
  align: "left" | "right" | "center";
};

export const BANDS: Band[] = [
  {
    from: 0.0, to: 0.26,
    label: "2013 Nissan 370Z",
    head: "Every angle a buyer looks for.",
    sub: "Shot on a dealer lot in metro Atlanta.",
    align: "left",
  },
  {
    from: 0.28, to: 0.5,
    label: "Wheels · Engine bay",
    head: "The details they always ask about.",
    sub: "Answered before anyone picks up the phone.",
    align: "right",
  },
  {
    from: 0.52, to: 0.72,
    label: "Interior",
    head: "Interiors lit properly.",
    sub: "No blown windows. No orange dashboards.",
    align: "left",
  },
  {
    from: 0.74, to: 0.9,
    label: "Badges · Exhaust · Trim",
    head: "The small things that build trust.",
    align: "right",
  },
  {
    from: 0.93, to: 1.0,
    label: "24 frames · one afternoon",
    head: "This is one listing set.",
    sub: "Delivered by 9am the next business day.",
    align: "center",
  },
];

/* ---------------------------------------------------------------------------
   Pure mapping functions.

   Extracted so the scrub's behaviour is testable without a browser: the rAF
   loop that calls them cannot run in a backgrounded tab, so the arithmetic
   gets its own tests instead of being verified by eye.
   See scripts/test-hero-mapping.mjs.
--------------------------------------------------------------------------- */

export const BAND_FADE = 0.05;

/** Progress 0..1 -> { index, frac } into the frame sequence. */
export function frameAt(p: number, count: number) {
  const clamped = Math.min(1, Math.max(0, p));
  const f = clamped * (count - 1);
  const index = Math.min(count - 1, Math.max(0, Math.floor(f)));
  return { index, frac: f - index };
}

/** A band's eased visibility at progress `p`, 0..1. */
export function bandK(band: Pick<Band, "from" | "to">, p: number) {
  const f = BAND_FADE;
  if (p < band.from - f || p > band.to + f) return 0;
  let k: number;
  if (p < band.from) k = (p - (band.from - f)) / f;
  else if (p > band.to) k = 1 - (p - band.to) / f;
  else k = 1;
  return Math.max(0, Math.min(1, k));
}

/**
 * Encodes the hero video from source masters.
 *
 *   node scripts/build-hero-video.mjs
 *
 * `hero-wide` and `hero-tall` come from two *different* masters, not one
 * cropped two ways — a change from the original version of this script.
 * `hero-tall` still comes from a vertical 9:16 ProRes master (2160x3840, shot
 * for phones) via a 16:9 centre crop for the desktop... no — `hero-wide` was
 * originally that crop. It has since been replaced: Blake supplied a native
 * 16:9 4K master ("Website Vid.mov", v210/uncompressed, 3840x2160) shot
 * specifically as a multi-location desktop hero reel, so `hero-wide` is now a
 * plain scale-down of that, no crop needed. `hero-tall` is unchanged — still
 * the old vertical master, since nothing vertical-native has replaced it.
 *
 * `-g 8 -keyint_min 8` was originally load-bearing for scroll-scrub seeking;
 * the hero is a plain autoplay loop now, but the tight GOP is harmless and
 * kept for consistency.
 */
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import { mkdirSync } from "node:fs";

const WIDE_SRC = process.argv[2] ?? "Media/Videos/Website Vid.mov";
const TALL_SRC = process.argv[3] ?? "Media/Videos/370 ATL Lot 5-31 final alone .mov";
const OUT = "public/hero/video";
mkdirSync(OUT, { recursive: true });

const ENCODE = ["-c:v", "libx264", "-preset", "slow", "-g", "8", "-keyint_min", "8",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"];

// WIDE_SRC is already native 16:9 — scale only, no crop.
execFileSync(ffmpeg, [
  "-v", "error", "-stats", "-i", WIDE_SRC,
  "-vf", "scale=1280:720,format=yuv420p",
  ...ENCODE, "-crf", "27", "-y", `${OUT}/hero-wide.mp4`,
]);

// TALL_SRC is 2160x3840 (vertical) — scale to the native aspect.
execFileSync(ffmpeg, [
  "-v", "error", "-stats", "-i", TALL_SRC,
  "-vf", "scale=720:1280,format=yuv420p",
  ...ENCODE, "-crf", "26", "-y", `${OUT}/hero-tall.mp4`,
]);

// The poster covers reduced-motion and the pre-load frame; the ending frame is
// a free, perfectly on-brand still for a lower section.
execFileSync(ffmpeg, ["-v", "error", "-i", `${OUT}/hero-wide.mp4`,
  "-frames:v", "1", "-q:v", "3", "-update", "1", "-y", `${OUT}/poster.jpg`]);
execFileSync(ffmpeg, ["-v", "error", "-sseof", "-0.1", "-i", `${OUT}/hero-wide.mp4`,
  "-update", "1", "-frames:v", "1", "-q:v", "3", "-y", `${OUT}/ending.jpg`]);

console.log("hero video written to", OUT);

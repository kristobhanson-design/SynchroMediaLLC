/**
 * Encodes the hero video from a ProRes master.
 *
 *   node scripts/build-hero-video.mjs "Media/Videos/<file>.mov"
 *
 * The masters are vertical 9:16 (2160x3840, 10-bit 4:2:2, ~12 GB) because they
 * were cut for social. That drives two outputs rather than one:
 *
 *   hero-wide  16:9 centre crop, for the desktop scroll-scrub
 *   hero-tall  native 9:16, for phones, where it plays instead of scrubbing
 *
 * `-g 8 -keyint_min 8` is the setting that matters. A browser can only seek
 * cleanly to a keyframe, so a long GOP is the difference between a scrub that
 * tracks the scroll and one that stutters. Verified: seeks land exactly on the
 * requested timestamp.
 */
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";
import { mkdirSync } from "node:fs";

const src = process.argv[2] ?? "Media/Videos/370 ATL Lot 5-31 final alone .mov";
const OUT = "public/hero/video";
mkdirSync(OUT, { recursive: true });

// Source is 2160x3840; a full-width 16:9 slice is 2160x1215, centred at y=1312.
const SCRUB = ["-c:v", "libx264", "-preset", "slow", "-g", "8", "-keyint_min", "8",
               "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an"];

execFileSync(ffmpeg, [
  "-v", "error", "-stats", "-i", src,
  "-filter_complex",
  "[0:v]crop=2160:1215:0:1312,scale=1280:720,format=yuv420p[wide];" +
  "[0:v]scale=720:1280,format=yuv420p[tall]",
  "-map", "[wide]", ...SCRUB, "-crf", "24", "-y", `${OUT}/hero-wide.mp4`,
  "-map", "[tall]", ...SCRUB, "-crf", "26", "-y", `${OUT}/hero-tall.mp4`,
], { stdio: "inherit" });

// The poster covers reduced-motion and the pre-load frame; the ending frame is
// a free, perfectly on-brand still for a lower section.
execFileSync(ffmpeg, ["-v", "error", "-i", `${OUT}/hero-wide.mp4`,
  "-frames:v", "1", "-q:v", "3", "-update", "1", "-y", `${OUT}/poster.jpg`]);
execFileSync(ffmpeg, ["-v", "error", "-sseof", "-0.1", "-i", `${OUT}/hero-wide.mp4`,
  "-update", "1", "-frames:v", "1", "-q:v", "3", "-y", `${OUT}/ending.jpg`]);

console.log("hero video written to", OUT);

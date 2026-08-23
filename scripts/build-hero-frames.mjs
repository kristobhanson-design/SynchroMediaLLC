/**
 * Builds the scroll-scrub hero frame sequence.
 *
 *   node scripts/build-hero-frames.mjs
 *
 * Source is a real listing shoot (Media/Pictures/370 z Listing Shoot) — 24
 * frames at 25MP, ~13 MB each. Shipping those is obviously out; this crops
 * them to a common 16:9, resizes, and writes WebP.
 *
 * Why a frame sequence rather than an MP4: with 24 discrete frames there is
 * nothing to gain from video, and a good deal to lose. Scroll-scrubbing video
 * means fighting seek latency, keyframe intervals and codec jank — most of the
 * complexity in a scrub pipeline exists for exactly that. Swapping pre-decoded
 * images has none of it, and behaves identically across browsers.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "Media/Pictures/370 z Listing Shoot";
const OUT = "public/hero/370z";
const WIDTH = 1440;
const HEIGHT = 810;            // 16:9 — the shoot is 3:2, so we crop
const QUALITY = 72;

fs.mkdirSync(OUT, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f)).sort();
if (!files.length) throw new Error(`no source frames in ${SRC}`);

const manifest = [];
let total = 0;

for (const [i, file] of files.entries()) {
  const name = `f${String(i).padStart(2, "0")}.webp`;
  const dest = path.join(OUT, name);

  // `attention` picks the crop window by saliency rather than centre, which
  // keeps the car in frame on the detail shots where it sits off-centre.
  await sharp(path.join(SRC, file))
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(dest);

  const bytes = fs.statSync(dest).size;
  total += bytes;
  manifest.push({ i, src: file, file: name, bytes });
}

// The poster is what phones, reduced-motion visitors and the no-JS case see.
// It is the opening frame, so the static hero and the scrub agree.
await sharp(path.join(SRC, files[0]))
  .rotate()
  .resize(1920, 1080, { fit: "cover", position: sharp.strategy.attention })
  .webp({ quality: 78, effort: 6 })
  .toFile(path.join(OUT, "poster.webp"));

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ width: WIDTH, height: HEIGHT, count: manifest.length, frames: manifest.map((m) => m.file) }, null, 2)
);

const kb = (b) => (b / 1024).toFixed(0) + " KB";
console.log(`${manifest.length} frames -> ${OUT}`);
console.log(`  each  ~${kb(total / manifest.length)}`);
console.log(`  total  ${(total / 1048576).toFixed(2)} MB`);
console.log(`  poster ${kb(fs.statSync(path.join(OUT, "poster.webp")).size)}`);

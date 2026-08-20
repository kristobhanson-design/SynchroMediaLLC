/**
 * Synchro Media — brand asset generator.
 *
 * Regenerates every mark from Geist outlines so tracking, rule weight and
 * proportion stay editable rather than frozen as path data.
 *
 *   node docs/brand/generate.mjs
 *
 * Two things worth knowing before editing:
 *  - Each glyph is emitted as its OWN <path>. Concatenating opentype command
 *    arrays into one path corrupts glyphs with counters (D renders as a solid
 *    wedge under the nonzero fill rule).
 *  - Widths are matched on glyph INK extents, not advance widths, so edges
 *    align optically rather than merely arithmetically.
 *
 * Geist is licensed under the SIL Open Font License 1.1 (docs/brand/OFL.txt).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { Resvg } from "@resvg/resvg-js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");

const buf = fs.readFileSync(path.join(HERE, "Geist.ttf"));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const UPM = font.unitsPerEm;
const SIZE = 100;
const CAP = (font.tables.os2.sCapHeight / UPM) * SIZE;
const HAIR = CAP * 0.03;

const INK = "#0a0a0b";
const PAPER = "#f4f4f5";

function layout(text, tracking) {
  const glyphs = [];
  let cursor = 0, inkL = Infinity, inkR = -Infinity;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    const p = g.getPath(cursor, 0, SIZE);
    const bb = p.getBoundingBox();
    inkL = Math.min(inkL, bb.x1);
    inkR = Math.max(inkR, bb.x2);
    glyphs.push(p.toPathData(2));
    cursor += (g.advanceWidth / UPM) * SIZE + tracking * SIZE;
  }
  return { glyphs, inkL, inkR, inkW: inkR - inkL };
}

const trackingForInk = (text, target) =>
  (target - layout(text, 0).inkW) / (SIZE * (text.length - 1));

const paths = (l) => l.glyphs.map((d) => `  <path d="${d}"/>`).join("\n");

function writeSvg(rel, inner, w, h, { fill = "currentColor", bg = null } = {}) {
  const ground = bg ? `  <rect width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${bg}"/>\n` : "";
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" fill="${fill}" role="img" aria-label="Synchro Media">
<title>Synchro Media</title>
${ground}${inner}
</svg>
`;
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, out);
  return out;
}

// ---- primary: stacked, ink-matched ----------------------------------------
const TR_TOP = 0.14;
function stacked() {
  const top = layout("SYNCHRO", TR_TOP);
  const target = top.inkW;
  const trBot = trackingForInk("MEDIA", target);
  const bot = layout("MEDIA", trBot);
  const leading = CAP * 1.58;
  const inner =
`  <g transform="translate(${(-top.inkL).toFixed(2)},${CAP.toFixed(2)})">
${paths(top)}
  </g>
  <rect x="0" y="${(CAP + CAP * 0.40).toFixed(2)}" width="${target.toFixed(2)}" height="${HAIR.toFixed(2)}"/>
  <g transform="translate(${(-bot.inkL).toFixed(2)},${(CAP + leading).toFixed(2)})">
${paths(bot)}
  </g>`;
  writeSvg("public/brand/wordmark-stacked.svg", inner, target, CAP + leading);
  return { trBot, target, botInk: bot.inkW };
}

// ---- secondary: single line ------------------------------------------------
// No rule here on purpose: on one line a full-width hairline reads as an
// underline. The rule stays exclusive to the stacked lockup.
function horizontal() {
  const tr = 0.16;
  const a = layout("SYNCHRO", tr);
  const b = layout("MEDIA", tr);
  const gap = CAP * 0.72;
  const shift = a.inkR + gap - b.inkL;
  const inner =
`  <g transform="translate(${(-a.inkL).toFixed(2)},${CAP.toFixed(2)})">
${paths(a)}
    <g transform="translate(${shift.toFixed(2)},0)">
${paths(b)}
    </g>
  </g>`;
  writeSvg("public/brand/wordmark-horizontal.svg", inner, shift + b.inkR - a.inkL, CAP);
}

// ---- monogram --------------------------------------------------------------
function monogram() {
  const m = layout("SM", 0.03);
  writeSvg("public/brand/monogram.svg",
`  <g transform="translate(${(-m.inkL).toFixed(2)},${CAP.toFixed(2)})">
${paths(m)}
  </g>`, m.inkW, CAP);
  return m;
}

// ---- favicon ---------------------------------------------------------------
// Drawn as its own artwork, not the wordmark scaled down. The wide tracking
// that makes the logo feel deliberate turns to mush below 32px.
function favicon(m) {
  const BOX = 64;
  const inset = 0.16;                        // mark occupies 68% of the square
  const scale = (BOX * (1 - inset * 2)) / m.inkW;
  const x = (BOX - m.inkW * scale) / 2;
  const y = (BOX - CAP * scale) / 2 + CAP * scale;
  const inner =
`  <g transform="translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${scale.toFixed(4)})" fill="${PAPER}">
    <g transform="translate(${(-m.inkL).toFixed(2)},0)">
${paths(m)}
    </g>
  </g>`;
  const svg = writeSvg("src/app/icon.svg", inner, BOX, BOX, { fill: PAPER, bg: INK });

  // apple-icon must be a raster format; iOS also ignores transparency.
  const raster = (px) =>
    new Resvg(svg, { fitTo: { mode: "width", value: px } }).render().asPng();

  for (const [rel, px] of [["src/app/apple-icon.png", 180], ["public/brand/icon-512.png", 512]]) {
    fs.writeFileSync(path.join(ROOT, rel), raster(px));
  }

  // A real favicon.ico, replacing the create-next-app default. Browsers that
  // don't take SVG favicons fall back to this, so leaving Next's placeholder
  // here would ship someone else's logo to exactly those users.
  //
  // Vista-era ICO permits PNG payloads verbatim, so this is a directory header
  // plus the PNGs — no BMP encoding required.
  const sizes = [32, 64];
  const imgs = sizes.map(raster);
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);                 // reserved
  header.writeUInt16LE(1, 2);                 // type: icon
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((px, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(px >= 256 ? 0 : px, e);     // 0 encodes 256
    header.writeUInt8(px >= 256 ? 0 : px, e + 1);
    header.writeUInt8(0, e + 2);                  // palette size
    header.writeUInt8(0, e + 3);                  // reserved
    header.writeUInt16LE(1, e + 4);               // colour planes
    header.writeUInt16LE(32, e + 6);              // bits per pixel
    header.writeUInt32LE(imgs[i].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += imgs[i].length;
  });
  fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), Buffer.concat([header, ...imgs]));
}

const s = stacked();
horizontal();
const m = monogram();
favicon(m);

console.log(`stacked  : MEDIA tracking ${s.trBot.toFixed(4)}em  ink ${s.botInk.toFixed(2)} vs ${s.target.toFixed(2)} (delta ${(s.botInk - s.target).toFixed(3)})`);
console.log(`cap height at size ${SIZE}: ${CAP.toFixed(2)}`);
console.log("assets written.");

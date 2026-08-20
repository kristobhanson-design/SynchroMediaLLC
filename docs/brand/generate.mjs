import fs from "node:fs";
import opentype from "opentype.js";

const buf = fs.readFileSync("Geist.ttf");
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const UPM = font.unitsPerEm;
const CAP = (font.tables.os2.sCapHeight / UPM) * 100;   // cap height at size 100
const SIZE = 100;

/**
 * Lay out text glyph-by-glyph. Each glyph becomes its OWN <path> element —
 * concatenating opentype command arrays into a single path corrupts glyphs
 * with counters (D, A, R) under the nonzero fill rule.
 */
function layout(text, tracking, size = SIZE) {
  const glyphs = [];
  let cursor = 0, inkL = Infinity, inkR = -Infinity;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    const p = g.getPath(cursor, 0, size);
    const bb = p.getBoundingBox();
    inkL = Math.min(inkL, bb.x1);
    inkR = Math.max(inkR, bb.x2);
    glyphs.push({ d: p.toPathData(2), ch });
    cursor += (g.advanceWidth / UPM) * size + tracking * size;
  }
  return { glyphs, inkL, inkR, inkW: inkR - inkL };
}

/** Tracking that makes the INK of `text` exactly `target` wide. */
function trackingForInk(text, target, size = SIZE) {
  const base = layout(text, 0, size).inkW;
  return (target - base) / (size * (text.length - 1));
}

const paths = (l) => l.glyphs.map((g) => `  <path d="${g.d}"/>`).join("\n");
const rect = (x, y, w, h) =>
  `  <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}"/>`;

function write(name, inner, w, h) {
  fs.writeFileSync(name + ".svg",
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" fill="currentColor" role="img" aria-label="Synchro Media">
<title>Synchro Media</title>
${inner}
</svg>
`);
}

const HAIR = CAP * 0.03;

// -- A: index mark between the words -----------------------------------------
{
  const tr = 0.16;
  const a = layout("SYNCHRO", tr);
  const gap = CAP * 0.62;
  const bx = a.inkR + gap;
  const b = layout("MEDIA", tr);
  const over = CAP * 0.26;
  const shiftB = bx - b.inkL;
  const total = shiftB + b.inkR - a.inkL;
  const inner =
`<g transform="translate(${(-a.inkL).toFixed(2)},${(CAP + over).toFixed(2)})">
${paths(a)}
${rect(a.inkR + (gap - HAIR) / 2, -CAP - over, HAIR, CAP + over * 2)}
  <g transform="translate(${(shiftB - -a.inkL - 0).toFixed(2)},0)">
${paths(b)}
  </g>
</g>`;
  write("concept-a", inner, total, CAP + over * 2);
}

// -- B: broken baseline rule -------------------------------------------------
{
  const tr = 0.16;
  const a = layout("SYNCHRO", tr);
  const gap = CAP * 0.78;
  const b = layout("MEDIA", tr);
  const shiftB = a.inkR + gap - b.inkL;
  const total = shiftB + b.inkR - a.inkL;
  const ruleY = CAP * 0.44;
  const aW = a.inkR - a.inkL;
  const inner =
`<g transform="translate(${(-a.inkL).toFixed(2)},${CAP.toFixed(2)})">
${paths(a)}
  <g transform="translate(${shiftB.toFixed(2)},0)">
${paths(b)}
  </g>
${rect(a.inkL, ruleY, aW, HAIR)}
${rect(a.inkR + gap, ruleY, b.inkR - b.inkL, HAIR)}
</g>`;
  write("concept-b", inner, total, CAP + ruleY + HAIR);
}

// -- C: stacked, ink-width matched -------------------------------------------
// MEDIA is tracked until its INK is exactly as wide as SYNCHRO's. The name,
// executed in the typography rather than decorated on top of it.
{
  const trTop = 0.14;
  const top = layout("SYNCHRO", trTop);
  const target = top.inkW;
  const trBot = trackingForInk("MEDIA", target);
  const bot = layout("MEDIA", trBot);
  const leading = CAP * 1.58;
  const ruleY = CAP * 0.40;
  const inner =
`<g transform="translate(0,${CAP.toFixed(2)})">
  <g transform="translate(${(-top.inkL).toFixed(2)},0)">
${paths(top)}
  </g>
${rect(0, ruleY, target, HAIR)}
  <g transform="translate(${(-bot.inkL).toFixed(2)},${leading.toFixed(2)})">
${paths(bot)}
  </g>
</g>`;
  write("concept-c", inner, target, CAP + leading);
  console.log(`concept-c: MEDIA tracking ${trBot.toFixed(4)}em; ink ${bot.inkW.toFixed(2)} vs SYNCHRO ${target.toFixed(2)} (delta ${(bot.inkW-target).toFixed(3)})`);
}

// -- monogram ----------------------------------------------------------------
{
  const m = layout("SM", 0.03);
  write("monogram",
`<g transform="translate(${(-m.inkL).toFixed(2)},${CAP.toFixed(2)})">
${paths(m)}
</g>`, m.inkW, CAP);
}

console.log("capHeight@100:", CAP.toFixed(2));

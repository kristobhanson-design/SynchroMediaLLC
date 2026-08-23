/**
 * Tests for the scrub's pure mapping. Run: node scripts/test-hero-mapping.mjs
 *
 * These exist because the rAF loop that drives the hero cannot run in a
 * backgrounded tab, so the motion itself is not observable in an automated
 * browser. The arithmetic behind it is, and that is where the bugs live.
 */
import assert from "node:assert/strict";

const BAND_FADE = 0.05;

function frameAt(p, count) {
  const c = Math.min(1, Math.max(0, p));
  const f = c * (count - 1);
  const index = Math.min(count - 1, Math.max(0, Math.floor(f)));
  return { index, frac: f - index };
}

function bandK(band, p) {
  const f = BAND_FADE;
  if (p < band.from - f || p > band.to + f) return 0;
  let k;
  if (p < band.from) k = (p - (band.from - f)) / f;
  else if (p > band.to) k = 1 - (p - band.to) / f;
  else k = 1;
  return Math.max(0, Math.min(1, k));
}

const BANDS = [
  { from: 0.0, to: 0.26 }, { from: 0.28, to: 0.5 }, { from: 0.52, to: 0.72 },
  { from: 0.74, to: 0.9 }, { from: 0.93, to: 1.0 },
];
const N = 24;
let checks = 0;
const ok = (label, fn) => { fn(); checks++; console.log("  ok  " + label); };

console.log("frame mapping");
ok("p=0 is the first frame", () => assert.deepEqual(frameAt(0, N), { index: 0, frac: 0 }));
ok("p=1 is the last frame, never out of range", () => {
  const r = frameAt(1, N);
  assert.equal(r.index, N - 1);
  assert.equal(r.frac, 0);
});
ok("out-of-range progress is clamped, not wrapped", () => {
  assert.equal(frameAt(-3, N).index, 0);
  assert.equal(frameAt(9, N).index, N - 1);
});
ok("index is monotonic across the whole scroll", () => {
  let prev = -1;
  for (let i = 0; i <= 1000; i++) {
    const { index } = frameAt(i / 1000, N);
    assert.ok(index >= prev, `index went backwards at p=${i / 1000}`);
    prev = index;
  }
});
ok("every frame in the sequence is reachable", () => {
  const seen = new Set();
  for (let i = 0; i <= 2000; i++) seen.add(frameAt(i / 2000, N).index);
  assert.equal(seen.size, N, `only ${seen.size}/${N} frames reachable`);
});
ok("frac stays within [0,1) so crossfade alpha is always valid", () => {
  for (let i = 0; i <= 2000; i++) {
    const { frac } = frameAt(i / 2000, N);
    assert.ok(frac >= 0 && frac < 1.0000001, `frac out of range: ${frac}`);
  }
});

console.log("caption bands");
ok("each band is fully on at its own midpoint", () => {
  for (const b of BANDS) assert.equal(bandK(b, (b.from + b.to) / 2), 1);
});
ok("the first band is on at the very top of the hero", () =>
  assert.equal(bandK(BANDS[0], 0), 1));
ok("the settle band is on at the very bottom", () =>
  assert.equal(bandK(BANDS[4], 1), 1));
ok("k is always within [0,1]", () => {
  for (const b of BANDS)
    for (let i = 0; i <= 1000; i++) {
      const k = bandK(b, i / 1000);
      assert.ok(k >= 0 && k <= 1, `k=${k} out of range`);
    }
});
ok("no two bands are ever fully on at once", () => {
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    const full = BANDS.filter((b) => bandK(b, p) > 0.999).length;
    assert.ok(full <= 1, `${full} bands fully on at p=${p}`);
  }
});
ok("overlap during a crossfade never exceeds two bands", () => {
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    const on = BANDS.filter((b) => bandK(b, p) > 0).length;
    assert.ok(on <= 2, `${on} bands visible at p=${p}`);
  }
});
ok("no dead air: some caption is visible at every point", () => {
  const gaps = [];
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    if (!BANDS.some((b) => bandK(b, p) > 0)) gaps.push(+p.toFixed(3));
  }
  assert.equal(gaps.length, 0, `caption gaps at p=${gaps.slice(0, 8).join(", ")}...`);
});

console.log(`\n${checks} checks passed`);

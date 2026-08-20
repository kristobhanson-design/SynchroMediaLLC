# Brand assets

All marks are generated from Geist Sans outlines. Nothing here is hand-drawn
path data — run the generator and every mark is rebuilt, so tracking, rule
weight and proportion stay editable.

```bash
node docs/brand/generate.mjs
```

## What ships where

| File | Role |
|---|---|
| `public/brand/wordmark-stacked.svg` | **Primary.** Use this by default |
| `public/brand/wordmark-horizontal.svg` | Secondary — nav bars, email signatures, anywhere short and wide |
| `public/brand/monogram.svg` | Avatars, watermark |
| `public/brand/icon-512.png` | PWA / social |
| `src/app/icon.svg`, `apple-icon.png`, `favicon.ico` | Picked up automatically by Next's metadata file convention |

Marks use `fill="currentColor"`, so they inherit text colour — one file works on
both grounds. The favicon is the exception and carries explicit colours,
because a favicon has no inherited context.

## The idea

`MEDIA` is tracked out until its **inked** width matches `SYNCHRO` exactly —
552.60 units against 552.60, delta 0.000. The two words are literally brought
into alignment. The name is performed by the typography rather than illustrated
on top of it.

The match is solved against glyph ink extents rather than advance widths, so
the edges align optically rather than merely arithmetically. `trackingForInk()`
computes it; it is not eyeballed, and it will re-solve correctly if the type
size or tracking of the top line changes.

## Rules

- **The hairline rule belongs to the stacked lockup only.** On a single line it
  reads as an underline, which is why the horizontal variant drops it.
- **The monogram is its own artwork, not the logo scaled down.** The wide
  tracking that makes the wordmark feel deliberate turns to mush below 32px.
- **Minimum size:** stacked 90px wide, horizontal 150px wide.
- **Clear space:** one cap height on all sides.
- Don't re-colour the marks outside the §3.2 palette, don't add effects, and
  don't reset the type in a different face — the outlines exist precisely so
  the mark never depends on Geist being installed.

## Concepts considered

Three were presented; C was chosen. The other two, and the reasoning, are in
the review page published during Phase 2.

## Licensing

`Geist.ttf` is bundled so the generator is reproducible. Geist is licensed
under the SIL Open Font License 1.1 — see `OFL.txt`. The outlines in the
generated SVGs are permitted derivative use.

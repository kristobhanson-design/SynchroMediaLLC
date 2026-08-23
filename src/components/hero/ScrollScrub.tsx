"use client";

import { useEffect, useRef, useState } from "react";
import { HERO, BANDS, frameAt, bandK } from "./frames";

/**
 * Scroll-scrubbed hero, driven by a real listing shoot.
 *
 * Design notes, several of which look fussy and are not:
 *
 *  - The scrub loop writes to the DOM directly and never calls setState. An
 *    earlier version pushed progress into React state every animation frame,
 *    which re-rendered at 60fps and, worse, churned the effect that owned the
 *    image loader — it cancelled itself after the first frame. State belongs to
 *    things that change rarely; per-frame values belong in refs.
 *  - Smoothing is frame-rate independent. A plain `v += (t - v) * k` converges
 *    twice as fast at 120Hz as at 60Hz, so the page feels different per machine.
 *  - The rAF loop rests when converged and when the hero is off-screen.
 *  - Loaded frames live in a ref, so toggling the static-hero gate (a rotation,
 *    a resize, a reduced-motion flip) never re-downloads them.
 *  - Frames draw nearest-loaded, so scrubbing works mid-download.
 */

// Must stay identical to the media queries in globals.css.
const GATES = [
  "(max-width: 720px)",
  "(orientation: portrait) and (max-width: 1024px)",
  "(orientation: portrait) and (pointer: coarse)",
  "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
  "(prefers-reduced-motion: reduce)",
];

const SCROLL_VH = 460;
const SMOOTHING = 0.16;

export default function ScrollScrub() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const imgsRef = useRef<(HTMLImageElement | null)[]>(HERO.frames.map(() => null));
  const startedRef = useRef(false);
  const shownRef = useRef(0);

  const [staticHero, setStaticHero] = useState(true);
  const [pct, setPct] = useState(0);

  // ---- gates, evaluated live ------------------------------------------
  useEffect(() => {
    const mqls = GATES.map((q) => window.matchMedia(q));
    const evaluate = () => setStaticHero(mqls.some((m) => m.matches));
    evaluate();
    mqls.forEach((m) => m.addEventListener("change", evaluate));
    return () => mqls.forEach((m) => m.removeEventListener("change", evaluate));
  }, []);

  // ---- frame loading, once ---------------------------------------------
  // Deliberately NOT cancelled on cleanup: a half-downloaded sequence that
  // restarts on every gate flip is worse than a few extra decodes.
  useEffect(() => {
    if (staticHero || startedRef.current) return;
    startedRef.current = true;
    let done = 0;
    (async () => {
      for (let i = 0; i < HERO.frames.length; i++) {
        const img = new Image();
        img.decoding = "async";
        img.src = `${HERO.dir}/${HERO.frames[i]}`;
        // load, not decode. HTMLImageElement.decode() never settles on an
        // image that is not in the document while the tab is hidden or
        // throttled, which parks the whole sequence on frame 0. onload always
        // fires; decode() is then a best-effort warm-up behind a timeout so a
        // stalled decode can never block the queue.
        const ok = await new Promise<boolean>((res) => {
          if (img.complete && img.naturalWidth > 0) return res(true);
          img.onload = () => res(true);
          img.onerror = () => res(false);
        });
        if (!ok) continue;
        await Promise.race([
          img.decode().catch(() => {}),
          new Promise((r) => setTimeout(r, 120)),
        ]);
        imgsRef.current[i] = img;
        done++;
        setPct(Math.round((done / HERO.frames.length) * 100));
        if (i === 0) window.dispatchEvent(new Event("hero:first-frame"));
      }
    })();
  }, [staticHero]);

  // ---- scrub loop -------------------------------------------------------
  useEffect(() => {
    if (staticHero) return;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const nearest = (i: number) => {
      const a = imgsRef.current;
      if (a[i]) return a[i];
      for (let d = 1; d < a.length; d++) {
        if (a[i - d]) return a[i - d];
        if (a[i + d]) return a[i + d];
      }
      return null;
    };

    const drawCover = (img: HTMLImageElement, alpha: number) => {
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      ctx.globalAlpha = 1;
    };

    let lastDrawn = -1;
    const paint = (p: number) => {
      const { index: i, frac } = frameAt(p, HERO.frames.length);
      const a = nearest(i);
      if (!a) return;
      drawCover(a, 1);
      const b = nearest(Math.min(i + 1, HERO.frames.length - 1));
      if (b && b !== a && frac > 0.001) drawCover(b, frac);
      lastDrawn = i;
    };

    // Bands are written directly rather than re-rendered.
    const paintBands = (p: number) => {
      BANDS.forEach((band, idx) => {
        const el = bandRefs.current[idx];
        if (!el) return;
        const k = bandK(band, p);
        const prev = el.dataset.k;
        const next = k.toFixed(3);
        if (prev === next) return;           // write only on change
        el.dataset.k = next;
        el.style.opacity = next;
        el.style.transform = `translateY(${((1 - k) * 14).toFixed(2)}px)`;
        el.style.setProperty("--k", next);
        el.style.visibility = k <= 0.001 ? "hidden" : "visible";
      });
      if (hintRef.current) {
        const o = Math.max(0, 1 - p * 12);
        hintRef.current.style.opacity = o.toFixed(3);
      }
    };

    let target = 0, rafId: number | null = null, last = 0, onScreen = true;

    const heroProgress = () => {
      const rect = section.getBoundingClientRect();
      const dist = rect.height - window.innerHeight;
      if (dist <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / dist));
    };

    const tick = (now: number) => {
      const dt = Math.min(100, now - (last || now));
      last = now;
      let shown = shownRef.current;
      shown += (target - shown) * (1 - Math.pow(1 - SMOOTHING, dt / 16.667));
      if (Math.abs(target - shown) < 0.0005) {
        shown = target;
        rafId = null;
        last = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
      shownRef.current = shown;
      paint(shown);
      paintBands(shown);
    };

    const kick = () => {
      if (rafId === null && onScreen) {
        last = 0;
        rafId = requestAnimationFrame(tick);
      }
    };
    const onScroll = () => { target = heroProgress(); kick(); };
    const onFirstFrame = () => { sizeCanvas(); paint(shownRef.current); };
    const onResize = () => { sizeCanvas(); paint(shownRef.current); };

    const io = new IntersectionObserver(
      ([e]) => { onScreen = e.isIntersecting; if (onScreen) onScroll(); },
      { rootMargin: "15% 0px" }
    );
    io.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("hero:first-frame", onFirstFrame);

    sizeCanvas();
    onScroll();
    paint(shownRef.current);
    paintBands(shownRef.current);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hero:first-frame", onFirstFrame);
      if (rafId !== null) cancelAnimationFrame(rafId);
      void lastDrawn;
    };
  }, [staticHero]);

  return (
    <section
      ref={sectionRef}
      className="hero-scrub relative"
      style={{ height: staticHero ? "100svh" : `${SCROLL_VH}vh` }}
      aria-label="Vehicle listing photography"
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-ink">
        {staticHero ? (
          <img src={HERO.poster} alt="" aria-hidden="true"
               className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <canvas ref={canvasRef} aria-hidden="true" tabIndex={-1}
                  className="absolute inset-0 h-full w-full" />
        )}

        <div className="hero-scrim" aria-hidden="true" />

        {staticHero ? (
          <div data-align="left" style={{ ["--k" as string]: 1 }}
               className="hero-band absolute inset-0 flex flex-col justify-center px-8 sm:px-12">
            <div className="relative z-10 max-w-[34ch]">
              <p className="label mb-4">Synchro Media · Atlanta</p>
              <h1 className="text-4xl sm:text-5xl font-normal tracking-tight leading-[1.08] text-paper">
                Vehicles, shot properly.
              </h1>
              <p className="mt-4 text-lg text-[#c9c9d0]">
                Listing photography, private commissions and event coverage across metro Atlanta.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* All bands stay mounted; the loop writes opacity. Mounting and
                unmounting them per frame is what makes scroll sites stutter. */}
            {BANDS.map((band, i) => (
              <div
                key={i}
                ref={(el) => { bandRefs.current[i] = el; }}
                data-align={band.align}
                style={{ opacity: 0, visibility: "hidden" }}
                className={`hero-band absolute inset-0 flex flex-col justify-center px-8 sm:px-16 lg:px-24 ${
                  band.align === "left" ? "items-start text-left"
                  : band.align === "right" ? "items-end text-right"
                  : "items-center text-center"
                }`}
              >
                <div className="relative z-10 max-w-[34ch]">
                  <p className="label mb-4">{band.label}</p>
                  {/* The opening caption is the page's h1. Without this the
                      scrub route had no h1 at all, only the static-hero route
                      did — a heading hierarchy that changes with viewport. */}
                  {i === 0 ? (
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.08] text-paper">
                      {band.head}
                    </h1>
                  ) : (
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.08] text-paper">
                      {band.head}
                    </h2>
                  )}
                  {band.sub && <p className="mt-4 text-base sm:text-lg text-[#c9c9d0]">{band.sub}</p>}
                </div>
              </div>
            ))}

            {pct < 100 && (
              <div className="absolute bottom-6 right-6 label opacity-70" aria-live="polite">
                Loading sequence {pct}%
              </div>
            )}
            <div ref={hintRef} aria-hidden="true"
                 className="absolute bottom-7 left-1/2 -translate-x-1/2 label">
              Scroll
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Full-bleed autoplay video hero. Replaces the earlier scroll-scrubbed photo
 * sequence — this is a simple loop, not a scroll-driven interaction.
 *
 * The wide-vs-tall choice is made with native <source media> — NOT
 * matchMedia() in an effect. That JS version picked the right video every
 * time under Playwright/Chromium but a real phone reportedly rendered the
 * wide 16:9 clip anyway (letterboxed to a sliver, top/bottom filled by the
 * blurred backdrop layer) — almost certainly a hydration-order or
 * matchMedia-timing gap that's very hard to chase blind without device
 * access. <source media> is evaluated by the browser at the HTML/CSS layer
 * before any script runs, so there's no window for it to pick wrong. The
 * trade-off: unlike the old version, it won't re-swap if a desktop window is
 * resized past the breakpoint — acceptable, since this is really a
 * device-type choice, not a responsive-resize one.
 *
 * Reduced motion still needs JS-free handling too: both <video>s stay in the
 * DOM and CSS hides them in favor of a static poster under
 * prefers-reduced-motion, rather than swapping elements at runtime.
 */
const TALL_QUERY = "(max-width: 860px), (orientation: portrait) and (pointer: coarse)";

export default function VideoHero({ headline, subhead }: { headline: string; subhead: string }) {
  return (
    <section id="home">
      <div className="hero-visual">
        <video className="hero-bg" autoPlay muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1}>
          <source media={TALL_QUERY} src="/hero/video/hero-tall.mp4" type="video/mp4" />
          <source src="/hero/video/hero-wide.mp4" type="video/mp4" />
        </video>
        <video className="hero-fg" autoPlay muted loop playsInline preload="auto" poster="/hero/video/poster.jpg" aria-hidden="true" tabIndex={-1}>
          <source media={TALL_QUERY} src="/hero/video/hero-tall.mp4" type="video/mp4" />
          <source src="/hero/video/hero-wide.mp4" type="video/mp4" />
        </video>
        <img className="hero-poster hero-bg hero-static-fallback" src="/hero/video/poster.jpg" alt="" aria-hidden="true" />
        <img className="hero-poster hero-fg hero-static-fallback" src="/hero/video/poster.jpg" alt="" aria-hidden="true" />
        <div className="wrap hero-content">
          <h1>
            {headline}
            <span className="dim-line">{subhead}</span>
          </h1>
        </div>
      </div>
    </section>
  );
}

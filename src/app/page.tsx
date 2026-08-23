import ScrollScrub from "@/components/hero/ScrollScrub";

export default function Home() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 bg-surface px-4 py-2">
        Skip to content
      </a>

      <ScrollScrub />

      {/* The page below the hero. Phase 3 builds this out properly; what is
          here exists so the hero has somewhere to land and the scroll can be
          tested end to end. */}
      <main id="main" tabIndex={-1} className="relative bg-ink">
        <section className="mx-auto max-w-5xl px-8 py-28 sm:py-36">
          <p className="label mb-5">What this is</p>
          <h2 className="max-w-[22ch] text-3xl sm:text-4xl font-normal tracking-tight leading-[1.12]">
            Most vehicle photos are taken in a hurry, in bad light, on a phone.
          </h2>
          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-muted">
            The difference between that and a considered set of images is the
            difference between a listing people scroll past and one they stop on.
            Everything above is a single afternoon on one car, delivered the next
            morning.
          </p>
          <div className="mt-10 h-px w-24 bg-line" />
        </section>
      </main>
    </>
  );
}

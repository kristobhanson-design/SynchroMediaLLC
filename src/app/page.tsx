/**
 * Placeholder home page.
 *
 * Phase 1 is foundation only — the real pages are built in Phase 3 against the
 * design system from Phase 2. This exists so the static export has a route to
 * emit and so the token wiring is visible.
 */
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="max-w-xl">
        <p className="label mb-6">Synchro Media LLC · Atlanta, GA</p>
        <h1 className="text-4xl sm:text-5xl font-medium tracking-tight text-paper">
          Vehicles, shot properly.
        </h1>
        <p className="mt-5 text-muted leading-relaxed">
          Site under construction. Listing photography, private commissions and
          event coverage across metro Atlanta.
        </p>
        <div className="mt-8 h-px w-24 bg-line" />
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { GALLERY_370Z, GALLERY_370Z_COVER } from "./gallery-370z";
import Lightbox from "./Lightbox";

const LISTING = {
  title: "Nissan 370Z — 40th Anniversary Edition",
  loc: "Metro Atlanta, GA · Full Shoot",
};

const CATALOG_CARDS = [
  { image: "/portfolio/mazda-rx7.jpg", title: "Mazda RX-7", loc: "Caffeine & Octane", cat: "event", catLabel: "Event" },
  { image: "/portfolio/supra-pair.jpg", title: "Toyota GR Supra Pair", loc: "Caffeine & Octane", cat: "event", catLabel: "Event" },
  { image: "/portfolio/stunt-truck-burnout.jpg", title: "Stunt Truck — Burnout Run", loc: "Motorsport Exhibition", cat: "event", catLabel: "Event" },
  { image: "/portfolio/corvette-c8.jpg", title: "Chevrolet Corvette C8", loc: "Mountain Run Car Meet", cat: "event", catLabel: "Event" },
  { image: "/portfolio/240sx-widebody.jpg", title: "Nissan 240SX — Widebody", loc: "Mountain Run Car Meet", cat: "event", catLabel: "Event" },
  { image: "/portfolio/bmw-m4.jpg", title: "BMW M4", loc: "Mountain Run Car Meet", cat: "event", catLabel: "Event" },
  { image: "/portfolio/camaro-ss-personal.jpg", title: "Chevrolet Camaro SS", loc: "Private Commission · Atlanta, GA", cat: "personal", catLabel: "Personal" },
  { image: "/portfolio/camaro-ss-personal-rear.jpg", title: "Chevrolet Camaro SS — Rear", loc: "Private Commission · Atlanta, GA", cat: "personal", catLabel: "Personal" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "dealership", label: "Dealership" },
  { id: "personal", label: "Personal" },
  { id: "event", label: "Event" },
];

export default function Portfolio() {
  const [filter, setFilter] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const headRef = useReveal<HTMLDivElement>();
  const filterRef = useReveal<HTMLDivElement>();
  const catalogRef = useReveal<HTMLDivElement>();

  return (
    <section className="block tint" id="portfolio">
      <div className="wrap">
        <div ref={headRef} className="section-head reveal">
          <p className="eyebrow">Portfolio</p>
          <h2>The Catalog</h2>
          <p>Some of our quality work, filterable by the kind of service.</p>
        </div>

        <div ref={filterRef} className="filter-row reveal" role="group" aria-label="Filter portfolio">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-btn${filter === f.id ? " active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={catalogRef} className="catalog reveal">
        <div
          className={`card listing-card${filter !== "all" && filter !== "dealership" ? " hidden" : ""}`}
          tabIndex={0}
          role="button"
          aria-haspopup="dialog"
          aria-label={`Open full gallery: ${LISTING.title}, ${GALLERY_370Z.length} photos`}
          onClick={() => setLightboxIndex(0)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setLightboxIndex(0);
            }
          }}
        >
          <div className="plate" style={{ backgroundImage: `url('${GALLERY_370Z_COVER}')` }}>
            <span className="photo-count">{GALLERY_370Z.length} Photos</span>
            <span className="listing-hint">View Gallery &rarr;</span>
          </div>
          <div className="card-body">
            <span className="cat-label">Dealership Service</span>
            <span className="title">{LISTING.title}</span>
            <span className="loc">{LISTING.loc}</span>
          </div>
        </div>

        {CATALOG_CARDS.map((c) => (
          <div key={c.title + c.loc} className={`card${filter !== "all" && filter !== c.cat ? " hidden" : ""}`}>
            <div className="plate" style={{ backgroundImage: `url('${c.image}')` }} />
            <div className="card-body">
              <span className="cat-label">{c.catLabel}</span>
              <span className="title">{c.title}</span>
              <span className="loc">{c.loc}</span>
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        images={GALLERY_370Z}
        title={LISTING.title}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNext={() => setLightboxIndex((i) => (i === null ? 0 : (i + 1) % GALLERY_370Z.length))}
        onPrev={() => setLightboxIndex((i) => (i === null ? 0 : (i - 1 + GALLERY_370Z.length) % GALLERY_370Z.length))}
      />
    </section>
  );
}

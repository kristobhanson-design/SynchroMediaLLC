"use client";

import { useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import type { ProjectSummary } from "@/lib/content";
import Lightbox from "./Lightbox";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "dealership", label: "Dealership" },
  { id: "personal", label: "Personal" },
  { id: "event", label: "Event" },
];

const CATEGORY_LABEL: Record<ProjectSummary["category"], string> = {
  dealership: "Dealership Service",
  personal: "Personal",
  event: "Event",
};

export default function Portfolio({
  eyebrow,
  headline,
  body,
  projects,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  projects: ProjectSummary[];
}) {
  const [filter, setFilter] = useState("all");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const headRef = useReveal<HTMLDivElement>();
  const filterRef = useReveal<HTMLDivElement>();
  const catalogRef = useReveal<HTMLDivElement>();

  const openProject = projects.find((p) => p.slug === openSlug) ?? null;

  function openGallery(slug: string) {
    setOpenSlug(slug);
    setLightboxIndex(0);
  }

  function closeGallery() {
    setLightboxIndex(null);
    setOpenSlug(null);
  }

  return (
    <section className="block tint" id="portfolio">
      <div className="wrap">
        <div ref={headRef} className="section-head reveal">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{headline}</h2>
          <p>{body}</p>
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
        {projects.map((p) => {
          const hidden = filter !== "all" && filter !== p.category;
          const isGallery = p.images.length > 1;

          if (isGallery) {
            return (
              <div
                key={p.slug}
                className={`card listing-card${hidden ? " hidden" : ""}`}
                tabIndex={0}
                role="button"
                aria-haspopup="dialog"
                aria-label={`Open full gallery: ${p.title}, ${p.images.length} photos`}
                onClick={() => openGallery(p.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openGallery(p.slug);
                  }
                }}
              >
                <div className="plate" style={{ backgroundImage: `url('${p.coverUrl}')` }}>
                  <span className="photo-count">{p.images.length} Photos</span>
                  <span className="listing-hint">View Gallery &rarr;</span>
                </div>
                <div className="card-body">
                  <span className="cat-label">{CATEGORY_LABEL[p.category]}</span>
                  <span className="title">{p.title}</span>
                  <span className="loc">{p.location}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={p.slug} className={`card${hidden ? " hidden" : ""}`}>
              <div className="plate" style={{ backgroundImage: `url('${p.coverUrl}')` }} />
              <div className="card-body">
                <span className="cat-label">{CATEGORY_LABEL[p.category]}</span>
                <span className="title">{p.title}</span>
                <span className="loc">{p.location}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Lightbox
        images={openProject?.images.map((i) => i.url) ?? []}
        title={openProject?.title ?? ""}
        index={lightboxIndex}
        onClose={closeGallery}
        onNext={() =>
          setLightboxIndex((i) => (i === null || !openProject ? 0 : (i + 1) % openProject.images.length))
        }
        onPrev={() =>
          setLightboxIndex((i) =>
            i === null || !openProject ? 0 : (i - 1 + openProject.images.length) % openProject.images.length,
          )
        }
      />
    </section>
  );
}

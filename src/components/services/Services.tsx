"use client";

import { useReveal } from "@/hooks/useReveal";
import type { ServiceItem } from "@/lib/content";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Services({
  eyebrow,
  packages,
  styles,
}: {
  eyebrow: string;
  packages: ServiceItem[];
  styles: ServiceItem[];
}) {
  const headRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();
  const stylesHeadRef = useReveal<HTMLDivElement>();
  const styleGridRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <section className="block" id="services">
      <div className="wrap">
        <div ref={headRef} className="section-head reveal">
          <p className="eyebrow">{eyebrow}</p>
          <h2>Everything your cars need to look their best.</h2>
        </div>

        <div ref={gridRef} className="category-grid reveal">
          {packages.map((c) => (
            <div className="cat-card" key={c.slug}>
              <span className="cat-tag">{c.audience ? capitalize(c.audience) : ""}</span>
              <h3>{c.name}</h3>
              <p className="blurb">{c.blurb}</p>
              <div className="tag-row">
                {c.bullets.map((t) => (
                  <span className="mini" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div ref={stylesHeadRef} className="styles-heading reveal">
          <p className="eyebrow">What we shoot</p>
        </div>
        <div ref={styleGridRef} className="style-grid reveal">
          {styles.map((s, i) => (
            <div className="style-card" key={s.slug}>
              <span className="style-badge">{String(i + 1).padStart(2, "0")}</span>
              <h4>{s.name}</h4>
              <p>{s.blurb}</p>
            </div>
          ))}
        </div>

        <div ref={ctaRef} className="services-cta reveal">
          <a className="btn btn-primary" href="#contact">
            Get a Quote
          </a>
        </div>
      </div>
    </section>
  );
}

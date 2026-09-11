"use client";

import { useReveal } from "@/hooks/useReveal";

const CATEGORIES = [
  {
    tag: "Dealership",
    title: "Dealership Lots",
    blurb:
      "Sell more cars faster. Quality matters to buyers — it shows professionalism and trustworthiness. Elevate your brand image and listing quality with professional images, or advertise with social media videos.",
    tags: ["Listing photos", "Drone", "Social Media"],
  },
  {
    tag: "Personal",
    title: "Personal Shoots",
    blurb:
      "Your car, your location. Golden hour, moody overcast, or clear skies. Whatever you imagine we can deliver. Personalized photos and videos for your car.",
    tags: ["Artistic detail", "Cinematic video"],
  },
  {
    tag: "Event",
    title: "Event Coverage",
    blurb:
      "From cars and coffee to afternoon cruises. Full coverage with drone, rollers, group and single pictures, etc. The best way to document your epic car meet.",
    tags: ["Drone", "Social content"],
  },
  {
    tag: "Advertising",
    title: "Shop & Brand Advertising",
    blurb:
      "Photo and video built to sell your shop, not just the cars in it. For mechanics, paint and wrap shops, and detailers who want marketing that looks as good as the work does.",
    tags: ["Brand Photos", "Promo Video"],
  },
];

const STYLES = [
  { title: "Listing Photography", blurb: "Clean, consistent shots formatted to sell cars faster online." },
  { title: "Artistic Detail Shots", blurb: "Close-in angles that show off what makes this car special." },
  { title: "Drone Coverage", blurb: "Aerial footage that gives events and big lots real scale." },
  {
    title: "Cinematic Social Content",
    blurb: "Upbeat short and long-form video built for Instagram, TikTok, and YouTube.",
  },
  {
    title: "Beauty Shots",
    blurb: "Scenic, artistic compositions that put the car in a setting worth stopping for.",
  },
  {
    title: "Other",
    blurb: "Have something specific in mind? Tell us what you're picturing and we'll bring it to life.",
  },
];

export default function Services() {
  const headRef = useReveal<HTMLDivElement>();
  const gridRef = useReveal<HTMLDivElement>();
  const stylesHeadRef = useReveal<HTMLDivElement>();
  const styleGridRef = useReveal<HTMLDivElement>();
  const ctaRef = useReveal<HTMLDivElement>();

  return (
    <section className="block" id="services">
      <div className="wrap">
        <div ref={headRef} className="section-head reveal">
          <p className="eyebrow">Services</p>
          <h2>Everything your cars need to look their best.</h2>
        </div>

        <div ref={gridRef} className="category-grid reveal">
          {CATEGORIES.map((c) => (
            <div className="cat-card" key={c.title}>
              <span className="cat-tag">{c.tag}</span>
              <h3>{c.title}</h3>
              <p className="blurb">{c.blurb}</p>
              <div className="tag-row">
                {c.tags.map((t) => (
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
          {STYLES.map((s, i) => (
            <div className="style-card" key={s.title}>
              <span className="style-badge">{String(i + 1).padStart(2, "0")}</span>
              <h4>{s.title}</h4>
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

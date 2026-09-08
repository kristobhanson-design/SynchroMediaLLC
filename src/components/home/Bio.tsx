"use client";

import { useReveal } from "@/hooks/useReveal";

export default function Bio() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div className="home-bio">
      <div ref={ref} className="wrap bio-grid reveal">
        <p className="eyebrow">Why Us?</p>
        <blockquote className="quote-text">
          <span className="quote-mark">&ldquo;</span>
          We&apos;re car people first — the kind who show up to a meet with a camera because
          we can&apos;t help it. That&apos;s what brings the level of quality we guarantee,
          cars aren&apos;t just transportation they&apos;re art. Whether it&apos;s a
          dealership lot, your build, or a full event, we shoot every car the way we&apos;d
          want ours shot.
          <span className="quote-mark quote-mark--close">&rdquo;</span>
        </blockquote>
        <div className="owner-bubble">
          <img className="owner-photo" src="/home/owner.jpg" alt="Kris Hanson, owner of Synchro Media" />
          <div className="owner-info">
            <p className="owner-name">Kris Hanson</p>
            <p className="owner-title">Owner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

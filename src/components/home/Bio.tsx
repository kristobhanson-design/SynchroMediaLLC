"use client";

import { useReveal } from "@/hooks/useReveal";

export default function Bio({
  eyebrow,
  quote,
  ownerName,
  ownerTitle,
}: {
  eyebrow: string;
  quote: string;
  ownerName: string;
  ownerTitle: string;
}) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div className="home-bio">
      <div ref={ref} className="wrap bio-grid reveal">
        <p className="eyebrow">{eyebrow}</p>
        <blockquote className="quote-text">
          <span className="quote-mark">&ldquo;</span>
          {quote}
          <span className="quote-mark quote-mark--close">&rdquo;</span>
        </blockquote>
        <div className="owner-bubble">
          <img className="owner-photo" src="/home/owner.jpg" alt={`${ownerName}, owner of Synchro Media`} />
          <div className="owner-info">
            <p className="owner-name">{ownerName}</p>
            <p className="owner-title">{ownerTitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

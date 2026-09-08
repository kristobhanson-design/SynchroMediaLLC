"use client";

import { useEffect, useState } from "react";
import { useReveal } from "@/hooks/useReveal";

export default function SocialContent() {
  const [reduced, setReduced] = useState(false);
  const ref = useReveal<HTMLDivElement>();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setReduced(mq.matches);
    evaluate();
    mq.addEventListener("change", evaluate);
    return () => mq.removeEventListener("change", evaluate);
  }, []);

  return (
    <section className="block" id="content">
      <div className="wrap">
        <div ref={ref} className="content-grid reveal">
          <div className="phone-frame">
            {reduced ? (
              <img src="/content/ryans-camaro-poster.jpg" alt="Chevrolet Camaro SS, vertical social content still" />
            ) : (
              <video autoPlay muted loop playsInline preload="auto" poster="/content/ryans-camaro-poster.jpg" aria-label="Chevrolet Camaro SS, vertical social content sample">
                <source src="/content/ryans-camaro.mp4" type="video/mp4" />
              </video>
            )}
          </div>
          <div className="content-text">
            <p className="eyebrow">Social Content</p>
            <h2>Built for the feed.</h2>
            <p>
              Short form videos that perform. From fast paced trending videos to slow, smooth,
              and cinematic eye catchers the choice is yours.
            </p>
            <div className="tag-row">
              <span className="mini">Instagram</span>
              <span className="mini">TikTok</span>
              <span className="mini">YouTube Shorts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

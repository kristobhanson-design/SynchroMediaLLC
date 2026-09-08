"use client";

import { useEffect, useRef } from "react";

export default function Lightbox({
  images,
  title,
  index,
  onClose,
  onNext,
  onPrev,
}: {
  images: string[];
  title: string;
  index: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const open = index !== null;

  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
    } else {
      document.body.style.overflow = "";
      lastFocused.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onNext, onPrev]);

  const i = index ?? 0;

  return (
    <div
      className={`lightbox${open ? " open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={`${title} full gallery`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lightbox-frame">
        <button ref={closeRef} className="lightbox-close" type="button" aria-label="Close gallery" onClick={onClose}>
          &times;
        </button>
        <div className="lightbox-stage">
          <button className="lightbox-nav prev" type="button" aria-label="Previous photo" onClick={onPrev}>
            &larr;
          </button>
          {open && <img src={images[i]} alt={`${title} — photo ${i + 1} of ${images.length}`} />}
          <button className="lightbox-nav next" type="button" aria-label="Next photo" onClick={onNext}>
            &rarr;
          </button>
        </div>
        <div className="lightbox-meta">
          <span className="lb-title">{title}</span>
          <span>
            {i + 1} / {images.length}
          </span>
        </div>
      </div>
    </div>
  );
}

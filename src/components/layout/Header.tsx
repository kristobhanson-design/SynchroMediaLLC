"use client";

import { useEffect, useState } from "react";
import WordmarkHorizontal from "@/components/brand/WordmarkHorizontal";
import Monogram from "@/components/brand/Monogram";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "portfolio", label: "Portfolio" },
  { id: "contact", label: "Contact" },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.instagram.com/synchromediaa",
    label: "Instagram",
    path: (
      <>
        <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="16.6" cy="7.4" r="0.55" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    href: "https://www.tiktok.com/@synchromediaa",
    label: "TikTok",
    path: (
      <>
        <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.5" />
        <path d="M13.9 7v7.3a2.6 2.6 0 1 1-2.2-2.57" />
        <path d="M13.9 7c.4 1.9 1.8 3.1 3.6 3.3" />
      </>
    ),
  },
  {
    href: "https://www.facebook.com/profile.php?id=61593813066922",
    label: "Facebook",
    path: (
      <>
        <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="5.5" />
        <path
          d="M13.5 9.3h1.3V7.1h-1.6c-1.6 0-2.4 1-2.4 2.5v1.3H9.2v2.2h1.6V17h2.2v-3.9h1.5l.3-2.2h-1.8v-1c0-.4.2-.6.5-.6Z"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),
  },
  {
    href: "https://www.youtube.com/@SynchroMediaLLC",
    label: "YouTube",
    path: (
      <>
        <rect x="1.2" y="5.2" width="21.6" height="13.6" rx="4" />
        <path d="M10.2 9.1l5.4 2.9-5.4 2.9Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

function SocialIcons({ className }: { className: string }) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map((s) => (
        <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {s.path}
          </svg>
        </a>
      ))}
    </div>
  );
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const onScroll = () => setScrolled(window.pageYOffset > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (!sections.length) return;
    const spyOffset = 120;
    let ticking = false;
    const update = () => {
      let currentId = sections[0].id;
      for (const s of sections) {
        if (s.getBoundingClientRect().top - spyOffset <= 0) currentId = s.id;
      }
      setActiveSection(currentId);
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <header className={scrolled ? "scrolled" : undefined}>
        <div className="header-left">
          <button
            className={`menu-toggle${menuOpen ? " open" : ""}`}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="bars">
              <span></span>
              <span></span>
              <span></span>
            </span>
            Menu
          </button>
          <SocialIcons className="social-links social-links--header" />
        </div>
        <div className="wrap nav-bar">
          <a className="brand" href="#home">
            <WordmarkHorizontal className="brand-mark brand-mark--full" />
            <Monogram className="brand-mark brand-mark--compact" />
          </a>
        </div>
        <div className="header-actions">
          <a className="nav-cta" href="#contact">
            Get a Quote
          </a>
        </div>
      </header>

      <div className={`overlay${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside
        className={`side-panel${menuOpen ? " open" : ""}`}
        id="site-menu"
        aria-hidden={!menuOpen}
        aria-label="Site menu"
      >
        <div className="side-panel-top">
          <button className="side-panel-close" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            &times;
          </button>
        </div>
        <nav className="pills" aria-label="Primary">
          {NAV_ITEMS.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={activeSection === n.id ? "active" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="side-panel-foot">
          <p>Kristopher Hanson</p>
          <a href="mailto:Khanson@SynchroMediaLLC.com">Khanson@SynchroMediaLLC.com</a>
          <SocialIcons className="social-links social-links--panel" />
        </div>
      </aside>
    </>
  );
}

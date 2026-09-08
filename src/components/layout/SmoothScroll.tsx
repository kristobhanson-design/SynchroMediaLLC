"use client";

import { useEffect } from "react";

const HEADER_OFFSET = 96;
const LINE_HEIGHT_PX = 34;
const MAX_STEP_PX = 140;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Mounted once. Wires two behaviors ported from the Artifact demo:
 *  - eased smooth-scroll for in-page anchor links
 *  - wheel-delta-normalized custom scroll, so mechanical mouse-wheel notches
 *    and trackpad momentum both ease toward a target instead of jumping
 *    straight to each notch
 * Both are already-iterated, already-approved motion decisions on this
 * project — ported as-is, not reconsidered here. Both no-op under
 * prefers-reduced-motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animatedScrollTo(targetY: number, duration: number) {
      const startY = window.pageYOffset;
      const diff = targetY - startY;
      let startTime: number | null = null;
      function step(timestamp: number) {
        if (startTime === null) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        window.scrollTo(0, startY + diff * easeInOutCubic(progress));
        if (progress < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    function onAnchorClick(this: HTMLAnchorElement, e: MouseEvent) {
      const id = this.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const targetY = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
      if (reduced) window.scrollTo(0, targetY);
      else animatedScrollTo(targetY, 700);
    }

    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    anchors.forEach((a) => a.addEventListener("click", onAnchorClick));

    let cleanupWheel = () => {};
    if (!reduced) {
      const wheelState = { current: window.pageYOffset, target: window.pageYOffset, raf: null as number | null };
      const maxScrollY = () => document.documentElement.scrollHeight - window.innerHeight;
      const normalizeDeltaY = (e: WheelEvent) => {
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= LINE_HEIGHT_PX;
        else if (e.deltaMode === 2) dy *= window.innerHeight;
        return Math.max(-MAX_STEP_PX, Math.min(MAX_STEP_PX, dy));
      };
      const stepWheel = () => {
        wheelState.current += (wheelState.target - wheelState.current) * 0.12;
        if (Math.abs(wheelState.target - wheelState.current) < 0.1) {
          wheelState.current = wheelState.target;
          window.scrollTo(0, wheelState.current);
          wheelState.raf = null;
          return;
        }
        window.scrollTo(0, wheelState.current);
        wheelState.raf = window.requestAnimationFrame(stepWheel);
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!wheelState.raf) {
          wheelState.current = window.pageYOffset;
          wheelState.target = window.pageYOffset;
        }
        const clampedTarget = wheelState.target + normalizeDeltaY(e);
        wheelState.target = Math.max(0, Math.min(maxScrollY(), clampedTarget));
        if (!wheelState.raf) wheelState.raf = window.requestAnimationFrame(stepWheel);
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      cleanupWheel = () => window.removeEventListener("wheel", onWheel);
    }

    return () => {
      anchors.forEach((a) => a.removeEventListener("click", onAnchorClick));
      cleanupWheel();
    };
  }, []);

  return null;
}

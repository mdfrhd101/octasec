"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window { __lenis?: Lenis }
}

/**
 * Site-wide smooth scrolling (Lenis). Not started under prefers-reduced-motion, nor on
 * touch-first phones/tablets: native momentum scrolling is better there, and Lenis would
 * only keep a rAF loop running (anchor jumps use CSS scroll-padding-top instead — mobile.css).
 * Modals call window.__lenis?.stop()/start(); inner scrollers use data-lenis-prevent.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none) and (pointer: coarse) and (max-width: 1024px)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -90 }, autoRaf: true });
    window.__lenis = lenis;
    return () => { lenis.destroy(); delete window.__lenis; };
  }, []);
  return null;
}

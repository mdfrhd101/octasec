"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window { __lenis?: Lenis }
}

/**
 * Site-wide smooth scrolling (Lenis). Not started under prefers-reduced-motion.
 * Modals call window.__lenis?.stop()/start(); inner scrollers use data-lenis-prevent.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -90 }, autoRaf: true });
    window.__lenis = lenis;
    return () => { lenis.destroy(); delete window.__lenis; };
  }, []);
  return null;
}

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
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: 0 }, autoRaf: true, stopInertiaOnNavigate: true });
    window.__lenis = lenis;
    return () => { lenis.destroy(); delete window.__lenis; };
  }, []);

  // A trackpad flick keeps sending (momentum) wheel events for a second or more after the fingers
  // lift. Click a link meanwhile and those events scroll the NEXT page straight down to its footer
  // (owner, Firefox on a Mac). So after a click on an internal link, wheel input is swallowed until
  // that stream pauses: the new page opens at the top, and the next deliberate scroll works as usual.
  useEffect(() => {
    let swallow = false;
    let timer = 0;
    let since = 0;
    const holdUntilPause = () => {
      swallow = true;
      clearTimeout(timer);
      timer = window.setTimeout(() => (swallow = false), 300); // a 300 ms gap = the stream has ended
    };
    const onWheel = (e: WheelEvent) => {
      if (!swallow) return;
      if (performance.now() - since > 3000) { swallow = false; return; } // never block scrolling for long
      e.preventDefault(); // neither the browser nor Lenis (a later listener) scrolls
      e.stopImmediatePropagation();
      holdUntilPause();
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const href = a?.getAttribute("href") || "";
      if (!a || !href.startsWith("/") || a.target === "_blank") return; // internal page links only
      since = performance.now();
      holdUntilPause();
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("click", onClick, true);
      clearTimeout(timer);
    };
  }, []);
  return null;
}

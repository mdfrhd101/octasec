"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { isFirefox } from "./browser";

declare global {
  interface Window { __lenis?: Lenis }
}

/**
 * Site-wide smooth scrolling (Lenis). Not started under prefers-reduced-motion, nor on
 * touch-first phones/tablets: native momentum scrolling is better there, and Lenis would
 * only keep a rAF loop running (anchor jumps use CSS scroll-padding-top instead — mobile.css).
 * Not in Firefox either: its own smooth scrolling runs off the main thread, so it stays fluid
 * while the page is busy; Lenis would tie every scroll step to the main thread.
 * Modals call window.__lenis?.stop()/start(); inner scrollers use data-lenis-prevent.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none) and (pointer: coarse) and (max-width: 1024px)").matches) return;
    if (isFirefox()) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: { offset: 0 }, autoRaf: true, stopInertiaOnNavigate: true });
    window.__lenis = lenis;
    return () => { lenis.destroy(); delete window.__lenis; };
  }, []);

  // A trackpad flick keeps sending (momentum) wheel events for a second or more after the fingers
  // lift. Click a link meanwhile and those events scroll the NEXT page straight down to its footer
  // (owner, Firefox on a Mac). So after a click on an internal link, wheel input is swallowed until
  // that stream pauses: the new page opens at the top, and the next deliberate scroll works as usual.
  // The wheel listener exists only for that moment: a permanent non-passive one makes the browser
  // wait for the main thread before every native scroll step.
  // Without Lenis (Firefox, reduced motion) the browser scrolls natively and a listener added mid-stream
  // can't cancel it (real wheel input, 2026-11-02: top of the new page, its footer 45 ms later). So the page
  // can't scroll at all until the stream pauses (html.nav-hold); Next's own jump to the top still works.
  useEffect(() => {
    let swallow = false;
    let timer = 0;
    let since = 0;
    const html = document.documentElement;
    const release = () => {
      swallow = false;
      html.classList.remove("nav-hold");
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
    const holdUntilPause = () => {
      if (!swallow) {
        window.addEventListener("wheel", onWheel, { capture: true, passive: false });
        if (!window.__lenis) html.classList.add("nav-hold");
      }
      swallow = true;
      clearTimeout(timer);
      timer = window.setTimeout(release, 300); // a 300 ms gap = the stream has ended
    };
    const onWheel = (e: WheelEvent) => {
      if (!swallow) return;
      if (performance.now() - since > 3000) { release(); return; } // never block scrolling for long
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
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("click", onClick, true);
      html.classList.remove("nav-hold");
      clearTimeout(timer);
    };
  }, []);
  return null;
}

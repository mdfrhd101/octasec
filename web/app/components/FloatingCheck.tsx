"use client";

// Sticky "Free website check" widget — fixed to the right edge, always visible
// while scrolling (like a live-chat launcher). The lead-gen entry point.
// Not shown on /website-check itself. At the end of the page:
//  - desktop: it stops at the footer's divider line (above "Back to top") and scrolls
//    away with the page, so it never covers "Back to top" or the OCTASEC wordmark;
//  - phones/tablets: it fades out while the footer is on screen (mobile.css).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const GAP = 16; // px kept above the footer text if the band at the divider line is ever too tight

export default function FloatingCheck() {
  const path = usePathname();
  const [atEnd, setAtEnd] = useState(false);
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const foot = document.querySelector("footer");
    if (!foot) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.05 });
    io.observe(foot);
    return () => io.disconnect();
  }, [path]);

  // Desktop docking. While the divider line is below the button's fixed spot nothing
  // changes; once the line reaches it, the button switches to position:absolute at that
  // exact spot (document coordinates), so from then on it moves with the page natively —
  // no per-frame JS repositioning that could lag behind the scroll.
  useEffect(() => {
    const btn = ref.current;
    const roe = document.querySelector<HTMLElement>("footer .foot-roe"); // "Authorized testing only…"
    const toTop = document.querySelector<HTMLElement>("footer .to-top"); // "Back to top", below the line
    if (!btn || !roe || !toTop) return;
    // where the button's bottom stops (viewport y): on the divider line, centred in the band
    // between the text above it and "Back to top" below it, so it covers neither
    const stopAt = () => {
      const above = roe.getBoundingClientRect().bottom;
      const below = toTop.getBoundingClientRect().top;
      const h = btn.offsetHeight;
      if (below - above >= h + 8) return (above + below) / 2 + h / 2;
      return roe.getBoundingClientRect().top - GAP; // band too tight: stop above the text instead
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    let docked = false;
    let raf = 0;
    let fixedBottom = window.innerHeight - btn.getBoundingClientRect().bottom; // the CSS `bottom`, in px

    const undock = () => {
      docked = false;
      delete btn.dataset.docked; // a data attribute, not a class: React re-renders className (is-end)
      btn.style.top = "";
      fixedBottom = window.innerHeight - btn.getBoundingClientRect().bottom;
    };
    const place = () => {
      raf = 0;
      if (!desktop.matches) {
        if (docked) undock();
        return;
      }
      const stop = stopAt(); // the button's bottom may not pass this
      if (window.innerHeight - fixedBottom <= stop) {
        if (docked) undock();
        return;
      }
      const want = stop - btn.offsetHeight; // the button's top, in viewport coordinates
      if (!docked) {
        docked = true;
        btn.dataset.docked = "";
        btn.style.top = (want + window.scrollY).toFixed(1) + "px"; // page coordinates
      }
      // correct by the measured error (zero unless the layout moved or the containing block isn't the page)
      const err = btn.getBoundingClientRect().top - want;
      if (Math.abs(err) > 0.5) btn.style.top = (parseFloat(btn.style.top) - err).toFixed(1) + "px";
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };

    place();
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });
    desktop.addEventListener("change", kick);
    return () => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      desktop.removeEventListener("change", kick);
      cancelAnimationFrame(raf);
      delete btn.dataset.docked;
      btn.style.top = "";
    };
  }, [path]);

  if (path?.startsWith("/website-check")) return null;

  return (
    <Link ref={ref} className={"floatcheck" + (atEnd ? " is-end" : "")} href="/website-check" aria-label="Free website check">
      <span className="fc-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.6l7 2.6v5.2c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V5.2z" />
          <path d="M9 12l2 2 4-4.2" />
        </svg>
      </span>
      <span className="fc-txt">Free website check</span>
    </Link>
  );
}

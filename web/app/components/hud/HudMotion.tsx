"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Motion for the HUD homepage, on the old SiteMotion logic:
 *  - scroll reveals: every [data-rv] block gets .is-in once it scrolls into view and its
 *    [data-to] numbers count up; the footer wordmark rises in with the footer
 *  - section titles drift at their own speed while scrolling (desktop; the old
 *    .section-head parallax), written to `translate` so it never fights the reveal transform
 *  - panels marked .h-tilt lean toward a real mouse and glow under it (--rx/--ry, --mx/--my)
 *  - the red calls to action lean toward the cursor (the old magnetic buttons)
 *  - .h-split titles (the inner-page heroes) are split into words that rise one by one
 * The hidden starting state only applies while .hud has .is-armed, so without JS everything
 * simply shows. Reduced motion: everything is revealed at once, nothing moves.
 * Re-runs per route: client-side navigation brings a new page's DOM.
 */
// wrap every word of an element's text (nested markup kept) in .hw > span, numbered by --w
function splitWords(el: HTMLElement) {
  if (el.dataset.split) return;
  el.dataset.split = "1";
  let w = 0;
  const walk = (node: Node) => {
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === Node.TEXT_NODE) {
        const parts = (n.textContent || "").split(/(\s+)/);
        if (!parts.some((x) => x.trim())) continue;
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); continue; }
          const o = document.createElement("span");
          o.className = "hw";
          o.style.setProperty("--w", String(w++));
          const i = document.createElement("span");
          i.textContent = part;
          o.appendChild(i);
          frag.appendChild(o);
        }
        n.parentNode!.replaceChild(frag, n);
      } else if (n.nodeType === Node.ELEMENT_NODE && !(n as HTMLElement).classList.contains("hw")) {
        walk(n);
      }
    }
  };
  walk(el);
}

export default function HudMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".hud");
    if (!root) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".hud [data-rv]"));
    const mark = document.querySelector<HTMLElement>("footer .foot-mark");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-in"));
      mark?.classList.add("is-in");
      return;
    }
    const cleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>(".hud .h-split").forEach(splitWords);

    /* scroll reveals + count-ups */
    const count = (el: HTMLElement) =>
      el.querySelectorAll<HTMLElement>("[data-to]").forEach((n) => {
        const to = Number(n.dataset.to) || 0;
        if (!to) return;
        const t0 = performance.now(), dur = 1500;
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          n.textContent = String(Math.round(to * (1 - Math.pow(2, -10 * k))));
          if (k < 1) requestAnimationFrame(step);
        };
        n.textContent = "0";
        requestAnimationFrame(step);
      });
    root.classList.add("is-armed");
    // revealed once 12% shows, or (for blocks taller than the screen) once a third of a screen of it does
    const shown = (e: IntersectionObserverEntry) =>
      e.isIntersecting && (e.intersectionRatio >= 0.12 || e.intersectionRect.height >= window.innerHeight * 0.33);
    const revealed = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!shown(e)) return;
          const t = e.target as HTMLElement;
          t.classList.add("is-in");
          revealed.add(t);
          count(t);
          io.unobserve(t);
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: [0, 0.12, 0.33] }
    );
    els.forEach((e) => io.observe(e));
    // React re-rendering a stateful block's className drops .is-in: put it back
    const mo = new MutationObserver((ms) => {
      for (const m of ms) {
        const t = m.target as HTMLElement;
        if (revealed.has(t) && !t.classList.contains("is-in")) t.classList.add("is-in");
      }
    });
    mo.observe(root, { subtree: true, attributes: true, attributeFilter: ["class"] });
    cleanups.push(() => mo.disconnect());
    // the footer wordmark is half-cropped by design: rise it in as soon as the footer shows
    const foot = mark?.closest("footer");
    const io2 = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { mark!.classList.add("is-in"); io2.disconnect(); }
    }, { threshold: 0 });
    if (foot) io2.observe(foot);
    cleanups.push(() => { io.disconnect(); io2.disconnect(); root.classList.remove("is-armed"); });

    /* section-title parallax (desktop only; not inside the pinned chapters stage) */
    const heads = Array.from(document.querySelectorAll<HTMLElement>(".hud .h-sec > .h-head"));
    const small = window.matchMedia("(max-width: 900px)");
    let raf = 0;
    const drift = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const h of heads) {
        if (small.matches) { h.style.translate = ""; continue; }
        const r = h.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        h.style.translate = "0 " + (((r.top + r.height / 2 - vh / 2) / vh) * -22).toFixed(1) + "px";
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(drift); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    drift();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      heads.forEach((h) => (h.style.translate = ""));
    });

    /* panel tilt + glow toward a real mouse */
    let cur: HTMLElement | null = null;
    const onTilt = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const t = e.target as HTMLElement | null;
      const c = t && t.closest ? (t.closest(".hud .h-tilt") as HTMLElement | null) : null;
      if (cur && cur !== c) { cur.style.setProperty("--rx", "0deg"); cur.style.setProperty("--ry", "0deg"); }
      cur = c;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty("--rx", (px * 5).toFixed(2) + "deg");
      c.style.setProperty("--ry", (-py * 4).toFixed(2) + "deg");
      c.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
      c.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
    };
    document.addEventListener("pointermove", onTilt, { passive: true });
    cleanups.push(() => document.removeEventListener("pointermove", onTilt));

    /* magnetic red calls to action */
    document.querySelectorAll<HTMLElement>(".hud .h-btn-red").forEach((b) => {
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = b.getBoundingClientRect();
        b.style.translate = ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + "px " + ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + "px";
      };
      const leave = () => { b.style.translate = ""; };
      b.addEventListener("pointermove", move);
      b.addEventListener("pointerleave", leave);
      cleanups.push(() => { b.removeEventListener("pointermove", move); b.removeEventListener("pointerleave", leave); });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);
  return null;
}

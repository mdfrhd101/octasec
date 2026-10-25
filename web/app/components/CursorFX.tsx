"use client";

import { useEffect } from "react";

// Custom cursor: a single ring that smoothly trails the pointer everywhere and
// grows over interactive elements. No magnifier, no DOM cloning, no per-frame
// layout reads — so it can never stutter or shift the page.
//
// Smoothness: pointermove ONLY records the pointer position. All motion happens in
// one requestAnimationFrame loop that lerps the ring toward the pointer and writes
// a single GPU translate3d. The loop sleeps when the ring has caught up and is
// re-woken on the next move, so it costs nothing at rest.
export default function CursorFX() {
  useEffect(() => {
    // Input modality: <html class="touch-input"> while the last input was a finger, so
    // hover-only effects can opt out on touch (mobile.css / hover-interactive.css).
    // A media query can't do this: the owner's Surface reports a coarse pointer even
    // with a trackpad, and would lose every hover effect.
    const root = document.documentElement;
    const onDownMod = (e: PointerEvent) => root.classList.toggle("touch-input", e.pointerType === "touch");
    const onMoveMod = (e: PointerEvent) => {
      if (e.pointerType === "mouse") root.classList.remove("touch-input");
    };
    if (window.matchMedia("(hover: none)").matches) root.classList.add("touch-input");
    window.addEventListener("pointerdown", onDownMod, { passive: true });
    window.addEventListener("pointermove", onMoveMod, { passive: true });
    const offModality = () => {
      window.removeEventListener("pointerdown", onDownMod);
      window.removeEventListener("pointermove", onMoveMod);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return offModality;

    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(ring);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let ready = false;

    // ease factor per frame — higher = snappier, lower = more trail. 0.2 reads as
    // responsive but still visibly smooth.
    const EASE = 0.2;

    const loop = () => {
      raf = 0;
      rx += (mx - rx) * EASE;
      ry += (my - ry) * EASE;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      // keep animating until the ring has essentially caught up, then sleep
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        rx = mx;
        ry = my;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    // elements the ring should grow over
    const HOT =
      "a,button,[role=button],input,textarea,select,summary,label," +
      ".card,.agency,.theme-toggle,.menu-btn,.btn,.nav-dd-btn,.share-btn,.floatcheck";

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // the ring follows a mouse/pen, never a finger
      mx = e.clientX;
      my = e.clientY;
      if (!ready) {
        ready = true;
        document.body.classList.add("cursor-ready");
      }
      kick();
    };
    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest(HOT)) ring.classList.add("is-hot");
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t && t.closest && t.closest(HOT)) ring.classList.remove("is-hot");
    };
    const onDown = () => ring.classList.add("is-press");
    const onUp = () => ring.classList.remove("is-press");
    const onLeave = () => document.body.classList.remove("cursor-ready");
    const onEnter = () => {
      if (ready) document.body.classList.add("cursor-ready");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      offModality();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      cancelAnimationFrame(raf);
      ring.remove();
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  return null;
}

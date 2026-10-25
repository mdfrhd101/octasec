"use client";

import { Children, useEffect, useRef } from "react";

/**
 * Phones/tablets (≤900px): the children become a swipeable row (CSS scroll-snap in
 * mobile.css) that auto-advances right → left every `interval` ms and loops
 * seamlessly — a clone of the first card sits at the end, and on reaching it we hop
 * back to the real first card unseen, so it never visibly rewinds.
 * Pauses while touched, off-screen or in a background tab; no autoplay with reduced
 * motion (still swipeable). Desktop: a plain wrapper, the CSS grid is unchanged.
 */
export default function AutoSlider({
  className,
  interval = 4200,
  children,
}: {
  className?: string;
  interval?: number;
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dotsRef = useRef<HTMLDivElement | null>(null);
  const count = Children.count(children);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    const small = window.matchMedia("(max-width: 900px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let clone: HTMLElement | null = null;
    let timer = 0;
    let resumeT = 0;
    let settleT = 0;
    let visible = false;
    let held = false;

    const step = () => {
      const c = track.children;
      return c.length > 1 ? (c[1] as HTMLElement).offsetLeft - (c[0] as HTMLElement).offsetLeft : 0;
    };
    const index = () => {
      const s = step();
      return s > 0 ? Math.round(track.scrollLeft / s) : 0;
    };
    const paintDots = () => {
      const i = index() % count;
      dotsRef.current?.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i));
    };
    const next = () => track.scrollTo({ left: (index() + 1) * step(), behavior: "smooth" });
    // once a scroll settles: if we're sitting on the clone, hop back to the real first card
    const settle = () => {
      if (clone && index() >= count) track.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      paintDots();
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    // idempotent: a running timer is left alone, so frequent visibility/intersection
    // callbacks (e.g. scrolling around the threshold) can't keep resetting the cadence
    const start = () => {
      if (clone && visible && !held && !reduce.matches && !document.hidden) {
        if (!timer) timer = window.setInterval(next, interval);
      } else {
        stop();
      }
    };
    const enable = () => {
      if (!clone) {
        clone = (track.firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;
        clone.setAttribute("aria-hidden", "true");
        clone.classList.add("is-clone");
        track.appendChild(clone);
      }
      start();
    };
    const disable = () => {
      stop();
      clone?.remove();
      clone = null;
      track.scrollLeft = 0;
      paintDots();
    };
    const onSize = () => (small.matches ? enable() : disable());

    // a finger on the cards pauses the slide; it resumes a few seconds after release
    const hold = () => {
      held = true;
      stop();
      window.clearTimeout(resumeT);
    };
    const release = () => {
      window.clearTimeout(resumeT);
      resumeT = window.setTimeout(() => {
        held = false;
        start();
      }, 3000);
    };
    const onScroll = () => {
      window.clearTimeout(settleT);
      settleT = window.setTimeout(settle, 140);
    };
    const onVis = () => start();

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        start();
      },
      { threshold: 0.4 }
    );
    io.observe(track);
    small.addEventListener("change", onSize);
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("pointerdown", hold, { passive: true });
    track.addEventListener("touchstart", hold, { passive: true });
    track.addEventListener("touchend", release, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    onSize();

    return () => {
      io.disconnect();
      small.removeEventListener("change", onSize);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("pointerdown", hold);
      track.removeEventListener("touchstart", hold);
      track.removeEventListener("touchend", release);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(resumeT);
      window.clearTimeout(settleT);
      disable();
    };
  }, [count, interval]);

  return (
    <>
      <div ref={trackRef} className={className}>
        {children}
      </div>
      {count > 1 && (
        <div ref={dotsRef} className="slider-dots" aria-hidden="true">
          {Array.from({ length: count }, (_, k) => (
            <i key={k} className={k === 0 ? "on" : undefined} />
          ))}
        </div>
      )}
    </>
  );
}

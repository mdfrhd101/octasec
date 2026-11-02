"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { FILM_BOOT } from "./filmBoot";
import "../breach-scroll.css";

/**
 * Intro / preloader (docs/SCROLL_ANIMATION_PLAN.md): the attack film plays once, full screen, before
 * the page. At its end the real OctaSec mark, faded in over Gemini's octagon, flies into `target` (the
 * hero's globe) and lands exactly on it, while the dark stage fades away and the hero copy comes in; then
 * the live globe takes over from the mark.
 * - filmBoot.ts, an inline script, picks and plays the video without waiting for this component. This
 *   component draws the stage and flies the mark; if it hydrates late or never, the film still ends on the hero.
 * - Skip: Esc / Enter / Space / ↓, a click, the wheel or a swipe → straight to the flight.
 * - No intro with reduced motion, without JS, or on client-side navigations.
 */
const FLY = 0.95; // s: the mark's flight into the hero, while the stage fades away
const SKIP_FLY = 0.75;
const LAND = 0.45; // s: the live globe fades in under the mark
// A mark landing on the hero's octagon ring is this share of its box, on its centre
const SEAL_FIT = 0.735;

type Film = {
  state: "load" | "play" | "end" | "gone";
  ring: () => { x: number; y: number; s: number };
  take: (fly: ((skipped: boolean) => void) | null) => void;
  stop: () => void;
};
declare global {
  interface Window { __bxi?: Film }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export default function BreachIntro({ target }: { target: string }) {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const filmRef = useRef<Film | null>(null);
  const wanted = useRef<boolean | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    filmRef.current ??= window.__bxi ?? null;
    const film = filmRef.current;
    // remembered, because a re-run of this effect (React StrictMode, Fast Refresh) comes after its cleanup
    wanted.current ??= html.classList.contains("bxi-on") && !!film;
    if (!wanted.current || !root || !film) {
      setDone(true);
      return;
    }
    mounted.current = true;
    html.classList.add("bxi-on");
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    const video = q<HTMLVideoElement>("video"), end = q(".bx-end"), mark = q(".bx-mark"), bar = q(".bx-bar"), backdrop = q(".bxi-backdrop");
    let alive = true, raf = 0, last = 0, ft = 0, lt = 0, flyDur = FLY, videoFrom = 1, lenisStopped = false;
    let phase: "wait" | "fly" | "land" = "wait";
    let from = film.ring();
    window.scrollTo(0, 0);

    const placeMark = (x: number, y: number, s: number) => {
      mark.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(s / from.s).toFixed(4)})`;
    };
    // where it lands
    const seal = () => {
      const r = document.querySelector(target)?.getBoundingClientRect();
      return r && r.width > 1 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width * SEAL_FIT } : from;
    };

    const fly = (skipped: boolean) => {
      phase = "fly";
      ft = 0;
      last = 0;
      flyDur = skipped ? SKIP_FLY : FLY;
      from = film.ring();
      // from here this loop runs the video's fade and the mark, not the CSS clocks
      videoFrom = +getComputedStyle(video).opacity;
      video.style.animation = "none";
      video.style.opacity = String(videoFrom);
      mark.style.animation = "none";
      end.style.visibility = "visible";
      mark.style.width = mark.style.height = from.s.toFixed(1) + "px";
      bar.style.opacity = "0";
      html.classList.add("bxi-reveal"); // the hero copy comes in
      html.classList.remove("bxi-slow");
    };
    const finish = () => {
      alive = false;
      film.stop();
      teardown();
      setDone(true);
    };
    const loop = (now: number) => {
      raf = 0;
      if (!alive) return;
      if (!lenisStopped && window.__lenis) {
        window.__lenis.stop();
        lenisStopped = true;
      }
      const dt = last ? Math.min(0.25, (now - last) / 1000) : 0;
      last = now;
      if (phase === "fly") {
        ft += dt;
        const k = easeInOut(Math.min(1, ft / flyDur));
        const to = seal();
        const lift = Math.sin(Math.PI * k) * Math.min(70, window.innerHeight * 0.08); // a gentle arc
        mark.style.opacity = Math.min(1, ft / 0.15).toFixed(3); // after a skip it fades in first
        placeMark(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - lift, from.s + (to.s - from.s) * k);
        video.style.opacity = (videoFrom * (1 - Math.min(1, ft / 0.3))).toFixed(3);
        backdrop.style.opacity = (1 - ramp(0.1, 0.85, k)).toFixed(3); // the dark stage fades, the hero shows
        if (ft >= flyDur) {
          phase = "land";
          lt = 0;
          html.classList.add("bxi-land"); // the live globe fades in under the mark
        }
      }
      if (phase === "land") {
        lt += dt;
        const to = seal(); // stay glued to it while it fades in
        placeMark(to.x, to.y, to.s);
        mark.style.opacity = (1 - ramp(0.1, LAND, lt)).toFixed(3);
        if (lt >= LAND + 0.05) return finish();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    film.take(fly);

    function teardown() {
      film!.take(null);
      html.classList.remove("bxi-on", "bxi-reveal", "bxi-land", "bxi-play", "bxi-slow");
      if (lenisStopped) window.__lenis?.start();
    }
    return () => {
      mounted.current = false;
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      teardown();
      // a real unmount also ends the film; a StrictMode re-run mounts again first
      setTimeout(() => { if (!mounted.current) film.stop(); }, 0);
    };
  }, [target]);

  if (done) return null;
  return (
    <>
      <div className="bxi" ref={rootRef} aria-hidden="true">
        <div className="bx-stage">
          <div className="bxi-backdrop" />
          {/* raw HTML: the inline script plays this before and after hydration, and React would drop `muted` */}
          <div className="bx-film" dangerouslySetInnerHTML={{ __html: '<video muted playsinline preload="none" tabindex="-1"></video><i></i>' }} />
          <div className="bx-end">
            <div className="bx-mark">
              <BrandMark />
            </div>
          </div>
          <i className="bx-bar" />
        </div>
      </div>
      {/* on the server only: one copy in the HTML, none in the JS bundle. React doesn't run or rewrite it after that */}
      <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: typeof window === "undefined" ? FILM_BOOT : "" }} />
    </>
  );
}

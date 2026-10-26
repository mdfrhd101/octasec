"use client";

import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { BEATS, RING, SEAL_FIT, avifOk, drawFrame, fitFrame, frameStore, frontToBack, pickSet, pushIn, ramp, timeAt } from "./breachFilm";
import "../breach-scroll.css";

/**
 * Intro / preloader (docs/SCROLL_ANIMATION_PLAN.md): the attack film plays once, full screen,
 * before the page. At its end the real OctaSec mark, faded in over Gemini's octagon, flies into
 * `target` (the hero's Seal Scanner) and lands exactly on its ring, while the dark stage fades
 * away and the hero copy comes in; then the live seal takes over from the mark.
 * - A clock drives the film (scroll is locked meanwhile); it waits whenever the frame it needs
 *   isn't decoded yet, like a buffering video, and gives up on a very slow network.
 * - Skip: the button, Esc / Enter / Space / ↓, a click, the wheel or a swipe → straight to the flight.
 * - No intro with reduced motion, without JS (an inline script turns it on before first paint),
 *   on client-side navigations, or — with `once` — after the first time in this browser session.
 */
// Owner (2026-10-26): the whole intro takes 6–7 s — film + flight + landing ≈ 6 s once the
// opening frames are in (on a slow network it buffers like a video, so it can run longer)
const PLAY = 4.6; // s: the film, progress 0 → 0.9 (TIMELINE's holds give each caption time)
const FLY = 0.95; // s: the mark's flight into the hero, while the stage fades away
const SKIP_FLY = 0.75;
const LAND = 0.45; // s: the live seal fades in under the mark
const KEY = "octasec-intro-seen";

type Prop = "opacity" | "transform" | "visibility" | "width" | "height" | "clipPath";
// the progress line is a fixed strip (the flag's colours) revealed left to right
const reveal = (k: number) => `inset(0 ${((1 - k) * 100).toFixed(2)}% 0 0)`;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// skipButton={false} hides the visible "Skip intro" button; a click, the wheel, a swipe or
// Esc / Enter / Space / ↓ still skip the intro. captions={false} plays the film without its text.
export default function BreachIntro({
  target = ".hero2 .seal",
  once = true,
  skipButton = true,
  captions = true,
}: {
  target?: string;
  once?: boolean;
  skipButton?: boolean;
  captions?: boolean;
}) {
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const wanted = useRef<boolean | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current, stage = stageRef.current, canvas = canvasRef.current, skipBtn = skipRef.current;
    const ctx = canvas?.getContext("2d");
    // the inline script decides; remembered, because a re-run of this effect (React StrictMode,
    // Fast Refresh) comes after its cleanup has already taken .bxi-on off again
    wanted.current ??= html.classList.contains("bxi-on");
    if (!wanted.current || !root || !stage || !canvas || !ctx) {
      setDone(true);
      return;
    }
    html.classList.remove("bxi-reveal", "bxi-land");
    html.classList.add("bxi-on");
    const q = (s: string) => stage.querySelector<HTMLElement>(s)!;
    const caps = Array.from(stage.querySelectorAll<HTMLElement>(".bx-cap"));
    const end = q(".bx-end"), mark = q(".bx-mark"), bar = q(".bx-bar"), backdrop = q(".bxi-backdrop");
    let alive = true, raf = 0, last = 0, wall = 0, lenisStopped = false;
    let phase: "load" | "play" | "fly" | "land" = "load";
    let t = 0, ft = 0, lt = 0, stall = 0, flyDur = FLY, canvasFrom = 1;
    let from = { x: 0, y: 0, s: 1 };
    window.scrollTo(0, 0);

    // the same full-screen stage as the scroll film
    let W = 0, H = 0, dpr = 1, base = { x: 0, y: 0, w: 0, h: 0 };
    const layout = () => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const { stacked, capY, ...r } = fitFrame(W, H);
      if (stacked) stage.style.setProperty("--bx-cap-y", capY + "px");
      stage.classList.toggle("is-stacked", stacked);
      base = r;
    };
    layout();

    let frames: ReturnType<typeof frameStore> | null = null;
    let n = 1, fps = 18;
    avifOk().then((avif) => {
      if (!alive) return;
      const set = pickSet(avif, base.w * dpr);
      n = set.n;
      fps = set.fps;
      frames = frameStore(set, () => {});
      frames.fetch(frontToBack(n));
    });

    const last2 = new Map<HTMLElement, Partial<Record<Prop, string>>>();
    const put = (el: HTMLElement, prop: Prop, v: string) => {
      let m = last2.get(el);
      if (!m) last2.set(el, (m = {}));
      if (m[prop] !== v) {
        m[prop] = v;
        el.style[prop] = v;
      }
    };
    // where Gemini's octagon (and the mark over it) sits at the end of the film, viewport px
    const ring = () => {
      const r = pushIn(base, 1.05);
      return { x: r.x + RING.x * r.w, y: r.y + RING.y * r.h, s: RING.size * r.w };
    };
    // where it lands: the seal's octagon ring
    const seal = () => {
      const r = document.querySelector(target)?.getBoundingClientRect();
      return r && r.width > 1 ? { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width * SEAL_FIT } : from;
    };
    const placeMark = (x: number, y: number, s: number) =>
      put(mark, "transform", `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${(s / from.s).toFixed(4)})`);

    const film = (p: number) => {
      const f = Math.min(n - 1, timeAt(p) * fps);
      const i0 = Math.floor(f), a = frames ? frames.nearest(i0) : -1;
      if (a >= 0) {
        const b = a === i0 ? frames!.get(Math.min(n - 1, i0 + 1)) : null;
        const r = pushIn(base, 1 + 0.05 * ramp(0, 0.8, p));
        drawFrame(ctx, frames!.get(a)!, b, f - i0, r.x * dpr, r.y * dpr, r.w * dpr, r.h * dpr);
      }
      caps.forEach((el, j) => {
        const { a: ca, b: cb } = BEATS[j];
        const o = (ca <= 0 ? 1 : ramp(ca, ca + 0.025, p)) * (1 - ramp(cb - 0.025, cb, p));
        put(el, "opacity", o.toFixed(3));
        put(el, "transform", `translate3d(0,${((1 - o) * (p < (ca + cb) / 2 ? 16 : -16)).toFixed(1)}px,0)`);
      });
      // the real mark fades in over Gemini's octagon, the canvas fades out under it
      const g = ring(), mo = ramp(0.84, 0.9, p);
      from = g;
      put(end, "visibility", mo > 0.001 ? "visible" : "hidden");
      put(mark, "opacity", mo.toFixed(3));
      put(mark, "width", g.s.toFixed(1) + "px");
      put(mark, "height", g.s.toFixed(1) + "px");
      placeMark(g.x, g.y, g.s);
      put(canvas, "opacity", (1 - ramp(0.85, 0.91, p)).toFixed(3));
      put(bar, "clipPath", reveal(p / 0.9));
    };

    const fly = (skipped: boolean) => {
      phase = "fly";
      ft = 0;
      flyDur = skipped ? SKIP_FLY : FLY;
      from = ring();
      canvasFrom = +(canvas.style.opacity || 1);
      put(end, "visibility", "visible");
      put(mark, "width", from.s.toFixed(1) + "px");
      put(mark, "height", from.s.toFixed(1) + "px");
      caps.forEach((el) => put(el, "opacity", "0"));
      put(bar, "opacity", "0");
      html.classList.add("bxi-reveal"); // the hero copy comes in, the skip button goes
    };
    const finish = () => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      teardown();
      if (once) {
        try { sessionStorage.setItem(KEY, "1"); } catch {}
      }
      setDone(true);
    };

    const loop = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      wall += dt;
      if (!lenisStopped && window.__lenis) {
        window.__lenis.stop();
        lenisStopped = true;
      }
      if (phase === "load") {
        // play once the opening frames are in (or after 3 s, buffering as it goes)
        const got = frames ? frames.loaded() : 0;
        put(bar, "clipPath", reveal(got));
        if (frames?.get(0) && (got > 0.35 || wall > 3)) phase = "play";
        else if (wall > 10) fly(true); // never trap the page behind a dead network
      }
      if (phase === "play") {
        const p = 0.9 * Math.min(1, t / PLAY);
        const f = Math.min(n - 1, timeAt(p) * fps);
        frames!.seek(Math.round(f));
        // the clock only runs while the frame it needs is decoded
        if (frames!.get(Math.floor(f))) {
          t += dt;
          stall = 0;
        } else if ((stall += dt) > 5) fly(true);
        film(p);
        if (t >= PLAY && phase === "play") fly(false);
      }
      if (phase === "fly") {
        ft += dt;
        const k = easeInOut(Math.min(1, ft / flyDur));
        const to = seal();
        const lift = Math.sin(Math.PI * k) * Math.min(70, H * 0.08); // a gentle arc
        put(mark, "opacity", Math.min(1, ft / 0.15).toFixed(3)); // after a skip it fades in first
        placeMark(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - lift, from.s + (to.s - from.s) * k);
        put(canvas, "opacity", (canvasFrom * (1 - Math.min(1, ft / 0.3))).toFixed(3));
        put(backdrop, "opacity", (1 - ramp(0.1, 0.85, k)).toFixed(3)); // the dark stage fades, the hero shows
        if (ft >= flyDur) {
          phase = "land";
          lt = 0;
          html.classList.add("bxi-land"); // the live seal fades in under the mark
        }
      }
      if (phase === "land") {
        lt += dt;
        const to = seal(); // stay glued to the seal while it fades in
        placeMark(to.x, to.y, to.s);
        put(mark, "opacity", (1 - ramp(0.1, LAND, lt)).toFixed(3));
        if (lt >= LAND + 0.05) return finish();
      }
      raf = requestAnimationFrame(loop);
    };

    const skip = () => {
      if (phase === "load" || phase === "play") fly(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "Enter", " ", "ArrowDown", "PageDown"].includes(e.key)) {
        e.preventDefault();
        skip();
      }
    };
    skipBtn?.addEventListener("click", skip);
    root.addEventListener("pointerdown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("touchmove", skip, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", layout);
    raf = requestAnimationFrame(loop);

    function teardown() {
      skipBtn?.removeEventListener("click", skip);
      root!.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchmove", skip);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", layout);
      html.classList.remove("bxi-on", "bxi-reveal", "bxi-land");
      if (lenisStopped) window.__lenis?.start();
      frames?.destroy();
    }
    return () => {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      teardown();
    };
  }, [target, once]);

  if (done) return null;
  // turns the intro on before first paint; without JS (or with reduced motion) it never shows
  const on =
    "(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;" +
    (once ? `if(sessionStorage.getItem('${KEY}'))return;` : "") +
    "document.documentElement.classList.add('bxi-on')}catch(e){}})();";
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: on }} />
      <div className="bx bx-full bxi" ref={rootRef} aria-hidden="true">
        <div className="bx-pin">
          <div className="bx-grid">
            <div className="bx-stage" ref={stageRef}>
              <div className="bxi-backdrop" />
              <canvas className="bx-canvas" ref={canvasRef} />
              {captions ? (
                <ol className="bx-caps">
                  {BEATS.map((b, i) => (
                    <li key={b.k} className="bx-cap">
                      <b>{String(i + 1).padStart(2, "0")} · {b.k}</b>
                      <span>{b.t}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="bx-end">
                <div className="bx-mark">
                  <BrandMark />
                </div>
              </div>
              <i className="bx-bar" />
            </div>
          </div>
        </div>
      </div>
      {skipButton ? (
        <button ref={skipRef} type="button" className="bxi-skip">
          Skip intro <span aria-hidden="true">&rsaquo;</span>
        </button>
      ) : null}
    </>
  );
}

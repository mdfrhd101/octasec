"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import HudField from "./HudField";
import HudGlobe from "./HudGlobe";
import { SCENES } from "./hudData";

const SURFACES = ["Web apps", "APIs", "External attack surface", "Continuous monitoring", "AI / LLM features", "Network & wireless"];

// the chain story, in ms from the start of a scene → step 1..7
// 1-3: weaknesses found and chained · 4: proof attached · 5: operator verifying · 6: signed · 7: fade out
const BEATS = [900, 2100, 3300, 4600, 5800, 8600, 11600];
const SCENE_MS = 12400;
const FIRST_DELAY = 1300; // let the sphere form before the first chain

const BARS = 44;
function seedBars() {
  let s = 5, v = 0.4;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: BARS }, () => (v = Math.max(0.12, Math.min(1, v + (rnd() - 0.42) * 0.3))));
}

/**
 * Home hero: the copy, the attack-surface globe and the HUD column, over the old drifting
 * threat network. The headline rises word by word as the intro hands over (html.bxi-reveal);
 * the stage comes alive when the film's mark lands on the globe (html.bxi-land), or straight
 * away without the intro.
 * Then it loops a sample attack chain: found → chained → proof → operator verifies → signed.
 * Reduced motion: the final, verified state, no loop.
 */
export default function HudHero() {
  const ref = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const onScreen = useRef(true);
  const [still, setStill] = useState(false);
  const [live, setLive] = useState(false);
  const [wordsOn, setWordsOn] = useState(false);
  const [scene, setScene] = useState(0);
  const [step, setStep] = useState(6); // server HTML shows the finished story
  const [bars, setBars] = useState(seedBars);
  const [found, setFound] = useState(214);

  // start: after the intro lands, or now
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setLive(true);
      setWordsOn(true);
      return;
    }
    const html = document.documentElement;
    let done = false;
    const start = () => { if (!done) { done = true; setLive(true); } };
    if (!html.classList.contains("bxi-on")) {
      setWordsOn(true);
      const t = window.setTimeout(start, 120);
      return () => clearTimeout(t);
    }
    const mo = new MutationObserver(() => {
      const off = !html.classList.contains("bxi-on");
      if (off || html.classList.contains("bxi-reveal")) setWordsOn(true);
      if (off || html.classList.contains("bxi-land")) start();
    });
    mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    const fallback = window.setTimeout(() => { setWordsOn(true); start(); }, 9000);
    return () => { mo.disconnect(); clearTimeout(fallback); };
  }, []);

  // the chain story; restarts the scene whenever the hero comes back on screen
  useEffect(() => {
    if (!live || still || !ref.current) return;
    let timers: number[] = [], sc = 0, delay = FIRST_DELAY;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const run = () => {
      clear();
      setScene(sc);
      setStep(0);
      BEATS.forEach((ms, i) => timers.push(window.setTimeout(() => setStep(i + 1), delay + ms)));
      timers.push(window.setTimeout(() => { sc = (sc + 1) % SCENES.length; delay = 0; run(); }, delay + SCENE_MS));
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting;
      if (e.isIntersecting) run();
      else clear();
    }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => { io.disconnect(); clear(); };
  }, [live, still]);

  // live telemetry: the mapped-surface counter counts up, the bars keep scrolling
  useEffect(() => {
    if (!live || still) return;
    const t0 = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      const k = Math.min(1, (t - t0) / 1600);
      setFound(Math.round(214 * (1 - Math.pow(2, -10 * k))));
      if (k < 1) raf = requestAnimationFrame(tick);
    });
    const id = window.setInterval(() => {
      if (!onScreen.current) return;
      setBars((b) => [...b.slice(1), Math.max(0.12, Math.min(1, b[b.length - 1] + (Math.random() - 0.45) * 0.34))]);
    }, 900);
    return () => { cancelAnimationFrame(raf); clearInterval(id); };
  }, [live, still]);

  // a slight tilt of the stage toward a real mouse (CSS ignores it on touch input)
  useEffect(() => {
    const el = ref.current, st = stage.current;
    if (!el || !st || still) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      st.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      st.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    };
    const leave = () => { st.style.setProperty("--tx", "0"); st.style.setProperty("--ty", "0"); };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [still]);

  const sc = SCENES[scene];
  const state = step >= 7 ? " is-out" : step >= 6 ? " is-ok" : step >= 3 ? " is-found" : "";

  return (
    <section ref={ref} className={"hud-hero" + (live ? " is-live" : "") + (wordsOn ? " words-on" : "") + (still ? " is-still" : "")} aria-labelledby="hh-title">
      <HudField variant="hero" />
      <div className="hh-grid">
        <div className="hh-copy">
          <span className="h-tag ok hh-badge"><i className="h-dot" />AI-orchestrated · human-verified</span>
          <h1 id="hh-title" className="h-title">
            <span className="hw" style={{ "--w": 0 } as CSSProperties}><span>Enterprise-grade</span></span>{" "}
            <span className="hw" style={{ "--w": 1 } as CSSProperties}><span>pentesting.</span></span>{" "}
            <span className="r"><span className="nw">Startup-grade</span> pricing.</span>
          </h1>
          <p className="h-sub">
            OctaSec maps your attack surface, chains weaknesses into real attack paths, and proves
            every finding. A named human operator signs each one before it reaches you.
          </p>
          <div className="h-cta">
            <Link className="h-btn h-btn-red" href="/contact">
              Book a scoping call <span aria-hidden="true">&rsaquo;</span>
            </Link>
            <Link className="h-btn h-btn-line" href="/how-it-works">
              See how it works
            </Link>
          </div>
        </div>

        <div className={"hh-stage" + state} ref={stage} aria-hidden="true">
          <HudGlobe scene={sc} step={step} formed={live} still={still} />
          <div className="hh-meta tl"><span className="h-lbl">Attack surface</span><span className="h-lbl h-ink">your-app.com · 6 assets</span></div>
          <div className="hh-meta bl"><span className="h-lbl">Sample engagement · illustrative</span></div>
        </div>

        <div className="hh-hud" aria-hidden="true">
          <div className="h-panel hh-p1">
            <div className="h-ph"><span className="h-lbl">Active target</span><span className="h-tag ok">In scope</span></div>
            <div className="hh-big">your-app.com</div>
            <div className="hh-meta-row">Web app&nbsp;· API&nbsp;· 6&nbsp;assets</div>
          </div>
          <div className="h-panel hh-p2">
            <div className="h-ph"><span className="h-lbl">Surface mapped</span><span className="h-lbl">+38 subdomains</span></div>
            <div className="hh-num">{found}<small>endpoints</small></div>
            <div className="h-bars">
              {bars.map((v, i) => <i key={i} style={{ height: Math.round(v * 100) + "%" }} />)}
            </div>
            <div className="hh-axis"><span className="h-lbl">Scope signed</span><span className="h-lbl">Now</span></div>
          </div>
          <div className={"h-panel hh-alert" + state}>
            <div className="hh-ah">
              <span className="hh-ic">{step >= 6 ? "✓" : "!"}</span>
              <b>{step >= 6 ? "Chain verified" : step >= 3 ? "Attack chain found" : "Hunting attack paths"}</b>
              <span className="h-lbl">{sc.id}</span>
            </div>
            <ol className="hh-chain">
              {sc.steps.map((s, i) => (
                <li key={sc.id + i} className={step > i ? "on" : ""}>{s.t}<em>{s.sev}</em></li>
              ))}
              <li className={"crit" + (step >= 3 ? " on" : "")}>{sc.result}<em>Critical</em></li>
            </ol>
            <div className="hh-af">
              <span className={"h-tag" + (step >= 4 ? " on" : "")}>Proof attached</span>
              <span className={"h-tag ok" + (step === 5 ? " on wait" : step >= 6 ? " on" : "")}>
                <i className="h-dot" />{step >= 6 ? "Signed by operator" : "Operator verifying"}
              </span>
            </div>
          </div>
        </div>
        <p className="sr-only">
          Illustration of a sample engagement: three small weaknesses are chained into one critical
          finding, then a human operator verifies and signs it.
        </p>
      </div>

      <nav className="hh-surfaces" aria-label="What we test">
        <span className="h-lbl">Testing surfaces</span>
        <ul>
          {SURFACES.map((t) => (
            <li key={t}><Link href="/services">{t}</Link></li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Scope → Map → Hunt → Prove" (docs/LANDING_DESIGN_V2.md §3).
 * Desktop with motion: a tall track with a sticky stage; scroll progress picks the
 * chapter and drives --p (0..1) for the rail.
 * Phones/tablets (<900px): a stories-style stepper — the rail becomes four progress
 * segments; the active one fills (that fill is the timer), then the next chapter
 * slides in from the right. Swipe or tap a segment to move; a finger on it pauses.
 * No auto-advance with reduced motion. Without JS the markup is a plain stacked list.
 */
const CH = [
  { k: "01", w: "SCOPE", t: "You define it. We enforce it.", d: "Assets and rules of engagement are agreed and signed by both sides. Scope is enforced mechanically at the network level — not just on paper.", c: ["Signed RoE", "Allow-listed targets", "Test window"] },
  { k: "02", w: "MAP", t: "See what attackers see.", d: "Subdomains, ports, services, JS-hidden endpoints, technology fingerprints, cloud assets and leaked secrets — your real attack surface.", c: ["Subdomains", "Endpoints", "Fingerprints"] },
  { k: "03", w: "HUNT", t: "90+ techniques, chosen — never sprayed.", d: "The engine selects modules per feature, tests every role, and chains small weaknesses into the attack paths scanners never see.", c: ["Business logic", "Auth & roles", "Attack chains"] },
  { k: "04", w: "PROVE", t: "If we can't prove it, we don't report it.", d: "Minimum-impact proof, then a named human operator verifies and signs every finding. You get a case file, a fix — and a free retest.", c: ["Reproduction", "Human-verified", "Retest included"], v: true },
];

export default function MethodChapters() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false); // desktop scroll-driven mode
  const [nav, setNav] = useState<{ prev: number; dir: 1 | -1 }>({ prev: -1, dir: 1 });
  const [playing, setPlaying] = useState(false); // stepper on screen
  const [held, setHeld] = useState(false); // finger down → pause

  // desktop: pinned stage, scroll progress picks the chapter
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    let raf = 0, cur = -1;
    const update = () => {
      raf = 0;
      setPinned(mq.matches);
      if (!mq.matches) {
        track.style.removeProperty("--p");
        cur = -1;
        return;
      }
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      track.style.setProperty("--p", p.toFixed(4));
      const i = Math.min(CH.length - 1, Math.floor(p * CH.length * 0.999));
      if (i !== cur) { cur = i; setActive(i); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    mq.addEventListener("change", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // phones/tablets: the stepper only plays while it's on screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || pinned) {
      setPlaying(false);
      return;
    }
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [pinned]);

  const go = (to: number, dir: 1 | -1) => {
    const t = (to + CH.length) % CH.length;
    if (t === active) return;
    setNav({ prev: active, dir });
    setActive(t);
  };

  // stepper: going forward, the old chapter exits left and the new one enters from the
  // right (also when wrapping 04 → 01); going back, the reverse
  const chapCls = (i: number) => {
    if (i === active) return " on";
    if (pinned) return i < active ? " past" : "";
    if (i === nav.prev) return nav.dir > 0 ? " past" : "";
    return nav.dir > 0 ? "" : " past";
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (pinned) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
    setHeld(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (pinned) return;
    setHeld(false);
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const dir = dx < 0 ? 1 : -1;
      go(active + dir, dir);
    }
  };
  const onTouchCancel = () => {
    touch.current = null;
    setHeld(false);
  };

  return (
    <section
      ref={sectionRef}
      className={"chapters" + (playing && !pinned ? " playing" : "") + (held ? " paused" : "")}
      id="how"
      aria-label="How OctaSec works"
    >
      <div className="chap-track" ref={trackRef} style={{ ["--n" as string]: CH.length }}>
        <div className="chap-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
          <div className="wrap chap-head">
            <span className="eyebrow">How it works</span>
            <div
              className="chap-rail"
              aria-hidden="true"
              onAnimationEnd={(e) => {
                if (!pinned && e.animationName === "chapfill") go(active + 1, 1);
              }}
            >
              {CH.map((c, i) => (
                <span
                  key={c.k}
                  className={i === active ? "on" : i < active ? "done" : ""}
                  onClick={() => !pinned && go(i, i > active ? 1 : -1)}
                >
                  {c.k} {c.w}
                </span>
              ))}
              <i className="chap-bar" />
            </div>
          </div>
          {CH.map((c, i) => (
            <article key={c.k} className={"chap" + (c.v ? " verified" : "") + chapCls(i)}>
              <div className="wrap chap-in">
                <div className="chap-word" aria-hidden="true">
                  <span className="chap-num">{c.k}</span>
                  <span className="hatch">{c.w}</span>
                </div>
                <div className="chap-copy">
                  <span className="chap-step">{c.k} · {c.w.charAt(0) + c.w.slice(1).toLowerCase()}</span>
                  <h3>{c.t}</h3>
                  <p>{c.d}</p>
                  <div className="chap-chips">{c.c.map((x) => <span key={x}>{x}</span>)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

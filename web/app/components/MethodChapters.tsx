"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Scope → Map → Hunt → Prove" as pinned scroll chapters (docs/LANDING_DESIGN_V2.md §3).
 * Desktop with motion: a tall track with a sticky stage; scroll progress picks the
 * chapter and drives --p (0..1) for the rail. Phones / reduced motion / no JS:
 * the same markup renders as a plain stacked list (CSS decides — content never hidden).
 */
const CH = [
  { k: "01", w: "SCOPE", t: "You define it. We enforce it.", d: "Assets and rules of engagement are agreed and signed by both sides. Scope is enforced mechanically at the network level — not just on paper.", c: ["Signed RoE", "Allow-listed targets", "Test window"] },
  { k: "02", w: "MAP", t: "See what attackers see.", d: "Subdomains, ports, services, JS-hidden endpoints, technology fingerprints, cloud assets and leaked secrets — your real attack surface.", c: ["Subdomains", "Endpoints", "Fingerprints"] },
  { k: "03", w: "HUNT", t: "90+ techniques, chosen — never sprayed.", d: "The engine selects modules per feature, tests every role, and chains small weaknesses into the attack paths scanners never see.", c: ["Business logic", "Auth & roles", "Attack chains"] },
  { k: "04", w: "PROVE", t: "If we can't prove it, we don't report it.", d: "Minimum-impact proof, then a named human operator verifies and signs every finding. You get a case file, a fix — and a free retest.", c: ["Reproduction", "Human-verified", "Retest included"], v: true },
];

export default function MethodChapters() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    let raf = 0, cur = -1;
    const update = () => {
      raf = 0;
      if (!mq.matches) { track.style.removeProperty("--p"); return; }
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

  return (
    <section className="chapters" id="how" aria-label="How OctaSec works">
      <div className="chap-track" ref={trackRef} style={{ ["--n" as string]: CH.length }}>
        <div className="chap-stage">
          <div className="wrap chap-head">
            <span className="eyebrow">How it works</span>
            <div className="chap-rail" aria-hidden="true">
              {CH.map((c, i) => (
                <span key={c.k} className={i === active ? "on" : i < active ? "done" : ""}>{c.k} {c.w}</span>
              ))}
              <i className="chap-bar" />
            </div>
          </div>
          {CH.map((c, i) => (
            <article key={c.k} className={"chap" + (c.v ? " verified" : "") + (i === active ? " on" : i < active ? " past" : "")}>
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

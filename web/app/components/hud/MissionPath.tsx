"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from "react";
import { PLOT, STAGES, TRAJ, pointAt } from "./hudData";

const { w: VW, h: VH, x0: X0, x1: X1, y0: Y0, y1: Y1, card: CARD } = PLOT;
const N = STAGES.length;
// scroll progress → how far the climb is drawn: chapter i owns an equal stretch of the
// scroll, during which the stroke runs from stage i to stage i+1
const KNOTS = [...STAGES.map((s) => s.f), 1];
const drawn = (p: number) => {
  const x = Math.min(N, Math.max(0, p * N)), i = Math.min(N - 1, Math.floor(x));
  return KNOTS[i] + (KNOTS[i + 1] - KNOTS[i]) * (x - i);
};

/**
 * The method as a flight profile (Scope → Map → Hunt → Prove), on the old homepage's
 * chapter logic (MethodChapters):
 * - desktop with motion: a tall track with a pinned stage. Scroll progress draws the climb
 *   (--dr) and picks the chapter; its story shows in the chapter panel, the rail fills (--p).
 * - phones/tablets (<900px): a stories-style stepper. The rail becomes four segments; the
 *   active one fills (that fill is the timer), then the next chapter slides in from the
 *   right and the climb draws on to its stage. Swipe or tap a segment to move; a finger on
 *   it pauses. Only plays while on screen.
 * Reduced motion: nothing pins or auto-advances (tap/swipe still work). Without JS the climb
 * is drawn and the chapters read as a list.
 */
export default function MissionPath({ head }: { head: ReactNode }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [armed, setArmed] = useState(false);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [nav, setNav] = useState<{ prev: number; dir: 1 | -1 }>({ prev: -1, dir: 1 });
  const [playing, setPlaying] = useState(false);
  const [held, setHeld] = useState(false);

  // desktop: pinned stage, scroll progress draws the climb and picks the chapter
  useEffect(() => {
    const track = trackRef.current, plot = plotRef.current;
    if (!track || !plot) return;
    setArmed(true);
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    let raf = 0, cur = -1;
    const update = () => {
      raf = 0;
      setPinned(mq.matches);
      if (!mq.matches) { cur = -1; return; }
      const r = track.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      track.style.setProperty("--p", p.toFixed(4));
      plot.style.setProperty("--dr", drawn(p).toFixed(4));
      const i = Math.min(N - 1, Math.floor(p * N * 0.999));
      if (i !== cur) { cur = i; setActive(i); }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on, { passive: true });
    mq.addEventListener("change", on);
    update();
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      mq.removeEventListener("change", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  // phones/tablets: the climb follows the active chapter; the stepper only plays on screen
  useEffect(() => {
    if (pinned) return;
    plotRef.current?.style.setProperty("--dr", String(STAGES[active].f + (active === N - 1 ? 0.04 : 0.02)));
  }, [active, pinned]);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || pinned) { setPlaying(false); return; }
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [pinned]);

  const go = (to: number, dir: 1 | -1) => {
    const t = (to + N) % N;
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
  const onTouchStart = (e: TouchEvent) => {
    if (pinned) return;
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
    setHeld(true);
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (pinned) return;
    setHeld(false);
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      const dir = dx < 0 ? 1 : -1;
      go(active + dir, dir);
    }
  };
  const onTouchCancel = () => { touch.current = null; setHeld(false); };

  const grid: ReactNode[] = [];
  for (let x = X0; x <= X1; x += 80) grid.push(<line key={"v" + x} x1={x} y1={Y0} x2={x} y2={Y1} />);
  for (let y = Y1; y >= Y0; y -= 82) grid.push(<line key={"h" + y} x1={X0} y1={y} x2={X1} y2={y} />);
  const ticks: ReactNode[] = [];
  for (let x = X0; x <= X1; x += 16) ticks.push(<line key={x} x1={x} y1={Y1} x2={x} y2={(x - X0) % 80 ? Y1 + 4 : Y1 + 9} />);

  const cls =
    "h-sec hs-path" + (armed ? " mp-armed" : "") + (pinned ? " is-pinned" : "") +
    (playing && !pinned ? " playing" : "") + (held ? " paused" : "");

  return (
    <section ref={sectionRef} className={cls} aria-labelledby="hs-path-t">
      <div className="mp-track" ref={trackRef} style={{ "--n": N } as CSSProperties}>
        <div className="mp-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
          {head}
          <div
            className="mp-rail"
            aria-hidden="true"
            onAnimationEnd={(e) => { if (!pinned && e.animationName === "h-chapfill") go(active + 1, 1); }}
          >
            {STAGES.map((s, i) => (
              <span key={s.k} className={i === active ? "on" : i < active ? "done" : ""} onClick={() => !pinned && go(i, i > active ? 1 : -1)}>
                {s.k} {s.n}
              </span>
            ))}
            <i className="mp-bar" />
          </div>
          <div className="mp" ref={plotRef}>
            <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMin slice" aria-hidden="true">
              <defs>
                <linearGradient id="mp-tg" x1="60" x2="1330" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0" style={{ stopColor: "var(--h-acc)", stopOpacity: 0.6 }} />
                  <stop offset=".18" style={{ stopColor: "var(--h-acc)" }} />
                  <stop offset=".3" style={{ stopColor: "var(--h-red)" }} />
                  <stop offset=".86" style={{ stopColor: "var(--h-red)" }} />
                  <stop offset="1" style={{ stopColor: "var(--h-green-ink)" }} />
                </linearGradient>
                <linearGradient id="mp-ta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: "var(--h-red)", stopOpacity: 0.2 }} />
                  <stop offset="1" style={{ stopColor: "var(--h-red)", stopOpacity: 0 }} />
                </linearGradient>
                <filter id="mp-gl" x="-5%" y="-30%" width="110%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g className="mp-grid">{grid}</g>
              <g className="mp-ticks">{ticks}</g>
              <path className="mp-axis" d={`M${X0},${Y0} V${Y1} H${X1}`} />
              <text className="mp-ax hi" x={X0 + 10} y={Y0 + 14}>Impact</text>
              <text className="mp-ax" x={X1} y={Y1 + 24} textAnchor="end">Engagement timeline</text>
              <path className="mp-scan" d={`M${X0},318 L${X1},308`} />
              <text className="mp-ax" x={X1} y={297} textAnchor="end">Scanner PDF: known issues, nothing chained</text>
              <path className="mp-area" d={`${TRAJ} L1330,${Y1} L60,${Y1} Z`} />
              <path className="mp-line" d={TRAJ} pathLength={1} />
              {STAGES.map((s, i) => {
                const [x, y] = pointAt(s.f);
                return (
                  <g key={s.k} className={"mp-m" + (s.tone ? " " + s.tone : "") + (i <= active ? " on" : "") + (i === active ? " now" : "")}>
                    <line className="mp-drop" x1={x} y1={y} x2={x} y2={CARD} />
                    <circle className="mp-ping" cx={x} cy={y} r="14" />
                    <circle className="mp-halo" cx={x} cy={y} r="13" />
                    <circle className="mp-dot" cx={x} cy={y} r="5.5" />
                  </g>
                );
              })}
            </svg>
            <div className="mp-legend" aria-hidden="true">
              <span className="oc">OctaSec: impact climbs to proof</span>
              <span className="sc">Scanner PDF: known issues, nothing chained</span>
            </div>
            {/* the chapters: one story at a time (pinned / stepper), a plain list without JS */}
            <div className="mp-chapters">
              {STAGES.map((s, i) => (
                <article key={s.k} className={"mp-chap" + (s.tone ? " " + s.tone : "") + chapCls(i)}>
                  <span className="mp-word" aria-hidden="true">{s.n}</span>
                  <span className="mp-step">{s.k} · {s.n}</span>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                  <div className="mp-chips">{s.c.map((c) => <span key={c}>{c}</span>)}</div>
                </article>
              ))}
            </div>
            {STAGES.map((s, i) => {
              const [x] = pointAt(s.f);
              return (
                <div
                  key={s.k}
                  aria-hidden="true"
                  className={"mp-card c" + i + (s.align ? " " + s.align : "") + (s.tone ? " " + s.tone : "") + (i === active ? " on" : i < active ? " done" : "")}
                  style={{ left: ((x / VW) * 100).toFixed(3) + "%", top: ((CARD / VH) * 100).toFixed(3) + "%" }}
                >
                  <div className="mp-ch">
                    <span className="mp-k">{s.k}</span>
                    <b>{s.n}</b>
                    <span className={"h-tag" + (s.tone ? " " + s.tone : "")}>{s.tag}</span>
                  </div>
                  <p>{s.p}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

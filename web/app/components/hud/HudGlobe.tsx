"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { C, NODES, ORBITS, PACKETS, SPHERE, hop, nodePos, onOrbit, orbitArc, type NodeId, type Scene } from "./hudData";

type Props = { scene: Scene; step: number; formed: boolean; still: boolean; mini?: boolean };

const FORM_MS = 1500; // the sphere forms outward from the centre, where the intro mark lands
const SPIN = 0.0001; // rad per ms
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * The attack-surface globe: a dotted sphere on a canvas, orbit rings split into a far half
 * (under the sphere) and a near half (over it), the client's assets as labelled nodes,
 * packets travelling the orbits, and the current attack chain drawn hop by hop (`step`).
 * Theme colours come from CSS custom properties (--g-*), re-read on "themechange".
 * The loop sleeps while the stage is off screen; with `still` it draws one frame.
 */
export default function HudGlobe({ scene, step, formed, still, mini = false }: Props) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const packets = useRef<(SVGCircleElement | null)[]>([]);
  const formAt = useRef<number | null>(null);

  useEffect(() => {
    if (formed && formAt.current === null) formAt.current = performance.now();
  }, [formed]);

  useEffect(() => {
    const canvas = cv.current, box = wrap.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;

    let W = 0, H = 0, R = 0, cx = 0, cy = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = (Math.min(W, H) * SPHERE) / 700; cx = W / 2; cy = H / 2;
    };
    const colours = () => {
      const s = getComputedStyle(canvas), v = (k: string, d: string) => s.getPropertyValue(k).trim() || d;
      return { dot: v("--g-dot", "236,240,244"), a: v("--g-body-a", "#22272d"), b: v("--g-body-b", "#0d0f12"), c: v("--g-body-c", "#050607"), atm: v("--g-atm", "200,212,226"), rim: v("--g-rim", "220,232,245") };
    };
    let col = colours();

    // fibonacci sphere; brighter "land" blobs; a few bright "lights" inside them (seeded: same every load)
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const blobs = Array.from({ length: 10 }, () => {
      const u = rnd() * 2 - 1, t = rnd() * 6.283, q = Math.sqrt(1 - u * u);
      return [q * Math.cos(t), u, q * Math.sin(t), 0.28 + rnd() * 0.38];
    });
    const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
    const n = window.matchMedia("(max-width: 700px)").matches || lowEnd ? 2400 : 3400;
    const pts = new Float32Array(n * 5);
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * i) / (n - 1), q = Math.sqrt(1 - y * y), th = ga * i, x = Math.cos(th) * q, z = Math.sin(th) * q;
      let land = 0;
      for (const b of blobs) land = Math.max(land, 1 - Math.acos(Math.max(-1, Math.min(1, x * b[0] + y * b[1] + z * b[2]))) / b[3]);
      pts.set([x, y, z, land > 0 ? Math.min(1, land * 1.6) : 0, rnd()], i * 5);
    }

    const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    const draw = (a: number, form: number) => {
      ctx.clearRect(0, 0, W, H);
      if (form <= 0) return;
      const e = 1 - Math.pow(1 - form, 3), r = R * (0.84 + 0.16 * e);
      const atm = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.38);
      atm.addColorStop(0, `rgba(${col.atm},${(0.22 * e).toFixed(3)})`); atm.addColorStop(1, `rgba(${col.atm},0)`);
      ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, r * 1.38, 0, 7); ctx.fill();
      const bd = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.45, r * 0.05, cx, cy, r);
      bd.addColorStop(0, col.a); bd.addColorStop(0.6, col.b); bd.addColorStop(1, col.c);
      ctx.globalAlpha = e; ctx.fillStyle = bd; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < n; i++) {
        const o = i * 5, x = pts[o], y = pts[o + 1], z = pts[o + 2], land = pts[o + 3];
        const X = x * ca + z * sa, Z0 = -x * sa + z * ca, Y = y * ct - Z0 * st, Z = y * st + Z0 * ct;
        if (Z < 0) continue;
        const grow = clamp((form * 1.4 - Math.hypot(X, Y)) / 0.4); // outward from the centre
        if (grow <= 0) continue;
        const city = land > 0.25 && pts[o + 4] < 0.08;
        const lit = city ? 1 : land ? 0.42 + 0.58 * land : 0.06;
        const key = 0.55 + 0.45 * Math.max(0, -X * 0.35 - Y * 0.6 + Z * 0.7);
        const al = Math.min(1, lit * key * (0.3 + 0.7 * Z)) * grow;
        const s = city ? 2.3 : land ? 1.6 : 1;
        ctx.fillStyle = `rgba(${col.dot},${al.toFixed(3)})`;
        ctx.fillRect(cx + X * r - s / 2, cy + Y * r - s / 2, s, s);
      }
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
      const rim = ctx.createRadialGradient(cx, cy + r * 0.2, r * 0.8, cx, cy + r * 0.2, r * 1.25);
      rim.addColorStop(0, `rgba(${col.rim},0)`); rim.addColorStop(1, `rgba(${col.rim},${(0.42 * e).toFixed(3)})`);
      ctx.fillStyle = rim; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r); ctx.restore();
      ctx.strokeStyle = `rgba(${col.rim},${(0.55 * e).toFixed(3)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    };

    // packets: hidden while they pass behind the sphere
    const movePackets = (ms: number) => {
      PACKETS.forEach(([oi, lap, t0], i) => {
        const el = packets.current[i];
        if (!el) return;
        const t = t0 + ((ms / 1000) * 360) / lap, o = ORBITS[oi], [x, y] = onOrbit(o, t);
        const far = Math.sin((t * Math.PI) / 180) < 0;
        const hidden = far && Math.hypot(x - C, y - C) < SPHERE;
        el.setAttribute("cx", x.toFixed(1)); el.setAttribute("cy", y.toFixed(1));
        el.setAttribute("opacity", hidden ? "0" : far ? ".45" : "1");
      });
    };

    let a = 0.9, last = 0, raf = 0, visible = true;
    const formNow = (t: number) => (formAt.current === null ? 0 : clamp((t - formAt.current) / FORM_MS));
    const loop = (t: number) => {
      raf = 0;
      if (!visible) return;
      if (last) a += Math.min(50, t - last) * SPIN;
      last = t;
      draw(a, formNow(t));
      movePackets(t);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !still) { last = 0; raf = requestAnimationFrame(loop); } };

    size();
    if (still) { draw(a, 1); movePackets(0); }
    else kick();

    const ro = new ResizeObserver(() => { size(); if (still) draw(a, 1); });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { threshold: 0 });
    io.observe(box);
    const onTheme = () => { col = colours(); if (still) draw(a, 1); };
    window.addEventListener("themechange", onTheme);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      window.removeEventListener("themechange", onTheme);
    };
  }, [still]);

  const [p0, p1, p2] = scene.path;
  const hit = (id: NodeId) => scene.path.indexOf(id);

  return (
    <div className="h-orb" ref={wrap}>
      <svg className="h-orb-back" viewBox="0 0 700 700" aria-hidden="true">
        {ORBITS.map((o, i) => (
          <path key={i} d={orbitArc(o, 180, 360)} className={o.halo ? "h-halo far" : "h-ring"} style={{ strokeOpacity: o.op, strokeDasharray: o.dash, strokeWidth: o.w }} />
        ))}
      </svg>
      <canvas ref={cv} aria-hidden="true" />
      <svg className="h-orb-front" viewBox="0 0 700 700" aria-hidden="true">
        <defs>
          <linearGradient id="hg-halo" x1="0" x2="1">
            <stop offset="0" style={{ stopColor: "var(--h-halo)", stopOpacity: 0 }} />
            <stop offset=".5" style={{ stopColor: "var(--h-halo)" }} />
            <stop offset="1" style={{ stopColor: "var(--h-halo)", stopOpacity: 0 }} />
          </linearGradient>
          <filter id="hg-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {ORBITS.map((o, i) => (
          <path key={i} d={orbitArc(o, 0, 180)} className={o.halo ? "h-halo" : "h-ring"} style={{ strokeOpacity: o.op, strokeDasharray: o.dash, strokeWidth: o.w }} />
        ))}
        {/* the chain, hop by hop: a drawn trace, then a flowing dash over it */}
        {mini ? null : [[p0, p1], [p1, p2]].map(([a, b], i) => (
          <g key={scene.id + i} className={"h-hop" + (step > i + 1 ? " on" : "")}>
            <path className="h-trace" d={hop(a, b)} pathLength={1} />
            <path className="h-flow" d={hop(a, b)} />
          </g>
        ))}
        {PACKETS.map((_, i) => (
          <circle key={i} ref={(el) => { packets.current[i] = el; }} className="h-packet" r="3" cx={C} cy={C} opacity="0" />
        ))}
        {mini ? null : NODES.map((nd, i) => {
          const [x, y] = nodePos(nd.id), k = hit(nd.id);
          const lx = x + nd.dx, ly = y + nd.dy, end = nd.end;
          const cls =
            "h-node" +
            (k >= 0 && step > k ? " hit" : "") +
            (k === 2 && step >= 3 ? " crit" : "") +
            (k === 2 && step >= 6 ? " ok" : "");
          return (
            <g key={nd.id} className={cls} style={{ "--n": i } as CSSProperties}>
              <circle className="h-ping" cx={x} cy={y} r="11" />
              <circle className="h-ring2" cx={x} cy={y} r="11" />
              <circle className="h-core-dot" cx={x} cy={y} r="4.5" />
              <path className="h-lead" d={`M${x},${y} L${lx},${ly + 5} L${lx + (end ? -10 : 10)},${ly + 5}`} />
              <text className={nd.short ? "lg cut" : "lg"} x={lx + (end ? -14 : 14)} y={ly + 9} textAnchor={end ? "end" : "start"}>{nd.label}</text>
              {nd.short ? <text className="sh" x={lx + (end ? -14 : 14)} y={ly + 9} textAnchor={end ? "end" : "start"}>{nd.short}</text> : null}
              {k === 2 ? (
                <text className="h-verified" x={lx + (end ? -14 : 14)} y={ly + 28} textAnchor={end ? "end" : "start"}>✓ verified</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {/* where the intro film's mark lands (BreachIntro target) */}
      {mini ? null : <span className="hud-core" aria-hidden="true" />}
    </div>
  );
}

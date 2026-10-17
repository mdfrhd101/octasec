"use client";

import { useEffect, useRef } from "react";

/**
 * Hero visual: the Facet-Seal as a live scanner (docs/LANDING_DESIGN_V2.md).
 * A beam sweeps the octagon; candidate findings light up gold when it passes,
 * then a moment later turn green — "human-verified". Canvas 2D, no deps.
 * - DPR capped (2 desktop / 1.5 phone); pauses off-screen and in hidden tabs
 * - prefers-reduced-motion: one static frame, no animation
 * - the glow ring is pre-rendered once (no per-frame shadowBlur)
 */
const TAU = Math.PI * 2;
const GOLD = "232,193,90";
const GREEN = "69,224,168";

function octagon(ctx: CanvasRenderingContext2D, r: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + Math.PI / 8 + (i * TAU) / 8;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

type Dot = { a: number; d: number; state: 0 | 1 | 2; t: number; label: string };
const LABELS = ["IDOR", "auth bypass", "SSRF", "token reuse", "XSS", "race"];

export default function SealScanner() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current, cv = cvRef.current;
    if (!wrap || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.innerWidth < 760;

    let W = 0, R = 0, dpr = 1, raf = 0, running = false, visible = true;
    let ring: HTMLCanvasElement | null = null;
    let mx = 0, my = 0, tx = 0, ty = 0;

    // dust particles in polar coords around the seal
    const N = phone ? 70 : 140;
    const dust = Array.from({ length: N }, () => ({
      a: Math.random() * TAU, d: 0.35 + Math.random() * 0.75, s: 0.4 + Math.random() * 1.4,
      v: (Math.random() - 0.5) * 0.0016, tw: Math.random() * TAU,
    }));
    // candidate findings inside the ring
    const dots: Dot[] = Array.from({ length: 6 }, (_, i) => ({
      a: (i / 6) * TAU + Math.random() * 0.6, d: 0.28 + Math.random() * 0.36, state: 0, t: 0, label: LABELS[i],
    }));

    function buildRing() {
      // glowing gold octagon, rendered once at full resolution
      const c = document.createElement("canvas");
      const S = Math.ceil(W * dpr);
      c.width = c.height = S;
      const g = c.getContext("2d")!;
      g.scale(dpr, dpr);
      g.translate(W / 2, W / 2);
      const grad = g.createLinearGradient(-R, -R, R, R);
      grad.addColorStop(0, "#f6dd8d"); grad.addColorStop(0.45, "#e8c15a"); grad.addColorStop(1, "#a97f2a");
      g.lineJoin = "round";
      for (const [blur, alpha, width] of [[40, 0.55, R * 0.075], [14, 0.85, R * 0.06], [0, 1, R * 0.05]] as const) {
        g.save();
        g.shadowColor = `rgba(${GOLD},${alpha})`;
        g.shadowBlur = blur;
        g.strokeStyle = grad;
        g.lineWidth = width;
        octagon(g, R * 0.72);
        g.stroke();
        g.restore();
      }
      // inner bevel line
      g.strokeStyle = "rgba(255,240,200,.35)";
      g.lineWidth = 1;
      octagon(g, R * 0.665);
      g.stroke();
      ring = c;
    }

    function resize() {
      W = wrap!.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(W * dpr);
      R = W / 2;
      buildRing();
      if (!running) draw(performance.now());
    }

    let sweep = -Math.PI / 2;
    let last = performance.now();

    function draw(now: number) {
      const dt = Math.min(48, now - last);
      last = now;
      if (!reduce) sweep += dt * 0.0011;
      tx += (mx - tx) * 0.06; ty += (my - ty) * 0.06;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, W);
      ctx!.save();
      ctx!.translate(W / 2, W / 2);

      // soft core glow
      const core = ctx!.createRadialGradient(0, 0, 0, 0, 0, R * 0.8);
      core.addColorStop(0, `rgba(${GOLD},.13)`); core.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = core;
      ctx!.fillRect(-R, -R, W, W);

      // outline octagons (slow counter-rotation, parallax)
      ctx!.lineWidth = 1;
      for (const [r, sp, a, off] of [[0.96, 0.00006, 0.16, 18], [0.86, -0.00009, 0.1, 10]] as const) {
        ctx!.save();
        ctx!.translate(tx * off, ty * off);
        ctx!.strokeStyle = `rgba(${GOLD},${a})`;
        octagon(ctx!, R * r, reduce ? 0.2 : now * sp);
        ctx!.stroke();
        ctx!.restore();
      }

      // dust
      for (const p of dust) {
        if (!reduce) { p.a += p.v * dt * 0.06; p.tw += dt * 0.003; }
        const x = Math.cos(p.a) * p.d * R + tx * 6 * p.s, y = Math.sin(p.a) * p.d * R + ty * 6 * p.s;
        ctx!.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(p.tw));
        ctx!.fillStyle = `rgb(${GOLD})`;
        ctx!.fillRect(x, y, p.s, p.s);
      }
      ctx!.globalAlpha = 1;

      // sweep beam (clipped to the inner octagon)
      ctx!.save();
      octagon(ctx!, R * 0.64);
      ctx!.clip();
      const beam = typeof ctx!.createConicGradient === "function" ? ctx!.createConicGradient(sweep - 0.9, 0, 0) : null;
      if (beam) {
        beam.addColorStop(0, "rgba(0,0,0,0)");
        beam.addColorStop(0.13, `rgba(${GOLD},.22)`);
        beam.addColorStop(0.1432, `rgba(${GOLD},.55)`);
        beam.addColorStop(0.145, "rgba(0,0,0,0)");
        ctx!.fillStyle = beam;
        ctx!.fillRect(-R, -R, W, W);
      }
      // range rings
      ctx!.strokeStyle = "rgba(255,255,255,.05)";
      for (const r of [0.22, 0.42]) { octagon(ctx!, R * r); ctx!.stroke(); }
      ctx!.restore();

      // findings: hit by the beam → candidate (gold) → verified (green) → fade, respawn
      const beamAngle = ((sweep % TAU) + TAU) % TAU;
      ctx!.font = `500 ${Math.max(10, R * 0.045)}px "Share Tech Mono", monospace`;
      for (const d of dots) {
        const da = ((d.a % TAU) + TAU) % TAU;
        const diff = Math.abs(((beamAngle - da + Math.PI * 3) % TAU) - Math.PI);
        if (reduce) { d.state = d.d > 0.45 ? 2 : 1; d.t = 900; }
        else if (d.state === 0 && diff < 0.05) { d.state = 1; d.t = 0; }
        else if (d.state) {
          d.t += dt;
          if (d.state === 1 && d.t > 1400) { d.state = 2; d.t = 0; }
          else if (d.state === 2 && d.t > 2600) { d.state = 0; d.a = Math.random() * TAU; d.d = 0.26 + Math.random() * 0.36; }
        }
        if (!d.state) continue;
        const x = Math.cos(d.a) * d.d * R, y = Math.sin(d.a) * d.d * R;
        const col = d.state === 1 ? GOLD : GREEN;
        const k = d.state === 2 ? Math.max(0, 1 - Math.max(0, d.t - 1800) / 800) : Math.min(1, d.t / 200 + (reduce ? 1 : 0));
        const pulse = d.state === 1 ? 1 + 0.5 * Math.sin(d.t * 0.012) : 1;
        ctx!.globalAlpha = k;
        ctx!.fillStyle = `rgba(${col},.18)`;
        ctx!.beginPath(); ctx!.arc(x, y, R * 0.045 * pulse, 0, TAU); ctx!.fill();
        ctx!.fillStyle = `rgb(${col})`;
        ctx!.beginPath(); ctx!.arc(x, y, R * 0.014, 0, TAU); ctx!.fill();
        ctx!.fillStyle = `rgba(${col},.9)`;
        ctx!.fillText(d.state === 1 ? d.label : "verified ✓", x + R * 0.04, y - R * 0.03);
      }
      ctx!.globalAlpha = 1;

      // the seal's prompt glyph at the core: gold chevron + green cursor
      const u = R * 0.075;
      ctx!.fillStyle = "rgba(4,8,11,.85)";
      octagon(ctx!, u * 2.1); ctx!.fill();
      ctx!.fillStyle = "#e8c15a";
      ctx!.beginPath();
      ctx!.moveTo(-u * 1.0, -u * 0.95); ctx!.lineTo(-u * 0.45, -u * 0.95); ctx!.lineTo(u * 0.35, 0);
      ctx!.lineTo(-u * 0.45, u * 0.95); ctx!.lineTo(-u * 1.0, u * 0.95); ctx!.lineTo(-u * 0.2, 0);
      ctx!.closePath(); ctx!.fill();
      ctx!.fillStyle = `rgba(${GREEN},${reduce ? 1 : 0.55 + 0.45 * (Math.sin(now * 0.006) > 0 ? 1 : 0)})`;
      ctx!.fillRect(u * 0.6, -u * 0.6, u * 0.36, u * 1.2);

      // the glowing ring on top (pre-rendered), with a breathing scale
      if (ring) {
        const s = reduce ? 1 : 1 + 0.012 * Math.sin(now * 0.0012);
        ctx!.save();
        ctx!.translate(tx * -4, ty * -4);
        ctx!.scale(s, s);
        ctx!.drawImage(ring, -W / 2, -W / 2, W, W);
        ctx!.restore();
      }
      ctx!.restore();
    }

    function loop(now: number) {
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (reduce || running || !visible || document.hidden) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }, { threshold: 0.01 });
    io.observe(wrap);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });
    start();

    return () => {
      stop(); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="seal" ref={wrapRef} aria-hidden="true">
      <canvas ref={cvRef} />
      <div className="seal-legend">
        <span><i className="g" /> AI candidate</span>
        <span><i className="v" /> Human-verified</span>
      </div>
    </div>
  );
}

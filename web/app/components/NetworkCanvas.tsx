"use client";

import { useEffect, useRef } from "react";

type Variant = "hero" | "final";

/**
 * Gold particle-network canvas, ported 1:1 from site/app.js.
 *  - "hero"  -> #heroBg: drifting threat-network, connecting lines + glow nodes
 *  - "final" -> #finalBg: lighter particle field for the final CTA band
 * Respects prefers-reduced-motion (renders a single static frame). Animates only while
 * on screen and the tab is visible; fewer particles on phones.
 */
export default function NetworkCanvas({ variant }: { variant: Variant }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !cv.getContext) return;

    const reduce =
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const phone = window.innerWidth < 760;

    type Pt = { x: number; y: number; vx: number; vy: number; r: number; big?: boolean };
    let W = 0,
      H = 0,
      ctx: CanvasRenderingContext2D,
      pts: Pt[] = [],
      raf = 0,
      lastW = 0;

    function fit() {
      const r = cv!.getBoundingClientRect();
      cv!.width = Math.max(1, r.width * DPR);
      cv!.height = Math.max(1, r.height * DPR);
      const c = cv!.getContext("2d")!;
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      W = r.width;
      H = r.height;
      ctx = c;
    }

    function initHero() {
      fit();
      pts = [];
      const n = Math.round(Math.min(96, (W * H) / 12000));
      for (let i = 0; i < n; i++)
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.13,
          vy: (Math.random() - 0.5) * 0.13,
          r: Math.random() * 1.3 + 0.4,
          big: Math.random() < 0.07,
        });
    }

    function renderHero(move: boolean) {
      ctx.clearRect(0, 0, W, H);
      for (let a = 0; a < pts.length; a++)
        for (let b = a + 1; b < pts.length; b++) {
          const dx = pts[a].x - pts[b].x,
            dy = pts[a].y - pts[b].y,
            d = dx * dx + dy * dy;
          if (d < 11000) {
            ctx.strokeStyle = "rgba(232,67,58," + (1 - d / 11000) * 0.11 + ")";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (move) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x += W;
          if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H;
          if (p.y > H) p.y -= H;
        }
        if (p.big) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
          g.addColorStop(0, "rgba(232,67,58,.55)");
          g.addColorStop(1, "rgba(232,67,58,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 11, 0, 7);
          ctx.fill();
        }
        ctx.fillStyle = p.big ? "rgba(255,154,134,.85)" : "rgba(200,210,216,.45)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fill();
      }
    }

    function initFinal() {
      fit();
      pts = [];
      const n = Math.round(Math.min(phone ? 24 : 46, (W * H) / 20000)); // the line pass is O(n²)
      for (let i = 0; i < n; i++)
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          r: Math.random() * 1.2 + 0.4,
        });
    }

    function frameFinal() {
      ctx.clearRect(0, 0, W, H);
      for (let a = 0; a < pts.length; a++)
        for (let b = a + 1; b < pts.length; b++) {
          const dx = pts[a].x - pts[b].x,
            dy = pts[a].y - pts[b].y,
            d = dx * dx + dy * dy;
          if (d < 9000) {
            ctx.strokeStyle = "rgba(232,67,58," + (1 - d / 9000) * 0.08 + ")";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pts[a].x, pts[a].y);
            ctx.lineTo(pts[b].x, pts[b].y);
            ctx.stroke();
          }
        }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += W;
        if (p.x > W) p.x -= W;
        if (p.y < 0) p.y += H;
        if (p.y > H) p.y -= H;
        ctx.fillStyle = "rgba(232,67,58,.34)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fill();
      }
    }

    function finalStatic() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        ctx.fillStyle = "rgba(232,67,58,.3)";
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pts[i].r, 0, 7);
        ctx.fill();
      }
    }

    const init = () => {
      if (variant === "hero") {
        initHero();
        if (reduce) renderHero(false);
      } else {
        initFinal();
        if (reduce) finalStatic();
      }
      lastW = W;
    };

    let to: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(to);
      to = setTimeout(() => {
        // height-only change (the mobile URL bar showing/hiding): refit, keep the particles
        if (Math.abs(cv.getBoundingClientRect().width - lastW) < 1) {
          fit();
          if (reduce) {
            if (variant === "hero") renderHero(false);
            else finalStatic();
          }
          return;
        }
        init();
      }, 200);
    };

    // animate only while on screen and the tab is visible
    let running = false,
      visible = true;
    const step = variant === "hero" ? () => renderHero(true) : frameFinal;
    const loop = () => {
      step();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduce || running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    const onVis = () => (document.hidden ? stop() : start());

    init();
    io.observe(cv);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize, { passive: true });
    start();
    return () => {
      stop();
      io.disconnect();
      clearTimeout(to);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [variant]);

  const id = variant === "hero" ? "heroBg" : "finalBg";
  return <canvas id={id} ref={ref} aria-hidden="true" />;
}

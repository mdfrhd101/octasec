"use client";

import { useEffect, useRef } from "react";

type Variant = "hero" | "final";

/**
 * The old homepage's particle network (NetworkCanvas), in the HUD colours:
 *  - "hero":  a drifting threat network behind the hero: green links and dots, a few red
 *             glow nodes (the weak spots)
 *  - "final": a lighter field behind the final call
 * Colours come from CSS (--f-line, --f-dot, --f-hot: "r,g,b"), re-read on "themechange".
 * Reduced motion: one static frame. Animates only on screen and in a visible tab; fewer
 * particles on phones (the link pass is O(n²)).
 */
export default function HudField({ variant }: { variant: Variant }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.innerWidth < 760;
    const hero = variant === "hero";
    type Pt = { x: number; y: number; vx: number; vy: number; r: number; hot: boolean };
    let W = 0, H = 0, pts: Pt[] = [], raf = 0, visible = true;
    const read = () => {
      const s = getComputedStyle(cv), v = (k: string, d: string) => s.getPropertyValue(k).trim() || d;
      return { line: v("--f-line", "47,174,120"), dot: v("--f-dot", "120,200,160"), hot: v("--f-hot", "232,67,58") };
    };
    let col = read();
    const LINK = hero ? 11000 : 9000;

    const init = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(hero ? (phone ? 34 : 70) : (phone ? 22 : 40), (W * H) / (hero ? 12000 : 20000)));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.13, vy: (Math.random() - 0.5) * 0.13,
        r: Math.random() * 1.3 + 0.4, hot: hero && Math.random() < 0.07,
      }));
    };
    const frame = (move: boolean) => {
      ctx.clearRect(0, 0, W, H);
      for (let a = 0; a < pts.length; a++)
        for (let b = a + 1; b < pts.length; b++) {
          const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = dx * dx + dy * dy;
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${col.line},${((1 - d / LINK) * (hero ? 0.16 : 0.12)).toFixed(3)})`;
            ctx.lineWidth = hero ? 0.6 : 0.5;
            ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
          }
        }
      for (const p of pts) {
        if (move) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
        }
        if (p.hot) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
          g.addColorStop(0, `rgba(${col.hot},.5)`); g.addColorStop(1, `rgba(${col.hot},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill();
        }
        ctx.fillStyle = p.hot ? `rgba(${col.hot},.9)` : `rgba(${col.dot},${hero ? 0.5 : 0.38})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
    };
    const loop = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      frame(true);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };

    init();
    frame(false);
    kick();
    let lastW = W;
    const onResize = () => { if (Math.abs(cv.getBoundingClientRect().width - lastW) > 40) { init(); lastW = W; frame(false); } };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(cv);
    const onVis = () => kick();
    const onTheme = () => { col = read(); frame(false); };
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("themechange", onTheme);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("themechange", onTheme);
    };
  }, [variant]);

  return <canvas ref={ref} className={"h-field " + variant} aria-hidden="true" />;
}

import { useEffect, useRef } from "react";

const isFirefox = () => typeof CSS !== "undefined" && CSS.supports("-moz-appearance", "none");

/**
 * The website's hero particle network (web/app/components/hud/HudField.tsx), behind the sign-in
 * screens: green links and dots drifting, a few red glow nodes. Colours come from CSS (--f-line,
 * --f-dot, --f-hot: "r,g,b"). Reduced motion: one static frame. Animates only in a visible tab;
 * fewer particles on phones (the link pass is O(n²)).
 */
export default function HudField() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.innerWidth < 760;
    const ff = isFirefox(), gap = ff ? 48 : 0, step = ff ? 3 : 1; // Firefox: 20 fps at the same speed, 1× canvas
    const LINK = 11000;
    const s = getComputedStyle(cv), v = (k, d) => s.getPropertyValue(k).trim() || d;
    const col = { line: v("--f-line", "47,174,120"), dot: v("--f-dot", "120,210,165"), hot: v("--f-hot", "232,67,58") };
    let W = 0, H = 0, pts = [], raf = 0, last = 0;

    const init = () => {
      const dpr = ff ? 1 : Math.min(window.devicePixelRatio || 1, 2), r = cv.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.max(1, W * dpr); cv.height = Math.max(1, H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(phone ? 34 : 70, (W * H) / 12000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.13, vy: (Math.random() - 0.5) * 0.13,
        r: Math.random() * 1.3 + 0.4, hot: Math.random() < 0.07,
      }));
    };
    const frame = (move) => {
      ctx.clearRect(0, 0, W, H);
      // one colour per pass, alpha per link: parsing a colour string for every link is what costs
      ctx.strokeStyle = `rgb(${col.line})`;
      ctx.lineWidth = 0.6;
      for (let a = 0; a < pts.length; a++)
        for (let b = a + 1; b < pts.length; b++) {
          const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = dx * dx + dy * dy;
          if (d < LINK) {
            ctx.globalAlpha = (1 - d / LINK) * 0.16;
            ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
          }
        }
      ctx.globalAlpha = 1;
      const dot = `rgba(${col.dot},.5)`, hot = `rgba(${col.hot},.9)`;
      for (const p of pts) {
        if (move) {
          p.x += p.vx * step; p.y += p.vy * step;
          if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
          if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
        }
        if (p.hot) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
          g.addColorStop(0, `rgba(${col.hot},.5)`); g.addColorStop(1, `rgba(${col.hot},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill();
        }
        ctx.fillStyle = p.hot ? hot : dot;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
    };
    const loop = (t) => {
      raf = 0;
      if (document.hidden) return;
      if (t - last >= gap) { last = t; frame(true); }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };

    init();
    frame(false);
    kick();
    let lastW = W;
    const onResize = () => { if (Math.abs(cv.getBoundingClientRect().width - lastW) > 40) { init(); lastW = W; frame(false); } };
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", kick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", kick);
    };
  }, []);

  return <canvas ref={ref} className="h-field" aria-hidden="true" />;
}

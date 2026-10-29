"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The old CursorCard, for HUD panels: a red shadow and glow that glide with a real mouse
 * (pen too; touch is ignored). Eases five CSS variables in one requestAnimationFrame loop
 * and writes them on the WRAPPER, because the shadow has to be a drop-shadow filter there:
 * the panel's chamfer clip would cut an ordinary box-shadow off.
 *   --px/--py  pointer offset from the centre, -1..1  → the red drop shadow
 *   --gx/--gy  pointer position inside (px)            → the red glow
 *   --sa       hover strength 0..1                     → fades both in and out
 */
export default function HudCursor({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const K = reduce ? 1 : 0.14, KG = reduce ? 1 : 0.22, KF = reduce ? 1 : 0.12;
    let px = 0, py = 0, tpx = 0, tpy = 0, gx = 0, gy = 0, tgx = 0, tgy = 0, sa = 0, tsa = 0, raf = 0;
    const write = () => {
      const s = el.style;
      s.setProperty("--px", px.toFixed(3)); s.setProperty("--py", py.toFixed(3));
      s.setProperty("--gx", gx.toFixed(1) + "px"); s.setProperty("--gy", gy.toFixed(1) + "px");
      s.setProperty("--sa", sa.toFixed(3));
    };
    const loop = () => {
      raf = 0;
      px += (tpx - px) * K; py += (tpy - py) * K;
      gx += (tgx - gx) * KG; gy += (tgy - gy) * KG;
      sa += (tsa - sa) * KF;
      write();
      if (Math.abs(tpx - px) + Math.abs(tpy - py) + Math.abs(tsa - sa) > 0.002 || Math.abs(tgx - gx) + Math.abs(tgy - gy) > 0.3)
        raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const aim = (e: PointerEvent) => {
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      tpx = (x / r.width) * 2 - 1; tpy = (y / r.height) * 2 - 1; tgx = x; tgy = y;
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      aim(e);
      if (sa < 0.05) { px = tpx; py = tpy; gx = tgx; gy = tgy; } // start under the pointer
      tsa = 1;
      kick();
    };
    const move = (e: PointerEvent) => { if (e.pointerType === "touch" || tsa === 0) return; aim(e); kick(); };
    const leave = () => { tsa = 0; kick(); };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="h-cfx" ref={ref}>{children}</div>;
}

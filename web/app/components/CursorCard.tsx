"use client";

import { useEffect, useRef } from "react";

/**
 * Pointer-driven FX for the wrapped `.card` (mouse/pen only). Eases five CSS variables in one
 * requestAnimationFrame loop, so the red shadow and glow glide with the pointer instead of
 * jumping (a CSS transition restarts on every pointermove; a per-frame lerp doesn't):
 *   --px/--py  pointer offset from the card centre, -1..1  → the red drop shadow
 *   --gx/--gy  pointer position inside the card (px)       → the red glow
 *   --sa       hover strength 0..1                         → fades both in and out
 * The look itself lives in hover-interactive.css §5. Touch input is ignored.
 */
export default function CursorCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const card = ref.current?.querySelector<HTMLElement>(".card");
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const K_SHADOW = reduce ? 1 : 0.14; // per-frame ease toward the pointer
    const K_GLOW = reduce ? 1 : 0.22;
    const K_FADE = reduce ? 1 : 0.12;

    let px = 0, py = 0, tpx = 0, tpy = 0;
    let gx = 0, gy = 0, tgx = 0, tgy = 0;
    let sa = 0, tsa = 0;
    let raf = 0;

    const write = () => {
      const s = card.style;
      s.setProperty("--px", px.toFixed(3));
      s.setProperty("--py", py.toFixed(3));
      s.setProperty("--gx", gx.toFixed(1) + "px");
      s.setProperty("--gy", gy.toFixed(1) + "px");
      s.setProperty("--sa", sa.toFixed(3));
    };
    const loop = () => {
      raf = 0;
      px += (tpx - px) * K_SHADOW;
      py += (tpy - py) * K_SHADOW;
      gx += (tgx - gx) * K_GLOW;
      gy += (tgy - gy) * K_GLOW;
      sa += (tsa - sa) * K_FADE;
      write();
      const busy =
        Math.abs(tpx - px) + Math.abs(tpy - py) + Math.abs(tsa - sa) > 0.002 ||
        Math.abs(tgx - gx) + Math.abs(tgy - gy) > 0.3;
      if (busy) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const aim = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      tpx = (x / r.width) * 2 - 1;
      tpy = (y / r.height) * 2 - 1;
      tgx = x;
      tgy = y;
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      aim(e);
      if (sa < 0.05) {
        // fresh entry: start under the pointer instead of sweeping in from the last spot
        px = tpx; py = tpy; gx = tgx; gy = tgy;
      }
      tsa = 1;
      kick();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || tsa === 0) return;
      aim(e);
      kick();
    };
    const onLeave = () => {
      tsa = 0;
      kick();
    };

    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerleave", onLeave);
    return () => {
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cfx-stage" ref={ref}>
      {children}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global motion engine, ported from site/app.js:
 *  - card mouse-glow (--mx/--my) + 3D tilt (--rx/--ry)
 *  - hero headline word reveal (#l1 -> .rword)
 *  - scroll-reveal IntersectionObserver for .rv / .stagger / .dash-tbl
 *  - scroll progress bar + .section-head parallax
 *  - word-split .mh headlines inside revealed sections
 *  - magnetic primary buttons (.btn-white)
 * All effects are no-ops / static under prefers-reduced-motion.
 * Re-runs per route so client navigation re-wires the new DOM.
 */
export default function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const reduce =
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    const cleanups: Array<() => void> = [];

    /* card mouse-glow */
    const onGlow = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const c = t && t.closest ? (t.closest(".card") as HTMLElement | null) : null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", e.clientX - r.left + "px");
      c.style.setProperty("--my", e.clientY - r.top + "px");
    };
    document.addEventListener("pointermove", onGlow, { passive: true });
    cleanups.push(() => document.removeEventListener("pointermove", onGlow));

    /* hero headline word reveal (#l1) */
    if (!reduce) {
      const l1 = document.getElementById("l1");
      if (l1 && !l1.querySelector(".rwrap")) {
        const words = (l1.textContent || "").split(" ");
        l1.textContent = "";
        words.forEach((w, idx) => {
          const wr = document.createElement("span");
          wr.className = "rwrap";
          const inn = document.createElement("span");
          inn.className = "rword";
          inn.textContent = w;
          inn.style.animationDelay = 0.06 * idx + "s";
          wr.appendChild(inn);
          l1.appendChild(wr);
          if (idx < words.length - 1) l1.appendChild(document.createTextNode(" "));
        });
      }
    }

    /* word-split .mh headlines inside reveal/stagger sections */
    if (!reduce) {
      document.querySelectorAll<HTMLElement>(".mh").forEach((h) => {
        if (!h.closest(".rv") && !h.closest(".stagger")) return;
        if (h.querySelector(".w")) return;
        let idx = 0;
        Array.prototype.slice.call(h.childNodes).forEach((n: ChildNode) => {
          if (n.nodeType !== 3 || !n.textContent || !n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = part;
            s.style.transitionDelay = idx * 42 + "ms";
            idx++;
            frag.appendChild(s);
          });
          h.replaceChild(frag, n);
        });
      });
    }

    /* 3D tilt vars on cards */
    if (!reduce) {
      const onTilt = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null;
        const c = t && t.closest ? (t.closest(".card") as HTMLElement | null) : null;
        if (!c) return;
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--rx", (px * 4).toFixed(2) + "deg");
        c.style.setProperty("--ry", (-py * 3).toFixed(2) + "deg");
      };
      document.addEventListener("pointermove", onTilt, { passive: true });
      cleanups.push(() => document.removeEventListener("pointermove", onTilt));
    }

    /* magnetic primary buttons */
    if (!reduce) {
      document.querySelectorAll<HTMLElement>(".btn-white").forEach((b) => {
        const move = (e: PointerEvent) => {
          const r = b.getBoundingClientRect();
          b.style.transform =
            "translate(" +
            ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) +
            "px," +
            ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) +
            "px)";
        };
        const leave = () => {
          b.style.transform = "";
        };
        b.addEventListener("pointermove", move);
        b.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          b.removeEventListener("pointermove", move);
          b.removeEventListener("pointerleave", leave);
        });
      });
    }

    /* scroll-reveal */
    const rvs = Array.prototype.slice.call(
      document.querySelectorAll(".rv, .stagger, .dash-tbl")
    ) as HTMLElement[];
    function countUp(root: HTMLElement) {
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => {
        const to = Number(n.dataset.count) || 0;
        if (reduce || to === 0 || n.dataset.counted) return;
        n.dataset.counted = "1";
        const t0 = performance.now(), dur = 1400;
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          n.textContent = String(Math.round(to * (1 - Math.pow(2, -10 * k))));
          if (k < 1) requestAnimationFrame(step); else n.textContent = String(to);
        };
        n.textContent = "0";
        requestAnimationFrame(step);
      });
    }
    function reveal(el: HTMLElement) {
      el.classList.add("in");
      countUp(el);
      if (el.classList.contains("stagger")) {
        const c = el.children;
        for (let i = 0; i < c.length; i++)
          (c[i] as HTMLElement).style.transitionDelay = i * 80 + "ms";
      }
      if (el.classList.contains("dash-tbl")) {
        el.querySelectorAll<HTMLElement>(".drow:not(.head)").forEach((r, i) => {
          r.style.transitionDelay = 140 + i * 90 + "ms";
        });
      }
    }
    let io: IntersectionObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    if (reduce || !("IntersectionObserver" in window)) {
      rvs.forEach(reveal);
    } else {
      io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.isIntersecting) {
              reveal(e.target as HTMLElement);
              io!.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
      );
      rvs.forEach((el) => io!.observe(el));
      fallbackTimer = setTimeout(() => rvs.forEach(reveal), 2600);
    }
    cleanups.push(() => {
      if (io) io.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    });

    /* scroll engine: .section-head parallax */
    type Par = { el: HTMLElement; sp: number };
    const pars: Par[] = [];
    document.querySelectorAll<HTMLElement>(".section-head").forEach((el) => {
      pars.push({ el, sp: -18 });
    });
    let vh = window.innerHeight,
      sy = 0,
      ticking = false;
    function update() {
      ticking = false;
      if (reduce) return;
      for (let i = 0; i < pars.length; i++) {
        const p = pars[i],
          r = p.el.getBoundingClientRect(),
          rel = (r.top + r.height / 2 - vh / 2) / vh;
        p.el.style.transform = "translate3d(0," + (rel * p.sp).toFixed(1) + "px,0)";
      }
    }
    function onScroll() {
      sy = window.scrollY || window.pageYOffset || 0;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    function onResize() {
      vh = window.innerHeight;
      onScroll();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    update();
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    });

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}

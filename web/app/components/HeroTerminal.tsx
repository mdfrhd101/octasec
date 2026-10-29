"use client";

import { useEffect, useRef } from "react";

/**
 * Hero live-terminal typer, ported 1:1 from build-site.js.
 * Types recon -> hunt -> exploit -> proof -> verify -> "VERIFIED FINDING",
 * then loops. Respects prefers-reduced-motion (prints all lines statically).
 */
const LINES: [string, string][] = [
  ["$ octasec engage --target app.yourco.com", "c"],
  ["[recon]   surface mapped ........ 68 endpoints, 3 subdomains", "m"],
  ["[recon]   fingerprint ........... node/express + postgres", "m"],
  ["[hunt]    auth flows ............ 4 roles diffed", "m"],
  ["[hunt]    /api/orders ........... IDOR candidate", "w"],
  ["[exploit] chain ................. IDOR -> token reuse -> takeover", "w"],
  ["[proof]   reproduction .......... built, non-destructive", "g"],
  ["[verify]  human operator ........ confirmed & signed", "g"],
  ["VERIFIED FINDING - case file ready", "ok"],
];

// Phones: the same story without dot leaders, so each line fits one row of a narrow
// screen; the terminal is a fixed 5-row window that scrolls like a real one (mobile.css).
const LINES_COMPACT: [string, string][] = [
  ["$ octasec engage -t app.yourco.com", "c"],
  ["[recon] 68 endpoints, 3 subdomains", "m"],
  ["[recon] node/express + postgres", "m"],
  ["[hunt] auth flows: 4 roles diffed", "m"],
  ["[hunt] /api/orders: IDOR candidate", "w"],
  ["[exploit] IDOR -> token -> takeover", "w"],
  ["[proof] reproduced, non-destructive", "g"],
  ["[verify] operator confirmed, signed", "g"],
  ["VERIFIED FINDING - case file ready", "ok"],
];
const pickLines = () =>
  window.matchMedia && window.matchMedia("(max-width: 600px)").matches ? LINES_COMPACT : LINES;

// className: the HUD homepage restyles the same terminal (h-term) inside its own panel
export default function HeroTerminal({ className = "card media heroTerm" }: { className?: string }) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const reduce =
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    body.innerHTML = "";
    let lines = pickLines();
    // keep the newest line in view (only matters in the fixed-height phone window)
    const follow = () => {
      body.scrollTop = body.scrollHeight;
    };

    if (reduce) {
      lines.forEach((L) => {
        const s = document.createElement("span");
        s.className = "ln " + L[1];
        s.textContent = L[0];
        body.appendChild(s);
      });
      follow();
      return;
    }

    const caret = document.createElement("span");
    caret.className = "cur";
    let li = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;

    // the typing loop pauses while the terminal is off-screen and resumes where it left off
    let onScreen = true;
    let pending: (() => void) | null = null;
    const later = (fn: () => void, ms: number) => {
      timers.push(setTimeout(() => (onScreen ? fn() : (pending = fn)), ms));
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen && pending) {
        const f = pending;
        pending = null;
        f();
      }
    });
    io.observe(body);

    function reset() {
      if (stopped) return;
      body!.innerHTML = "";
      lines = pickLines();
      li = 0;
      addLine();
    }

    function addLine() {
      if (stopped) return;
      if (li >= lines.length) {
        later(reset, 3400);
        return;
      }
      const L = lines[li];
      const span = document.createElement("span");
      span.className = "ln " + L[1];
      body!.appendChild(span);
      span.appendChild(caret);
      follow();
      const txt = L[0];
      let ci = 0;
      (function t() {
        if (stopped) return;
        ci++;
        span.textContent = txt.slice(0, ci);
        span.appendChild(caret);
        if (ci < txt.length) {
          later(t, 11 + Math.random() * 13);
        } else {
          li++;
          later(addLine, li === lines.length ? 60 : 150);
        }
      })();
    }

    addLine();

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      io.disconnect();
    };
  }, []);

  return (
    <div className={className} id="heroTerm" aria-hidden="true">
      <div className="term-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="term-body" ref={bodyRef} />
    </div>
  );
}

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

export default function HeroTerminal() {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const reduce =
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    body.innerHTML = "";

    if (reduce) {
      LINES.forEach((L) => {
        const s = document.createElement("span");
        s.className = "ln " + L[1];
        s.textContent = L[0];
        body.appendChild(s);
      });
      return;
    }

    const caret = document.createElement("span");
    caret.className = "cur";
    let li = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let stopped = false;

    function reset() {
      if (stopped) return;
      body!.innerHTML = "";
      li = 0;
      addLine();
    }

    function addLine() {
      if (stopped) return;
      if (li >= LINES.length) {
        timers.push(setTimeout(reset, 3400));
        return;
      }
      const L = LINES[li];
      const span = document.createElement("span");
      span.className = "ln " + L[1];
      body!.appendChild(span);
      span.appendChild(caret);
      const txt = L[0];
      let ci = 0;
      (function t() {
        if (stopped) return;
        ci++;
        span.textContent = txt.slice(0, ci);
        span.appendChild(caret);
        if (ci < txt.length) {
          timers.push(setTimeout(t, 11 + Math.random() * 13));
        } else {
          li++;
          timers.push(setTimeout(addLine, li === LINES.length ? 60 : 150));
        }
      })();
    }

    addLine();

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="card media heroTerm" id="heroTerm" aria-hidden="true">
      <div className="term-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="term-body" ref={bodyRef} />
    </div>
  );
}

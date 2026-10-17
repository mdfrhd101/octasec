"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

// same-origin by default: nginx (prod) and deploy/local-serve.mjs (local) proxy /api to the API
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export type Plan = "assessment" | "continuous" | "enterprise" | "";
export const PLANS: { key: Exclude<Plan, "">; name: string }[] = [
  { key: "assessment", name: "One-off assessment" },
  { key: "continuous", name: "Continuous testing" },
  { key: "enterprise", name: "Enterprise & MSSP" },
];

const Ctx = createContext<(plan?: Plan) => void>(() => {});

/** Wrap a page with this; any <QuoteButton> inside opens the quote popup. */
export function QuoteProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  return (
    <Ctx.Provider value={(p = "") => setPlan(p)}>
      {children}
      {plan !== null && <QuoteModal plan={plan} onClose={() => setPlan(null)} />}
    </Ctx.Provider>
  );
}

export function QuoteButton({ plan = "", className = "btn btn-white", children }: { plan?: Plan; className?: string; children: ReactNode }) {
  const open = useContext(Ctx);
  return (
    <button type="button" className={className} onClick={() => open(plan)}>
      {children}
    </button>
  );
}

/** Quote request → POST /api/contact (source "pricing") → Super Admin › Leads. */
function QuoteModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // no background scroll while the dialog is open
    window.__lenis?.stop(); // smooth scroll (SmoothScroll.tsx) must pause too
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; window.__lenis?.start(); };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), source: "pricing" };
    setState("sending");
    setErr("");
    try {
      const res = await fetch(API + "/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not send. Please try again.");
      }
      setState("sent");
    } catch (e2) {
      setState("error");
      setErr(e2 instanceof Error ? e2.message : "Could not send.");
    }
  }

  return (
    // a click on the backdrop does NOT close the dialog — typed text is never lost by accident
    <div className="qmodal" data-lenis-prevent role="dialog" aria-modal="true" aria-labelledby="qmodal-title">
      <div className="qcard card">
        <button type="button" className="qx" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        {state === "sent" ? (
          <div style={{ textAlign: "center", padding: "18px 4px" }}>
            <h3 id="qmodal-title" style={{ color: "var(--gold)", marginBottom: 8 }}>Request received</h3>
            <p className="qsub">Thanks — our team will send a scoped quote within one business day.</p>
            <button type="button" className="btn btn-white" style={{ marginTop: 18 }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <form className="cform qform" onSubmit={onSubmit}>
            <h3 id="qmodal-title">Get a quote</h3>
            <p className="qsub">Tell us what you need tested. A scoped, fixed quote follows within one business day — no obligation.</p>
            <div className="qgrid">
              <label>Name<input ref={first} type="text" name="name" required maxLength={120} /></label>
              <label>Work email<input type="email" name="email" required maxLength={160} /></label>
              <label>Company<input type="text" name="company" maxLength={160} /></label>
              <label>Plan
                <select name="plan" defaultValue={plan}>
                  <option value="">Not sure yet</option>
                  {PLANS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
                </select>
              </label>
              <label>What to test
                <select name="target" defaultValue="Web app">
                  <option>Web app</option><option>API</option><option>Cloud</option>
                  <option>Network</option><option>AI feature</option><option>Not sure</option>
                </select>
              </label>
              <label>Approximate scope
                <select name="scope" defaultValue="">
                  <option value="">Choose…</option>
                  <option value="1">1 app / API</option><option value="2-5">2–5 apps</option>
                  <option value="6-20">6–20 apps</option><option value="20+">20+ apps</option>
                  <option value="Not sure">Not sure</option>
                </select>
              </label>
            </div>
            <label>Anything else (deadline, compliance, environment)<textarea name="message" rows={3} maxLength={4000} /></label>
            {/* honeypot — hidden from humans, bots fill it and get silently dropped */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            {state === "error" && <p className="qerr">{err}</p>}
            <div className="qrow">
              <button type="button" className="link" onClick={onClose}>Cancel</button>
              <button className="btn btn-white" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request quote"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

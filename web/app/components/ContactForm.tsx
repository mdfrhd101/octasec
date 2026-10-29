"use client";

import { useEffect, useRef, useState } from "react";

// same-origin by default: nginx (prod) and deploy/local-serve.mjs (local) both proxy /api to the API
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Contact form — posts to the OctaSec API; submissions land in the Super Admin inbox.
 * HUD layout (hud-pages-b.css, .pg-contact): the form in a chamfered panel, the direct lines
 * in a second panel beside it. Native validation stays in charge; a field the user has left
 * invalid turns red with a short hint (:user-invalid, CSS only). The two panels are
 * [data-rv] (HudMotion reveals them), so their className never changes: the form state
 * lives in data-state instead.
 */
export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const doneRef = useRef<HTMLDivElement | null>(null);

  // the form is replaced by the confirmation: move focus there so it is read out
  useEffect(() => {
    if (state === "sent") doneRef.current?.focus();
  }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    setErr("");
    try {
      const res = await fetch(API + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not send. Please try again.");
      }
      setState("sent");
      form.reset();
    } catch (e2) {
      setState("error");
      // fetch() throws a TypeError ("Failed to fetch") when the network or the API is down
      setErr(e2 instanceof TypeError ? "Could not reach our server. Please try again, or email support@octasec.ai." : e2 instanceof Error ? e2.message : "Could not send.");
    }
  }

  return (
    <div className="ct-grid">
      <div className="h-panel ct-panel" data-rv data-state={state}>
        <div className="h-ph">
          <span className="h-lbl">Scoping call</span>
          <span className="h-tag ok"><i className="h-dot" />Free</span>
        </div>
        {state === "sent" ? (
          <div className="ct-done" ref={doneRef} tabIndex={-1}>
            <span className="pgb-ic" aria-hidden="true">&#10003;</span>
            <h3>Request received</h3>
            <p>Thanks &mdash; our team has your details and will reply within one business day.</p>
          </div>
        ) : (
          <form className="ct-form" onSubmit={onSubmit}>
            <label className="ct-f">
              <span className="ct-l">Name<em aria-hidden="true">Required</em></span>
              <input type="text" name="name" required maxLength={120} autoComplete="name" />
              <span className="ct-err" aria-hidden="true">Please enter your name.</span>
            </label>
            <label className="ct-f">
              <span className="ct-l">Work email<em aria-hidden="true">Required</em></span>
              <input type="email" name="email" required maxLength={160} autoComplete="email" />
              <span className="ct-err" aria-hidden="true">Please enter a valid email address.</span>
            </label>
            <label className="ct-f">
              <span className="ct-l">Company</span>
              <input type="text" name="company" maxLength={160} autoComplete="organization" />
            </label>
            {/* honeypot — hidden from humans, bots fill it and get silently dropped */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
            <label className="ct-f">
              <span className="ct-l">What would you like tested?</span>
              <span className="ct-sel">
                <select name="target" defaultValue="Web app">
                  <option>Web app</option>
                  <option>API</option>
                  <option>Cloud</option>
                  <option>Network</option>
                  <option>AI feature</option>
                  <option>Not sure</option>
                </select>
              </span>
            </label>
            <label className="ct-f ct-wide">
              <span className="ct-l">Message</span>
              <textarea name="message" rows={4} maxLength={4000} />
            </label>
            <div className="ct-act">
              <button className="h-btn h-btn-red ct-send" type="submit" disabled={state === "sending"} aria-busy={state === "sending"}>
                {state === "sending" ? "Sending…" : "Request a scoping call"}
              </button>
            </div>
            {state === "error" && (
              <p role="alert" className="ct-alert">
                <span className="pgb-ic crit" aria-hidden="true">!</span>
                <span>{err}</span>
              </p>
            )}
          </form>
        )}
      </div>
      <aside className="h-panel ct-info" data-rv>
        <p className="ct-lead">
          Replies within one business day. Scoping calls are free &mdash; and honest.
        </p>
        <ul className="ct-lines">
          <li><span className="h-lbl">Email</span><a href="mailto:support@octasec.ai">support@octasec.ai</a></li>
          <li><span className="h-lbl">Call</span><a href="tel:+8801326875385">+880 1326-875385</a></li>
          <li><span className="h-lbl">Dhaka</span><span>10am&ndash;8pm</span></li>
        </ul>
      </aside>
    </div>
  );
}

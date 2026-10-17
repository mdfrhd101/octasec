"use client";

import { useState } from "react";

// same-origin by default: nginx (prod) and deploy/local-serve.mjs (local) both proxy /api to the API
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Contact form — posts to the OctaSec API; submissions land in the Super Admin inbox. */
export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

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
      setErr(e2 instanceof Error ? e2.message : "Could not send.");
    }
  }

  if (state === "sent") {
    return (
      <>
        <div className="card" style={{ padding: 28, textAlign: "center", maxWidth: 540, margin: "0 auto" }}>
          <h3 style={{ color: "var(--gold)", marginBottom: 8 }}>Request received</h3>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            Thanks &mdash; our team has your details and will reply within one business day.
          </p>
        </div>
        <p className="cnote">
          Replies within one business day. Scoping calls are free &mdash; and honest.
          <br />
          Email <a href="mailto:support@octasec.com" style={{ color: "var(--gold)" }}>support@octasec.com</a> &middot; Call <a href="tel:+8801326875385" style={{ color: "var(--gold)" }}>+880 1326-875385</a> &middot; Dhaka &middot; 10am&ndash;8pm
        </p>
      </>
    );
  }

  return (
    <>
      <form className="cform" onSubmit={onSubmit}>
        <label>Name<input type="text" name="name" required /></label>
        <label>Work email<input type="email" name="email" required /></label>
        <label>Company<input type="text" name="company" /></label>
        {/* honeypot — hidden from humans, bots fill it and get silently dropped */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <label>
          What would you like tested?
          <select name="target" defaultValue="Web app">
            <option>Web app</option>
            <option>API</option>
            <option>Cloud</option>
            <option>Network</option>
            <option>AI feature</option>
            <option>Not sure</option>
          </select>
        </label>
        <label>Message<textarea name="message" rows={4} /></label>
        <button className="btn btn-white" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request a scoping call"}
        </button>
        {state === "error" && (
          <p style={{ color: "var(--red, #ff5d6c)", fontFamily: "var(--m)", fontSize: 13 }}>{err}</p>
        )}
      </form>
      <p className="cnote">
        Replies within one business day. Scoping calls are free &mdash; and honest.
        <br />
        Email <a href="mailto:support@octasec.com" style={{ color: "var(--gold)" }}>support@octasec.com</a> &middot; Call <a href="tel:+8801326875385" style={{ color: "var(--gold)" }}>+880 1326-875385</a> &middot; Dhaka &middot; 10am&ndash;8pm
      </p>
    </>
  );
}

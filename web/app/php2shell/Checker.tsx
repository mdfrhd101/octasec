"use client";

import { useState } from "react";

// same-origin by default: nginx (prod) proxies /api to the API; NEXT_PUBLIC_API_URL points elsewhere in dev
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

type CheckResult = {
  target: string;
  php: {
    detected: boolean;
    version: string | null;
    versionSource: string | null;
    versionVerdict: { vulnerable: boolean | null; note: string };
    sapi: { handler: string; note: string };
    cookies: { nativeSession: boolean; frameworkSession: boolean };
  };
  oracle: { verdict: string; evidence: string };
  overall: { verdict: string; summary: string };
  fixedReleases: string;
};

const VERDICT_LABEL: Record<string, string> = {
  "exposed": "EXPOSED",
  "likely-exposed": "LIKELY EXPOSED",
  "patched": "PATCHED",
  "likely-patched": "LIKELY PATCHED",
  "not-php": "NOT PHP",
  "unknown": "INCONCLUSIVE",
};

// HUD console (hud-pages-c.css). The request and its handling are unchanged; only the
// markup is: a status tag in the header, a prompt-style field, a scan line while busy,
// the verdict as a stamped readout (red exposed, green patched, neutral inconclusive).
export default function Checker() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<CheckResult | null>(null);
  const [err, setErr] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch(API + "/php2shell/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      // a proxy error page (502/504 HTML) or an empty body isn't JSON: never show the raw parser error
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.overall) {
        setErr(j?.error || "The checker is unavailable right now. Please try again in a few minutes.");
        return;
      }
      setRes(j);
    } catch {
      setErr("Couldn't reach the checker. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const verdict = res?.overall.verdict || "";
  const tone = /exposed/.test(verdict) ? "crit" : /patched|not-php/.test(verdict) ? "ok" : "";
  const state = busy ? "busy" : err ? "err" : res ? "done" : "idle";
  const status = { busy: "Checking", err: "Error", done: "Complete", idle: "Ready" }[state];

  return (
    <div className="h-panel p2-con" data-state={state}>
      <div className="h-ph">
        <h3>Free exposure check</h3>
        <span className={"h-tag p2-state" + (state === "err" ? " crit" : state === "idle" ? "" : " ok")} aria-hidden="true">
          <i className="h-dot" />{status}
        </span>
      </div>
      <p className="p2-con-p">
        Two benign requests, non-destructive by design — the same safe oracle from
        our research. Only check sites you own or are authorized to test.
      </p>
      <form onSubmit={run} className="p2-form">
        <div className="h-edge p2-field">
          <span className="p2-prompt" aria-hidden="true">&gt;_</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-site.com"
            aria-label="Website URL"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoCapitalize="none"
            maxLength={300}
            required
          />
        </div>
        <button className="h-btn h-btn-red p2-go" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check my site"}
        </button>
      </form>
      {busy ? <div className="p2-scan" aria-hidden="true"><i /></div> : null}
      {err ? <p role="alert" className="h-edge p2-err">{err}</p> : null}
      {res ? (
        <div className={"p2-res" + (tone ? " " + tone : "")}>
          <div className={`h-edge p2-verdict v-${res.overall.verdict}`}>
            <i className="h-dot" aria-hidden="true" />
            {VERDICT_LABEL[res.overall.verdict] || res.overall.verdict}
          </div>
          <p className="p2-sum">{res.overall.summary}</p>
          <ul className="p2-read">
            <li><span>PHP</span><b>{res.php.version ? `${res.php.version} (${res.php.versionSource})` : "version not disclosed"}</b></li>
            <li><span>Server topology</span><b>{res.php.sapi.handler}</b></li>
            <li><span>Native PHP session</span><b>{res.php.cookies.nativeSession ? "observed" : "not observed"}</b></li>
            <li><span>Patch oracle</span><b>{res.oracle.verdict} — {res.oracle.evidence}</b></li>
          </ul>
          <p className="p2-fixed">
            Fixed releases: {res.fixedReleases}
          </p>
          {(res.overall.verdict === "exposed" || res.overall.verdict === "likely-exposed" || res.overall.verdict === "unknown") && (
            <a className="h-btn h-btn-red p2-go" href="/contact">
              Get it hardened — $10/site
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

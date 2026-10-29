"use client";

import { useState } from "react";
import HudCursor from "../components/hud/HudCursor";

// same-origin by default: nginx (prod) proxies /api to the API; NEXT_PUBLIC_API_URL points elsewhere in dev
const API = process.env.NEXT_PUBLIC_API_URL || "/api";

type Finding = {
  category: string;
  status: "critical" | "high" | "warning" | "good" | "info";
  title: string;
  evidence: string;
  remediation: string;
};
type CheckResult = {
  reportId: string;
  target: string;
  checkedAtDhaka: string;
  requests: number;
  cached: boolean;
  counts: Record<string, number>;
  overall: { verdict: string; label: string; summary: string };
  findings: Finding[];
  limitations: string;
};

const STATUS_LABEL = { critical: "CRITICAL", high: "HIGH", warning: "WARNING", good: "GOOD", info: "INFO" };

// HUD scan console (hud-pages-c.css). The request and its handling are unchanged; only the
// markup is: a console panel with a live status tag, a prompt-style field, a scan line while
// busy, then the report as panels that stamp in (summary, severity counts, findings, next step).
export default function WebsiteChecker() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(API + "/website-check/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      // a proxy error page (502/504 HTML) or an empty body isn't JSON: never show the raw parser error
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.overall) {
        setError(data?.error || "The checker is unavailable right now. Please try again in a few minutes.");
        return;
      }
      setResult(data);
    } catch {
      setError("Couldn't reach the checker. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  // the state goes on data-state, not the class: React rewrites className on every change and
  // would wipe the .is-in that HudMotion's reveal added (the console then turned invisible)
  const state = busy ? "busy" : error ? "err" : result ? "done" : "idle";
  const status = { busy: "Scanning", err: "Error", done: "Complete", idle: "Ready" }[state];

  return (
    <div className="wc-shell">
      <div className="h-head wc-intro" data-rv>
        <span className="h-tag ok"><i className="h-dot" />FREE · PDF INCLUDED</span>
        <h2 className="h-h2 h-split">Check your external security baseline.</h2>
        <p className="h-sub">PHP2Shell, Heartbleed, legacy TLS, safe CORS checks, certificate expiry, headers, cookies, CMS fingerprints, DNS/email protection and exposed Git/environment files.</p>
      </div>
      <HudCursor>
        <div className="h-panel wc-con" data-state={state} data-rv>
          <div className="h-ph">
            <span className="h-lbl">Scan console</span>
            <span className={"h-tag wc-state" + (state === "err" ? " crit" : state === "idle" ? "" : " ok")} aria-hidden="true">
              <i className="h-dot" />{status}
            </span>
          </div>
          <form className="wc-form" onSubmit={run}>
            <label htmlFor="website-check-url">Website URL</label>
            <div className="wc-row">
              <div className="h-edge wc-field">
                <span className="wc-prompt" aria-hidden="true">&gt;_</span>
                <input id="website-check-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com" inputMode="url" autoComplete="url" spellCheck={false} autoCapitalize="none" required maxLength={300} disabled={busy} />
              </div>
              <button className="h-btn h-btn-red" type="submit" disabled={busy}>{busy ? "Checking…" : "Check my website"}</button>
            </div>
            <p className="wc-terms">Only check sites you own or are authorized to test. Target, IP and sanitized results are logged for abuse prevention. See <a href="/legal#privacy">privacy</a>.</p>
          </form>
          {busy && (
            <div className="h-edge wc-progress" role="status">
              <span className="wc-scan" aria-hidden="true"><i /></span>
              <span className="wc-pulse" aria-hidden="true" />Running bounded web and TLS vulnerability checks. This can take up to 90 seconds.
            </div>
          )}
          {error && <div className="h-edge wc-error" role="alert">{error}</div>}
        </div>
      </HudCursor>
      {result && (
        <div className="wc-results">
          <div className={`h-panel wc-summary v-${result.overall.verdict}`}>
            <div>
              <span className="wc-summary-label"><i className="h-dot" aria-hidden="true" />{result.overall.label}</span>
              <h3>{result.target}</h3>
              <p>{result.overall.summary}</p>
              <small>{result.checkedAtDhaka} · Report {result.reportId.slice(0, 12)} · {result.cached ? "Recent verified result" : "Fresh check"}</small>
            </div>
            <a className="h-btn h-btn-line wc-pdf" href={`${API}/website-check/${result.reportId}/report.pdf`} download>Download PDF report</a>
          </div>
          <div className="wc-counts" aria-label="Finding counts">
            {(["critical", "high", "warning", "good", "info"] as const).map((key, i) => (
              <div className={`h-edge wc-count s-${key}`} key={key} style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                <strong>{result.counts[key] || 0}</strong>
                <span>{STATUS_LABEL[key]}</span>
              </div>
            ))}
          </div>
          <div className="wc-findings">
            {result.findings.map((f, i) => (
              <article className={`h-edge wc-finding s-${f.status}`} key={`${f.category}-${f.title}-${i}`} style={{ animationDelay: `${0.3 + Math.min(i, 10) * 0.06}s` }}>
                <div className="wc-finding-top"><span className="wc-category">{f.category}</span><span className={`wc-status s-${f.status}`}>{STATUS_LABEL[f.status]}</span></div>
                <h4>{f.title}</h4>
                <p>{f.evidence}</p>
                <div className="wc-action"><strong>What to do</strong>{f.remediation}</div>
              </article>
            ))}
          </div>
          <div className="h-panel wc-next">
            <div><h3>A clean baseline is not a pentest.</h3><p>{result.limitations}</p></div>
            <a className="h-btn h-btn-red" href="/contact">Fix my risks with OctaSec</a>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

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
      const response = await fetch("/api/website-check/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The check failed");
      setResult(data);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "The check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wsc-shell">
      <div className="wsc-intro">
        <span className="tag">FREE · PDF INCLUDED</span>
        <h2>Check your external security baseline.</h2>
        <p>PHP2Shell, Heartbleed, legacy TLS, safe CORS checks, certificate expiry, headers, cookies, CMS fingerprints, DNS/email protection and exposed Git/environment files.</p>
      </div>
      <form className="wsc-form" onSubmit={run}>
        <label htmlFor="website-check-url">Website URL</label>
        <div className="wsc-inputrow">
          <input id="website-check-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com" required maxLength={300} disabled={busy} />
          <button className="btn btn-white" type="submit" disabled={busy}>{busy ? "Checking…" : "Check my website"}</button>
        </div>
        <p className="wsc-terms">Only check sites you own or are authorized to test. Target, IP and sanitized results are logged for abuse prevention. See <a href="/legal#privacy">privacy</a>.</p>
      </form>
      {busy && <div className="wsc-progress" role="status"><span className="wsc-pulse" />Running bounded web and TLS vulnerability checks. This can take up to 90 seconds.</div>}
      {error && <div className="wsc-error" role="alert">{error}</div>}
      {result && (
        <div className="wsc-results">
          <div className={`wsc-summary v-${result.overall.verdict}`}>
            <div>
              <span className="wsc-summary-label">{result.overall.label}</span>
              <h3>{result.target}</h3>
              <p>{result.overall.summary}</p>
              <small>{result.checkedAtDhaka} · Report {result.reportId.slice(0, 12)} · {result.cached ? "Recent verified result" : "Fresh check"}</small>
            </div>
            <a className="btn btn-white" href={`/api/website-check/${result.reportId}/report.pdf`} download>Download PDF report</a>
          </div>
          <div className="wsc-counts" aria-label="Finding counts">
            {(["critical", "high", "warning", "good", "info"] as const).map((key) => <div className={`wsc-count s-${key}`} key={key}><strong>{result.counts[key] || 0}</strong><span>{STATUS_LABEL[key]}</span></div>)}
          </div>
          <div className="wsc-findings">
            {result.findings.map((f, i) => (
              <article className={`wsc-finding s-${f.status}`} key={`${f.category}-${f.title}-${i}`}>
                <div className="wsc-finding-top"><span className="wsc-category">{f.category}</span><span className={`wsc-status s-${f.status}`}>{STATUS_LABEL[f.status]}</span></div>
                <h4>{f.title}</h4>
                <p>{f.evidence}</p>
                <div className="wsc-action"><strong>What to do</strong>{f.remediation}</div>
              </article>
            ))}
          </div>
          <div className="wsc-next">
            <div><h3>A clean baseline is not a pentest.</h3><p>{result.limitations}</p></div>
            <a className="btn btn-white" href="/contact">Fix my risks with OctaSec</a>
          </div>
        </div>
      )}
    </div>
  );
}

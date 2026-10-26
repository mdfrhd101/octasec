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

  return (
    <div className="card" style={{ maxWidth: 720, margin: "0 auto", textAlign: "left" }}>
      <h3>Free exposure check</h3>
      <p style={{ marginTop: 10 }}>
        Two benign requests, non-destructive by design — the same safe oracle from
        our research. Only check sites you own or are authorized to test.
      </p>
      <form onSubmit={run} style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
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
          style={{ flex: 1, minWidth: 220 }}
        />
        <button className="btn btn-white" type="submit" disabled={busy}>
          {busy ? "Checking…" : "Check my site"}
        </button>
      </form>
      {err ? <p role="alert" style={{ marginTop: 14, color: "var(--crit)" }}>{err}</p> : null}
      {res ? (
        <div style={{ marginTop: 22 }}>
          <div className={`p2s-verdict v-${res.overall.verdict}`}>
            {VERDICT_LABEL[res.overall.verdict] || res.overall.verdict}
          </div>
          <p style={{ marginTop: 10 }}>{res.overall.summary}</p>
          <ul style={{ marginTop: 14 }}>
            <li>PHP: {res.php.version ? `${res.php.version} (${res.php.versionSource})` : "version not disclosed"}</li>
            <li>Server topology: {res.php.sapi.handler}</li>
            <li>Native PHP session: {res.php.cookies.nativeSession ? "observed" : "not observed"}</li>
            <li>Patch oracle: {res.oracle.verdict} — {res.oracle.evidence}</li>
          </ul>
          <p style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
            Fixed releases: {res.fixedReleases}
          </p>
          {(res.overall.verdict === "exposed" || res.overall.verdict === "likely-exposed" || res.overall.verdict === "unknown") && (
            <a className="btn btn-white" href="/contact" style={{ marginTop: 16 }}>
              Get it hardened — $10/site
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

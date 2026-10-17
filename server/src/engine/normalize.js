// Everything that comes back from a scan engine is UNTRUSTED input.
// These validators are the only way engine data reaches the database.
// Contract: docs/ENGINE_INTEGRATION.md §4.
import { isHostname } from "../utils/http.js";

export class EngineDataError extends Error { constructor(m) { super(m); this.status = 400; } }

export const SEVERITIES = ["low", "medium", "high", "critical"];
export const SCAN_STATES = ["queued", "running", "completed", "failed"];
const MAX_FINDINGS = 500;
const MAX_ASSETS = 500;

const text = (v, label, max, required = false) => {
  if (v === undefined || v === null) v = "";
  if (typeof v !== "string") throw new EngineDataError(`${label} must be a string`);
  const s = v.trim();
  if (required && !s) throw new EngineDataError(`${label} is required`);
  return s.slice(0, max);
};

// host must be the engagement's domain or a subdomain of it (never third-party / internal)
export function inScope(host, domainName) {
  return isHostname(host) && (host === domainName || host.endsWith("." + domainName));
}

/** Validate a list of findings for one engagement. Throws EngineDataError on any bad item. */
export function normalizeFindings(list, domainName) {
  if (!Array.isArray(list)) throw new EngineDataError("findings must be an array");
  if (list.length > MAX_FINDINGS) throw new EngineDataError(`at most ${MAX_FINDINGS} findings per scan`);
  return list.map((f, i) => {
    if (!f || typeof f !== "object" || Array.isArray(f)) throw new EngineDataError(`finding[${i}] must be an object`);
    const severity = text(f.severity, `finding[${i}].severity`, 10, true).toLowerCase();
    if (!SEVERITIES.includes(severity)) throw new EngineDataError(`finding[${i}].severity must be one of ${SEVERITIES.join("/")}`);
    const cvss = f.cvss === undefined || f.cvss === null ? 0 : f.cvss;
    if (typeof cvss !== "number" || !Number.isFinite(cvss) || cvss < 0 || cvss > 10) throw new EngineDataError(`finding[${i}].cvss must be a number 0–10`);
    const host = text(f.host, `finding[${i}].host`, 253, true).toLowerCase();
    if (!inScope(host, domainName)) throw new EngineDataError(`finding[${i}].host "${host}" is outside the engagement scope (${domainName})`);
    return {
      title: text(f.title, `finding[${i}].title`, 200, true),
      severity,
      cvss: Math.round(cvss * 10) / 10,
      owasp: text(f.owasp, `finding[${i}].owasp`, 80),
      cwe: text(f.cwe, `finding[${i}].cwe`, 20),
      detail: text(f.detail, `finding[${i}].detail`, 5000),
      fix: text(f.fix, `finding[${i}].fix`, 3000),
      evidence: text(f.evidence, `finding[${i}].evidence`, 10000),
      host,
      verified: false, // only a human operator's signature verifies a finding
    };
  });
}

/** Validate discovered assets for a domain. Out-of-scope hosts are dropped (discovery is noisy by nature). */
export function normalizeAssets(list, domainName) {
  if (!Array.isArray(list)) throw new EngineDataError("assets must be an array");
  const seen = new Set();
  const out = [];
  for (const a of list.slice(0, MAX_ASSETS)) {
    if (!a || typeof a !== "object") continue;
    const host = typeof a.host === "string" ? a.host.trim().toLowerCase() : "";
    if (!inScope(host, domainName) || seen.has(host)) continue;
    seen.add(host);
    const tech = Array.isArray(a.tech) ? a.tech.filter((t) => typeof t === "string").map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 10) : [];
    out.push({ host, tech });
  }
  return out;
}

export function normalizeState(v) {
  const s = text(v, "state", 20, true).toLowerCase();
  if (!SCAN_STATES.includes(s)) throw new EngineDataError(`state must be one of ${SCAN_STATES.join("/")}`);
  return s;
}

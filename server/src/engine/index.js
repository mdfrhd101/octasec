// Scan-engine gateway. The rest of the API only talks to the engine through
// this module. Choose the driver with ENGINE_DRIVER=mock (default) | http.
// Integration guide for the engine developer: docs/ENGINE_INTEGRATION.md
import crypto from "node:crypto";
import * as mock from "./mock.js";
import * as httpDriver from "./http.js";
import { normalizeAssets, normalizeFindings, normalizeState } from "./normalize.js";
import { appUrl } from "../utils/mailer.js";
import { targetProblem } from "../utils/verifyDomain.js";

const DRIVERS = { mock, http: httpDriver };

export function driver() {
  const name = (process.env.ENGINE_DRIVER || "mock").trim();
  const d = DRIVERS[name];
  if (!d) throw new Error(`Unknown ENGINE_DRIVER "${name}" (use mock or http)`);
  return d;
}
export const engineName = () => driver().name;

/** Discover hosts for a verified domain → [{host, tech[]}] (in-scope only). */
export async function discover(domainName) {
  return normalizeAssets(await driver().discoverAssets(domainName), domainName);
}

/** The job description sent to the engine for one engagement. */
export function jobFor(e) {
  return {
    engagementId: String(e._id),
    domain: e.domainName,
    targets: e.targets,
    roe: { intensity: e.roe?.intensity, window: e.roe?.window || "", excludes: e.roe?.excludes || "" },
    scoping: {
      testType: e.scoping?.testType, environment: e.scoping?.environment, targetTypes: e.scoping?.targetTypes || [],
      userRoles: e.scoping?.userRoles || 0, apiDocsUrl: e.scoping?.apiDocsUrl || "", wafInPlace: !!e.scoping?.wafInPlace,
      maxRps: e.scoping?.maxRps || 0,
    },
    callbackUrl: `${appUrl()}/api/engine/callback`,
  };
}

/** Start a scan → { jobId, state, findings? } with findings already validated. */
export async function start(e) {
  const job = jobFor(e);
  const r = await driver().startScan({ ...job, domainName: e.domainName });
  return {
    jobId: r.jobId,
    state: normalizeState(r.state || "queued"),
    findings: r.findings ? normalizeFindings(r.findings, e.domainName) : null,
  };
}

/** Poll a running scan → { state, progress, findings? }. */
export async function poll(e) {
  const r = await driver().getScan(e.engine.jobId);
  return {
    state: normalizeState(r.state),
    progress: Number.isFinite(r.progress) ? Math.max(0, Math.min(100, Math.round(r.progress))) : null,
    error: typeof r.error === "string" ? r.error.slice(0, 500) : "",
    findings: r.findings ? normalizeFindings(r.findings, e.domainName) : null,
  };
}

/** Refuse to send the engine anything that resolves to a private / metadata / loopback address. */
export async function unsafeTargets(e) {
  const hosts = [...new Set(e.targets && e.targets.length ? e.targets : [e.domainName])];
  for (let i = 0; i < hosts.length; i += 25) {
    const problems = await Promise.all(hosts.slice(i, i + 25).map((h) => targetProblem(h)));
    const bad = problems.find(Boolean);
    if (bad) return "Unsafe scan target: " + bad + " — remove it from the assets or reject the engagement";
  }
  return "";
}

// scan states only move forward: queued → running → completed | failed
const RANK = { "": 0, queued: 1, running: 2, completed: 3, failed: 3 };
export const isForward = (from, to) => (RANK[to] ?? -1) >= (RANK[from || ""] ?? 0);

/** Apply an engine result (start / poll / callback) to an engagement document. */
export function applyResult(e, r) {
  if (!isForward(e.engine.state, r.state)) return false; // stale / replayed update — ignore
  e.engine.state = r.state;
  if (r.progress !== undefined && r.progress !== null) e.engine.progress = r.progress;
  if (r.error) e.engine.error = r.error;
  if (r.findings) e.findings = r.findings;
  e.engine.lastEventAt = new Date();
  if (r.state === "completed" || r.state === "failed") e.engine.completedAt = new Date();
  return true;
}

/* ---------- inbound callback signature (engine → OctaSec) ---------- */
export const CALLBACK_MAX_SKEW_S = 300;

/** Verify X-OctaSec-Timestamp + X-OctaSec-Signature over the RAW body. */
export function verifySignature(rawBody, tsHeader, sigHeader, secret = process.env.ENGINE_WEBHOOK_SECRET) {
  if (!secret || !tsHeader || !sigHeader) return false;
  if (!/^\d{10}$/.test(tsHeader)) return false;
  if (Math.abs(Date.now() / 1000 - Number(tsHeader)) > CALLBACK_MAX_SKEW_S) return false;
  const m = /^sha256=([a-f0-9]{64})$/.exec(sigHeader);
  if (!m) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${tsHeader}.`).update(rawBody).digest();
  const given = Buffer.from(m[1], "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

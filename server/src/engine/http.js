// HTTP engine driver — talks to the real scanning backend.
// Contract (what the engine must implement): docs/ENGINE_INTEGRATION.md §3.
//   ENGINE_URL        base URL, e.g. https://engine.internal.octasec.ai
//   ENGINE_API_KEY    bearer token OctaSec sends to the engine
//   ENGINE_ALLOW_HTTP "true" only when the engine sits on a private network without TLS
import http from "node:http";
import https from "node:https";

const TIMEOUT_MS = 15000;      // socket idle
const DEADLINE_MS = 30000;     // whole request
const MAX_BYTES = 2 * 1024 * 1024;

export class EngineUnavailable extends Error { constructor(m) { super(m); this.status = 502; } }

export const name = "http";

function base() {
  const raw = (process.env.ENGINE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) throw new EngineUnavailable("ENGINE_URL is not configured");
  const u = new URL(raw);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && process.env.ENGINE_ALLOW_HTTP === "true")) {
    throw new EngineUnavailable("ENGINE_URL must be https:// (set ENGINE_ALLOW_HTTP=true only for a private-network engine)");
  }
  return raw;
}

// one JSON request; no redirects, hard timeout, size cap, TLS verified
function call(method, path, body) {
  const url = new URL(base() + path);
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolveP, rejectP) => {
    let settled = false;
    const finish = (fn, v) => { if (settled) return; settled = true; clearTimeout(deadline); fn(v); };
    const resolve = (v) => finish(resolveP, v);
    const reject = (e) => finish(rejectP, e);
    const deadline = setTimeout(() => { req.destroy(); reject(new EngineUnavailable("engine timed out")); }, DEADLINE_MS);
    const req = lib.request(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.ENGINE_API_KEY || ""}`,
        ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
      },
      timeout: TIMEOUT_MS,
      rejectUnauthorized: true,
    }, (res) => {
      let size = 0;
      const chunks = [];
      res.on("data", (c) => {
        size += c.length;
        if (size > MAX_BYTES) { req.destroy(); reject(new EngineUnavailable("engine response too large")); return; }
        chunks.push(c);
      });
      res.on("aborted", () => reject(new EngineUnavailable("engine connection dropped")));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new EngineUnavailable(`engine replied HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
        catch { reject(new EngineUnavailable("engine replied with invalid JSON")); }
      });
    });
    req.on("timeout", () => req.destroy(new EngineUnavailable("engine timed out")));
    req.on("error", (e) => reject(e instanceof EngineUnavailable ? e : new EngineUnavailable("engine unreachable: " + e.message)));
    if (payload) req.write(payload);
    req.end();
  });
}

export async function discoverAssets(domainName) {
  const r = await call("POST", "/v1/discover", { domain: domainName });
  return r.assets;
}

export async function startScan(job) {
  const r = await call("POST", "/v1/scans", job);
  if (typeof r.jobId !== "string" || !r.jobId || r.jobId.length > 120) throw new EngineUnavailable("engine returned no jobId");
  return { jobId: r.jobId, state: r.state || "queued", findings: r.findings };
}

export async function getScan(jobId) {
  return call("GET", `/v1/scans/${encodeURIComponent(jobId)}`);
}

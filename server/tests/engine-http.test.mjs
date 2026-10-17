// HTTP engine driver against a fake engine (no real scanner needed).
// Proves the contract in docs/ENGINE_INTEGRATION.md §3 and that bad engine
// output is rejected before it can reach the database.
import http from "node:http";
import { chk, done } from "./lib.mjs";

let last = null; // last request the fake engine saw
let mode = "ok";
const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    last = { method: req.method, url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null };
    const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(typeof obj === "string" ? obj : JSON.stringify(obj)); };
    if (mode === "500") return send(500, { error: "boom" });
    if (mode === "badjson") return send(200, "{not json");
    if (mode === "redirect") { res.writeHead(302, { Location: "http://169.254.169.254/" }); return res.end(); }
    if (mode === "huge") return send(200, { assets: [], pad: "x".repeat(3 * 1024 * 1024) });
    if (req.url === "/v1/discover") return send(200, { assets: [{ host: "www.acme.io", tech: ["nginx"] }, { host: "evil.com", tech: [] }, { host: "10.0.0.5" }, { host: "api.acme.io", tech: ["x".repeat(99)] }] });
    if (req.url === "/v1/scans" && req.method === "POST") return send(202, { jobId: "job-123", state: "queued" });
    if (req.url.startsWith("/v1/scans/")) {
      if (mode === "badfinding") return send(200, { state: "completed", findings: [{ title: "x", severity: "critical", cvss: 9, host: "evil.com" }] });
      return send(200, { state: "completed", progress: 100, findings: [{ title: "Open redirect", severity: "medium", cvss: 5.4, host: "www.acme.io", cwe: "CWE-601" }] });
    }
    send(404, { error: "nope" });
  });
});
await new Promise((r) => fake.listen(0, "127.0.0.1", r));
const port = fake.address().port;

process.env.ENGINE_DRIVER = "http";
process.env.ENGINE_URL = `http://127.0.0.1:${port}`;
process.env.ENGINE_API_KEY = "test-engine-key";
process.env.ENGINE_ALLOW_HTTP = "true";
const engine = await import("../src/engine/index.js");

const E = { _id: "6650000000000000000000aa", domainName: "acme.io", targets: ["www.acme.io"], roe: { intensity: "safe" }, scoping: { testType: "grey", environment: "staging", targetTypes: ["web_app"] }, engine: { jobId: "job-123" } };
const fails = async (fn, status) => { try { await fn(); return false; } catch (e) { return e.status === status; } };

console.log("--- contract ---");
const assets = await engine.discover("acme.io");
chk("discover sends bearer key", last.auth, "Bearer test-engine-key");
chk("discover posts the domain", last.body?.domain, "acme.io");
chk("out-of-scope + IP hosts dropped", assets.map((a) => a.host).join(","), "www.acme.io,api.acme.io");
chk("tech strings capped", assets[1].tech[0].length, 40);
const started = await engine.start(E);
chk("start → jobId", started.jobId, "job-123");
chk("start → state queued", started.state, "queued");
chk("job carries scope", last.body?.domain === "acme.io" && last.body?.targets?.[0] === "www.acme.io", true);
chk("job carries callback url", /\/api\/engine\/callback$/.test(last.body?.callbackUrl || ""), true);
chk("job never carries credentials/emergency PII", JSON.stringify(last.body).includes("emergency"), false);
const polled = await engine.poll(E);
chk("poll → completed", polled.state, "completed");
chk("poll → normalized finding", polled.findings?.[0]?.verified === false && polled.findings[0].cvss === 5.4, true);

console.log("--- hostile / broken engine ---");
mode = "badfinding";
chk("out-of-scope finding rejected (400)", await fails(() => engine.poll(E), 400), true);
mode = "500";
chk("engine HTTP 500 → 502", await fails(() => engine.discover("acme.io"), 502), true);
mode = "badjson";
chk("invalid JSON → 502", await fails(() => engine.discover("acme.io"), 502), true);
mode = "redirect";
chk("redirect not followed → 502", await fails(() => engine.discover("acme.io"), 502), true);
mode = "huge";
chk("oversized response → 502", await fails(() => engine.discover("acme.io"), 502), true);
mode = "ok";
delete process.env.ENGINE_ALLOW_HTTP;
chk("plain http refused without ENGINE_ALLOW_HTTP", await fails(() => engine.discover("acme.io"), 502), true);
process.env.ENGINE_URL = "";
chk("missing ENGINE_URL → 502", await fails(() => engine.discover("acme.io"), 502), true);

fake.close();
await done("ENGINE HTTP DRIVER");

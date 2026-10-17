// LOCAL-ONLY stand-in for deploy/nginx.conf, so the built site works as one
// origin on this machine:   node deploy/local-serve.mjs   → http://127.0.0.1:3000
//   /          → web/out      (Next.js static export)
//   /portal/   → portal/dist  (React SPA, history fallback to index.html)
//   /api/      → proxied to the API on 127.0.0.1:5050
// Zero dependencies. Binds localhost only. Not for production — use nginx.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "web", "out");
const PORTAL = path.join(ROOT, "portal", "dist");
const PORT = Number(process.env.PORT || 3000);
const API = { host: "127.0.0.1", port: Number(process.env.API_PORT || 5050) };

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
  ".woff2": "font/woff2", ".woff": "font/woff",
};

// resolve a URL path inside a root; null if it escapes the root (path traversal)
function inside(root, urlPath) {
  const p = path.resolve(root, "." + path.posix.normalize("/" + urlPath));
  return p === root || p.startsWith(root + path.sep) ? p : null;
}
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

function send(res, file, status = 200) {
  res.writeHead(status, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
  fs.createReadStream(file).on("error", () => { if (!res.headersSent) res.writeHead(500); res.end(); }).pipe(res);
}

function proxyApi(req, res) {
  const headers = { ...req.headers, "x-forwarded-for": req.socket.remoteAddress || "" };
  const up = http.request({ ...API, method: req.method, path: req.url, headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  up.on("error", () => { res.writeHead(502, { "Content-Type": "application/json" }); res.end('{"error":"API not running on :' + API.port + '"}'); });
  req.pipe(up);
}

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (urlPath.startsWith("/api/")) return proxyApi(req, res);
  // split on both separators: on Windows "\\" is a path separator too
  if (urlPath.split(/[\\/]/).some((seg) => seg.startsWith(".") && seg !== ".well-known")) { res.writeHead(404); return res.end(); }
  if (urlPath === "/portal") { res.writeHead(301, { Location: "/portal/" }); return res.end(); }

  if (urlPath.startsWith("/portal/")) {
    const f = inside(PORTAL, urlPath.slice("/portal".length));
    return send(res, f && isFile(f) ? f : path.join(PORTAL, "index.html"));
  }

  const base = inside(WEB, urlPath);
  if (base) for (const f of [base, path.join(base, "index.html"), base + ".html"]) if (isFile(f)) return send(res, f);
  send(res, path.join(WEB, "404.html"), 404);
}).listen(PORT, "127.0.0.1", () => console.log(`[local] http://127.0.0.1:${PORT}  (site + /portal/ + /api proxy)`));

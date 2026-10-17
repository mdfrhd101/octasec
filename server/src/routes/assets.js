import { Router } from "express";
import Asset from "../models/Asset.js";
import Domain from "../models/Domain.js";
import { auth } from "../middleware/auth.js";
import { asyncHandler, isId, asString, isHostname, isBadParam } from "../utils/http.js";
import { scopeFor, ownerStamp } from "../utils/tenancy.js";

const r = Router();
r.use(auth);

/* ------------------------------------------------------------------ *
 * NOTE: discovery + scanning here are MOCK/STUB only.
 * Real subdomain enumeration and tech fingerprinting (WhatWeb /
 * Wappalyzer) run in the separate scanning backend (owned by the MD).
 * These endpoints return placeholder data so the portal UI works end
 * to end; swap the mock blocks for calls to that service later.
 * ------------------------------------------------------------------ */
const TECH = [
  ["WordPress", "PHP", "cPanel"], ["Node.js", "Express", "nginx"],
  ["React", "Vite", "Cloudflare"], ["Laravel", "MySQL", "Apache"],
  ["Next.js", "Vercel"], ["Django", "PostgreSQL"],
];
const SUBS = ["www", "api", "mail", "staging", "admin", "cdn", "shop", "blog", "dev", "portal"];
const FINDINGS = [
  { title: "Missing security headers", severity: "medium", cvss: 4.3, owasp: "A05:2021 Security Misconfiguration", detail: "Served without HSTS / Content-Security-Policy.", fix: "Add HSTS, CSP and X-Content-Type-Options at the edge." },
  { title: "Outdated component with known CVEs", severity: "high", cvss: 7.5, owasp: "A06:2021 Vulnerable & Outdated Components", detail: "A public component advertises a version with published advisories.", fix: "Upgrade to a supported release and re-test." },
  { title: "Verbose server banner", severity: "low", cvss: 3.1, owasp: "A05:2021 Security Misconfiguration", detail: "Server discloses exact software/version, aiding fingerprinting.", fix: "Suppress version tokens in server config." },
  { title: "Exposed non-production surface", severity: "high", cvss: 8.2, owasp: "A01:2021 Broken Access Control", detail: "A staging/admin host is reachable publicly.", fix: "Restrict to VPN/allowlist and require auth." },
  { title: "Weak TLS configuration", severity: "medium", cvss: 5.9, owasp: "A02:2021 Cryptographic Failures", detail: "Endpoint negotiates a legacy protocol/cipher.", fix: "Disable legacy protocols; prefer TLS 1.2+." },
  { title: "Authentication bypass on admin route", severity: "critical", cvss: 9.4, owasp: "A07:2021 Identification & Authentication Failures", detail: "An administrative endpoint can be reached without a valid session under a specific request sequence.", fix: "Enforce server-side session checks on every privileged route; add tests for the bypass path." },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const PAGE_MAX = 200;

async function ownedDomain(user, domainId) {
  if (!isId(domainId)) return null;
  return Domain.findOne({ _id: domainId, ...scopeFor(user) });
}

// list assets (optionally by domain)
r.get(
  "/",
  asyncHandler(async (req, res) => {
    if (isBadParam(req.query.domainId)) return res.status(400).json({ error: "Invalid domainId" });
    const q = { ...scopeFor(req.user) };
    const domainId = asString(req.query.domainId);
    if (domainId) {
      if (!isId(domainId)) return res.status(400).json({ error: "Invalid domainId" });
      q.domainId = domainId;
    }
    const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(asString(req.query.limit), 10) || 100));
    const skip = Math.max(0, parseInt(asString(req.query.skip), 10) || 0);
    const assets = await Asset.find(q).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
    res.json({ assets });
  })
);

// MOCK discovery — "Look for assets" on a verified domain
r.post(
  "/discover",
  asyncHandler(async (req, res) => {
    const domain = await ownedDomain(req.user, asString(req.body?.domainId));
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain first" });
    const hosts = SUBS.filter(() => Math.random() < 0.5).slice(0, 5);
    if (!hosts.length) hosts.push("www", "api");
    const created = [];
    for (const h of hosts) {
      const host = `${h}.${domain.name}`;
      try {
        created.push(await Asset.create({ ...ownerStamp(req.user), domainId: domain._id, host, tech: pick(TECH).slice(), status: "unscanned" }));
      } catch (e) {
        if (!(e && e.code === 11000)) throw e; // ignore already-known hosts
      }
    }
    res.json({ discovered: created.length, assets: created, mock: true });
  })
);

const ASSETS_PER_DOMAIN_MAX = 500;

// manual add asset
r.post(
  "/",
  asyncHandler(async (req, res) => {
    const domain = await ownedDomain(req.user, asString(req.body?.domainId));
    if (!domain) return res.status(404).json({ error: "Domain not found" });
    if (!domain.verified) return res.status(409).json({ error: "Verify the domain first" });
    const host = asString(req.body?.host).trim().toLowerCase();
    if (!isHostname(host)) return res.status(400).json({ error: "Enter a valid host" });
    // the host must be the domain itself or a subdomain of it — never an
    // arbitrary/third-party/internal host (this is what the scanner will hit)
    if (host !== domain.name && !host.endsWith("." + domain.name)) {
      return res.status(400).json({ error: `Host must be ${domain.name} or a subdomain of it` });
    }
    if ((await Asset.countDocuments({ domainId: domain._id })) >= ASSETS_PER_DOMAIN_MAX) {
      return res.status(409).json({ error: "Asset limit reached for this domain" });
    }
    try {
      const asset = await Asset.create({ ...ownerStamp(req.user), domainId: domain._id, host, tech: pick(TECH).slice() });
      res.status(201).json({ asset });
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: "Host already added" });
      throw e;
    }
  })
);

export default r;

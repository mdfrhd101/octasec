# OctaSec — Product Detail (What OctaSec Provides)

**By:** Octagram Limited
**Category:** Autonomous Offensive Security Platform (AI-driven penetration testing with real exploit validation)
**Model:** Same-to-same as XBOW — an autonomous AI "hacker" that finds **and proves** exploitable flaws — plus OctaSec's own edge (offline/privacy-first, SME-affordable, Bangla + Bangladesh-Bank compliance).
**Date:** 2026-10-12 · v1 product definition

---

## 1. In one line

Point OctaSec at a web app or API. An autonomous AI agent explores it like a real attacker, **chains vulnerabilities into a working exploit**, proves what's actually exploitable, and hands your team an auditable case file with a developer-ready fix — continuously, and on your own servers.

**The thesis:** security teams don't need more *findings* — they need *proof*. OctaSec's output is proven, reproducible exploits with near-zero false positives, not a pile of "maybes."

---

## 2. The core product — the Autonomous Pentester

| What it is | What it means |
|---|---|
| **Autonomous** | No human drives it. It hypothesizes, tests, adapts, and decides the next move on its own. |
| **Offensive** | It attacks the way a real adversary would — not a passive scanner. |
| **Proof-first** | Every finding comes with a working, non-destructive exploit as evidence. |
| **Continuous** | Re-tests every time the app changes, not once or twice a year. |
| **Point-and-go** | Input is just a URL (or API spec). More context → deeper testing. |

---

## 3. What OctaSec tests (coverage)

**Targets:** Web applications, REST APIs, GraphQL APIs, authenticated and unauthenticated surfaces, single-page apps, microservices.

**Vulnerability classes it finds and proves:**
- **Broken access control / IDOR / BOLA** — the #1 real-world class
- **Injection** — SQLi, NoSQLi, command injection, SSTI, LDAP/XPath
- **Authentication & session flaws** — broken auth, JWT abuse, session fixation, MFA gaps
- **SSRF** — including cloud-metadata reach
- **Cross-site scripting (XSS)** — reflected, stored, DOM
- **Business-logic flaws** — abuse of intended functionality (price tampering, workflow bypass, privilege escalation)
- **Security misconfiguration** — exposed admin, verbose errors, headers, CORS
- **Cryptographic failures** — weak/missing encryption, token predictability
- **Insecure deserialization & unsafe object handling**
- **Secrets & data exposure** — keys, tokens, PII leakage
- **Vulnerable & outdated components** (dependency-driven exploitability)
- **API-specific** — OWASP API Top 10: BOLA, broken function-level auth, mass assignment (BOPLA), unrestricted resource consumption, improper inventory
- **Multi-step chained attack paths** — the combinations scanners and point-in-time pentests miss

---

## 4. Capabilities (the detailed feature list)

### 4.1 Discovery & recon
- Autonomous attack-surface mapping (endpoints, APIs, params, auth flows, hidden/undocumented routes)
- Tech-stack and dependency fingerprinting
- Context ingestion (give it docs, OpenAPI/Swagger, test creds → it goes deeper)

### 4.2 Exploitation & proof
- **Vulnerability chaining** — links individual weaknesses into real attack paths
- **Exploit generation** — builds the actual working exploit
- **Safe validation** — proves impact **non-destructively by default** (no data loss, no downtime)
- **Near-zero false positives** — if it's reported, it was proven

### 4.3 Continuous testing
- Re-tests automatically as the application changes (new deploys, new endpoints)
- On-demand runs — trigger a test any time, get results in hours not weeks
- **Fix verification / retest** — confirms a remediation actually closed the hole

### 4.4 Findings & evidence ("Finding Trace")
Every finding is a complete **case file**, not an alert:
- The full **chained attack path**
- The **working exploit** that proves it
- A **decision log** — every tactic and choice the agent made (replayable)
- **Severity** (CVSS) and business impact
- **Developer-ready remediation** with retest

### 4.5 Prioritization
- Ranked by **proven exploitability**, not theoretical score — so teams fix what an attacker would actually use first

### 4.6 Scale
- Tests every app continuously; scales with your attack surface, **not your headcount**

---

## 5. How it works (the autonomous loop)

```
1. SCOPE    → verify ownership, set allowlist + rules, pick mode
2. RECON    → map the real attack surface
3. HYPOTHESIZE → reason about likely weaknesses (like a human pentester)
4. CHAIN    → combine flaws into multi-step attack paths
5. PROVE    → build + run a safe, non-destructive exploit
6. REPORT   → deliver the case file (path + PoC + log + fix)
7. RETEST   → re-run on change / after a fix
```

---

## 6. Deliverables / outputs

- **Finding Trace / case file** (per finding) — the core deliverable
- **Executive report** — board-ready risk summary
- **Auditor report** — compliance-mapped, evidence-backed
- **Developer report** — reproducible steps + exact fix
- **Dashboard** — live risk posture, trends, coverage, open vs fixed
- **Risk scoring** measured continuously ("risk every day, not estimated once a year")
- **Downloadable, redacted sample report** (public, for trust)
- **API / export** — pull findings into your own tools

---

## 7. Governance & guardrails (what keeps autonomy safe)

- **Ownership verification** — a target is tested only after you prove you control it (DNS/file token)
- **Scope contract** — hard allowlist; nothing runs outside it
- **Rate limiting** — controlled load, no accidental DoS
- **Approval gates** — optional human sign-off before intrusive steps
- **Kill-switch** — one-click stop on any run
- **Immutable audit log** — every action recorded and replayable for auditors
- **Data separation & residency** — your data isolated; choose where it lives
- **Non-destructive by default** — proves impact without causing it

---

## 8. Deployment modes

| Mode | For |
|---|---|
| **SaaS (cloud)** | Fast start, managed, auto-updating |
| **On-prem / self-hosted** | Data stays in your infrastructure |
| **Offline / air-gapped (local models)** | **OctaSec edge** — banks, government, healthcare that cannot ship targets to any cloud. The whole engine runs on local models; data never leaves the network. |

---

## 9. Integrations

- **CI/CD** — GitHub Actions, GitLab CI, Jenkins (test on every deploy; block risky releases)
- **Ticketing** — Jira, Linear, ServiceNow (auto-file proven findings)
- **Alerts / chat** — Slack, Microsoft Teams, webhooks
- **Vuln management** — DefectDojo and similar
- **Identity** — SSO / SAML / SCIM
- **Programmatic** — REST API + an **MCP server** so other tools/agents can query findings

---

## 10. Compliance & trust

- Testing mapped to **OWASP Top 10 / API Top 10 / WSTG**
- Built to align with **SOC 2, ISO 27001, PCI DSS, GDPR / DPDP, NIS 2**
- **Bangladesh Bank ICT Security Guidelines** mapping (OctaSec edge)
- **security.txt** + responsible-disclosure program
- **Public benchmark results** and an **open methodology page** — evidence over borrowed logos

---

## 11. Product packaging (how it's sold)

- **On-demand / per-test** — transparent pricing; run a test when you need one (SME-friendly entry XBOW moved away from)
- **Continuous (subscription)** — always-on testing that re-runs on change, priced by attack surface
- **Enterprise** — on-prem/offline deployment, SSO, custom scope, approval workflows, dedicated support
- **Add-on modules** — extra surfaces/volume, premium support, extended retention

---

## 12. OctaSec's edge (same-to-same as XBOW, plus what XBOW lacks)

| | XBOW | **OctaSec** |
|---|---|---|
| Autonomous web/API pentest + proof | ✅ | ✅ (same-to-same) |
| **Offline / air-gapped** on local models | ✗ | ✅ |
| **Transparent per-test / SME pricing** | moved to quote-only | ✅ |
| **Bangla reporting + Bangladesh Bank ICT** | ✗ | ✅ |
| **Sample report + open methodology on-site** | described only | ✅ published |
| Trust model | borrowed enterprise logos | **verifiable evidence** |

---

## 13. Target customers & use cases

**Customers:** SaaS companies, fintech/banks, e-commerce, healthcare, government, and SMEs across Bangladesh / South Asia and beyond.

**Use cases:**
- Replace or augment a once-a-year manual pentest with continuous proof
- Gate every release in CI/CD on proven exploitability
- Prove exposure before auditors / before an attacker finds it
- Give lean teams pentest depth without hiring
- Satisfy regulator (e.g. Bangladesh Bank) VAPT requirements with evidence

---

## 14. Pricing model (direction)

- **Usage/per-test** entry for SMEs (transparent, published)
- **Subscription** for continuous, scaled by attack surface
- **Enterprise** quote for on-prem/offline + custom
- Principle: **honest and transparent** — the opposite of the six-figure, quote-only wall

---

## 15. Build roadmap (how we get there)

1. **MVP** — scope/authorization + recon + known-class checks + verified findings + report (one web-app slice)
2. **Chaining** — multi-step attack-path reasoning
3. **Proof engine** — safe exploit generation + validation
4. **Continuous + integrations** — CI/CD, retest, ticketing
5. **Full autonomous + offline** — local-model air-gapped mode, enterprise governance

> Companion docs in this folder: `OCTASEC_WEBSITE_BRIEF.md` (site/trust), `OCTASEC_SITEMAP.md` (pages), `octasec-home.html` (home page prototype).

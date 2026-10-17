# OctaSec — Developer Guide (handoff)

**For:** the backend developer who continues OctaSec, in particular connecting the real scan engine.
**State on 2026-10-17:**
- The portal, API, marketing site and security hardening are complete.
- 19 automated test suites (478 checks) pass.
- `npm audit` reports 0 known vulnerabilities in all three apps.

Start here. Every other document is linked from §15.

---

## 1. What OctaSec is

OctaSec is Octagram's **human-gated penetration-testing service** (PTaaS) with light attack-surface management.

| Who | What they do |
|---|---|
| **Customers** (tenants) | Add and verify their domains. Discover assets. Request scans, filling a scoping questionnaire plus a signed rules-of-engagement. Read signed reports. Raise support tickets. |
| **OctaSec operators** (`super_admin`) | Work the scan queue. Run the scan engine. Review every finding by hand (verify or reject). Sign and deliver reports. Manage tenants, users, tickets, leads and the audit log. |

The **scan engine itself is not part of this repo**. The API talks to it through one adapter (`server/src/engine/`). Today a **mock** engine produces placeholder data so the whole workflow runs end to end.

## 2. Repository layout

```
octasec/
├── server/                 Express 4 + Mongoose API  (Node ≥ 20, tested on 24)
│   ├── src/
│   │   ├── index.js        app bootstrap: env checks, helmet, CORS, limits, routes, error handler
│   │   ├── middleware/auth.js   JWT verify + per-request DB re-check (role, status, revocation)
│   │   ├── routes/         one file per API area (see §9)
│   │   ├── models/         Mongoose schemas (see §6)
│   │   ├── engine/         scan-engine gateway: index.js, mock.js, http.js, normalize.js
│   │   ├── utils/          tenancy, validation (profile, scoping, http), accounts, email tokens,
│   │   │                   mailer, audit, domain verification (SSRF-hardened)
│   │   └── seed.js         LOCAL demo accounts only (refuses NODE_ENV=production)
│   ├── scripts/mail-test.js     SMTP connectivity check
│   └── tests/              API test suites + runner (isolated test DB)
├── portal/                 React 18 SPA (Vite), served under /portal/
│   └── src/services/       THE portal's API layer — every endpoint, one function each (see §9.1)
├── web/                    Next.js marketing site, static export → web/out
├── deploy/                 nginx.conf, security headers snippet, local-serve.mjs (local stand-in for nginx)
├── docs/                   design + requirements docs (index in §15)
├── tasks/                  TODO.md (work breakdown), BUG_TRACKER.md
├── tests/specs/            human-readable test specifications
└── brand/                  logo concepts (concept 1 "Facet Seal" is in use)
```

## 3. Quick start (local)

**Prerequisites:** Node.js 20+ and MongoDB 6+ running locally.

```bash
# 1. API
cd server
npm install
cp .env.example .env          # then set JWT_SECRET (openssl rand -hex 32)
npm run seed                  # demo accounts, see below
npm start                     # http://127.0.0.1:5050  (health: /api/health)

# 2. Portal + marketing site (production builds)
cd ../portal && npm install && npm run build      # → portal/dist
cd ../web    && npm install && npm run build      # → web/out

# 3. Everything on ONE origin, like production (site + /portal/ + /api proxy)
cd .. && node deploy/local-serve.mjs              # http://127.0.0.1:3000
```

**Dev mode:**
- `cd portal && npm run dev` runs on :5173. Vite proxies `/api` to :5050.
- `cd web && npm run dev` runs the marketing site.

**Demo accounts** (local seed only, never in production):

| Role | Email | Password |
|---|---|---|
| super_admin | admin@octasec.ai | admin12345 |
| company_admin | corp@demo.com | corp12345 |
| employee | emp@demo.com | emp12345 |
| client | client@demo.com | client12345 |

**Email without SMTP.** Emails are printed to the API console (verification, invites, resets) with their links. That is how you complete sign-up and invite flows locally.

## 4. Environment variables (`server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | e.g. `mongodb://127.0.0.1:27017/octasec` |
| `JWT_SECRET` | yes | ≥ 32 random chars. Boot rejects placeholders. |
| `JWT_EXPIRES` | no | Default `12h`. |
| `PORT`, `HOST` | no | Default `5050`, `127.0.0.1`. Keep localhost; nginx proxies `/api`. |
| `CLIENT_ORIGIN` | yes | Comma-separated CORS allowlist; fails closed. |
| `NODE_ENV` | prod: `production` | Enables production boot checks. Seeding is refused. |
| `APP_URL` | **prod: required, https** | Public base URL used in emailed links. Boot refuses without it in production. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | prod: yes | Outgoing mail. Check with `npm run mail:test -- you@domain`. |
| `ENGINE_DRIVER`, `ENGINE_URL`, `ENGINE_API_KEY`, `ENGINE_WEBHOOK_SECRET`, `ENGINE_ALLOW_HTTP` | when connecting the engine | See §8. `ENGINE_WEBHOOK_SECRET` must be ≥ 32 chars. |

## 5. Architecture and the rules every route follows

**Request path:**
1. nginx (TLS, headers, CSP)
2. Express: `helmet`, then CORS allowlist, then JSON body (256 KB cap), then a global rate limit
3. the route's `auth` middleware
4. the route handler
5. a central error handler, which never leaks stack traces

**Authentication (`middleware/auth.js`):**
- JWT is HS256 (algorithm pinned) and carries `id`, `role`, `companyId` and `tv` (token version).
- On every request the user is **re-read from MongoDB**, so role and company come from the DB, never the token.
- Requests are refused when:
  - the user was deleted (401);
  - the account is disabled (403 `ACCOUNT_DISABLED`);
  - the account is unverified (403 `EMAIL_NOT_VERIFIED`);
  - `tokenVersion` no longer matches, i.e. the session was revoked (401);
  - the company is suspended (403 `COMPANY_SUSPENDED`).
- Logout, password change/reset and disable all bump `tokenVersion`, which revokes every session.

**Roles and tenancy (`utils/tenancy.js`):**

| Role | Sees |
|---|---|
| `super_admin` | everything (admin routes only) |
| `company_admin` / `employee` | their company's data (`companyId`) |
| `client` | their own data (`userId`) |

- `scopeFor(req.user)` returns the Mongo filter. **Every tenant query must spread it.** It fails closed: a company user without a company matches nothing.
- `ownerStamp(req.user)` sets ownership on new records.

**Input handling:**
- `asString`, `isId` and `isBadParam` (`utils/http.js`) reject Mongo-operator objects and bad ids.
- Rich payloads go through allowlisting validators:
  - `parseProfile` (organisation profile);
  - `parseAuthorization` (client authorisation-to-test);
  - `parseScoping` (scan questionnaire);
  - `normalizeFindings` / `normalizeAssets` (everything returned by the engine).
- Unknown keys are dropped. Never `...req.body` into a model.

**Audit:**
- Call `audit(req, "area.action", { targetType, targetId, targetLabel, companyId, meta })` after every sensitive action.
- It is append-only, strips secret-looking keys and never breaks the user's action.
- Super admins read it at `/admin/audit`, with category filters.

**Rate limits:**
- Global: 300/min per IP.
- Auth endpoints: 20 per 15 min per IP, plus a per-account login lockout (10 failures per 15 min).
- Scan requests: 30/hour per user.
- Verification: 30 per 10 min.
- Engine webhook: 120/min.

## 6. Data model (MongoDB collections)

| Model | Key fields |
|---|---|
| `User` | email (unique), passwordHash (bcrypt 12), role, companyId, status (`pending`/`active`/`disabled`), tokenVersion, profile (self-serve clients) |
| `Company` | name, status (`active`/`suspended`), profile |
| `Client` | companyId, name, status, profile, authorization `{onFile, authorizerName, authorizerTitle, documentRef, validUntil}` |
| `Domain` | userId/companyId, name, ownerType (`self`/`client`), clientId, verified, verifiedAt, verifyToken/verifyFile, env, criticality |
| `Asset` | domainId, host, tech[] |
| `Engagement` | tenant ids, domainId/domainName, targets[], roe, scoping, clientId, status, operator, engine `{driver, jobId, state, progress, error, lastEventTs}`, findings[] (with per-finding `review`), signedBy/At, rejectedCount |
| `Ticket` | companyId (null = self-serve), openedBy, messages[], status, priority |
| `Lead` | public contact-form submissions |
| `AuditLog` | action, actor snapshot, target, companyId, meta, ip, createdAt (append-only) |
| `PasswordReset` | emailed one-time tokens: purpose (`reset`/`admin_reset`/`invite`/`verify`), SHA-256 hash, expiresAt, usedAt |

The organisation-profile fields, and the reason for each, are in `docs/PORTAL_DATA_AND_DASHBOARDS.md`.

## 7. Engagement lifecycle (the human gate)

```
tenant requests ──► requested ──assign (operator)──► assigned ──run──► in_progress
                         │                               │               │  engine: queued → running → completed | failed
                      cancel/reject                    reject            │  operator reviews EVERY finding (verify / reject+reason)
                         ▼                               ▼               ▼
                    cancelled / rejected            rejected          sign ──► delivered  (only verified findings reach the tenant)
```

**When a tenant requests a scan:**
- The domain must be verified within the last 90 days.
- Only one open scan per domain.
- The scoping questionnaire and the authoriser's name/title are required.
- For a **client's** domain, the client must be active, with a written authorisation on file that is valid through the requested test dates.

**When the operator assigns or runs a scan:**
- All of the request checks are re-run (`runnableProblem`).
- Every target must resolve only to public IPs (`unsafeTargets`).
- Only the **assigned operator** can run, review and sign.

**State changes:** every transition is an atomic conditional update, so concurrent clicks cannot interleave.

**After delivery (remediation):** the tenant marks each finding `fixed`, `accepted_risk` (reason required) or back to `open`. Only `open` findings count in dashboards and the posture score. Fixed findings can be sent for a **retest**: a new engagement (`kind:"retest"`, `parentId`, `retestOf`) whose targets are those findings' hosts; it goes through the same queue, and the operator sees which findings to re-check (`retestFindings` on the admin view). *Engine note:* the mock engine returns random findings for a retest too; the real engine should re-test exactly `retestOf`.

**What tenants see:** an allowlisted view. There are no findings, and no finding counts, until delivery, and no operator or engine internals.

## 8. Scan-engine integration — where to work

Everything engine-related is isolated in `server/src/engine/`. The rest of the API calls only its exported functions:

- `index.js` is the gateway. It selects the driver (`ENGINE_DRIVER`) and exposes `discover`, `start`, `poll`, `applyResult`, `unsafeTargets` and `verifySignature`.
- `mock.js` is today's placeholder engine (instant results). Keep it for development and tests.
- `http.js` is an outbound HTTP driver: bearer auth, TLS required, no redirects, size and time limits.
- `normalize.js` validates **all** data coming back from an engine (type, length, enums, scope). Use it on every path.
- `routes/engineCallback.js` is the inbound HMAC-signed webhook. It is mounted before the JSON parser because it signs the raw body.
- `tests/engine.test.mjs` and `tests/engine-http.test.mjs` exercise the adapter, using the mock and a fake HTTP engine.

> **Note:** the detailed engine contract document (`docs/ENGINE_INTEGRATION.md`) is **incomplete and pending owner review**. Until it is finalised, treat the code comments in `server/src/engine/` and the two engine test suites as the reference, and agree the final contract with the project owner.

**Non-negotiables for any engine work:**
- Findings always arrive **unverified**. Only the operator's review and signature deliver them.
- Never send the engine credentials or personal data from the scoping form.
- The engine host must itself block outbound traffic to private, loopback and cloud-metadata ranges.

## 9. API reference

Everything below is mounted under `/api`. 🔒 means authentication is required; the roles shown are those allowed.

**Public**

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| POST | `/contact` | contact form + Pricing-page quote popup (rate-limited, honeypot); optional `source` (`contact`/`pricing`), `plan`, `scope` |
| POST | `/auth/register` | always 202 "check your email"; account stays pending until verified |
| POST | `/auth/verify-email` | `{token}` → activates and returns a session |
| POST | `/auth/login` | `{email,password}` → `{token,user}` |
| POST | `/auth/forgot-password` | always the same reply |
| POST | `/auth/reset-password` | `{token,newPassword}`; also used for invites and admin resets |
| POST | `/engine/callback` | HMAC-signed engine webhook (404 until `ENGINE_WEBHOOK_SECRET` is set) |

**Any signed-in user** 🔒

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/me` | current user |
| POST | `/auth/logout` | revokes all sessions |
| POST | `/auth/change-password` | `{currentPassword,newPassword}` |
| GET/PATCH | `/auth/profile` | client only: own organisation profile |
| GET | `/dashboard` | role-specific: posture, pipeline, client risk, ops |

**Tenants** 🔒 (company_admin, employee, client)

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/domains` | list (`?owner=self\|all\|<clientId>`) / add (generates a verify file + token) |
| PATCH | `/domains/:id` | edit details `{label, env, criticality, contact, tags, notes}` (any subset), and/or reassign owner `{ownerType, clientId}`: client→self refused; between clients company_admin only, then re-verify |
| POST | `/domains/:id/verify` | fetches the token file (SSRF-hardened) |
| DELETE | `/domains/:id` | removes assets, cancels open scans |
| GET/POST | `/assets[?domainId=]` | list / add a host (must be the domain or a subdomain) |
| DELETE | `/assets/:id` | remove a host; 409 while a scan is open on its domain |
| POST | `/assets/discover` | engine discovery on a verified domain |
| GET/POST | `/engagements` | list / request a scan (`{domainId, roe, scoping}`) |
| GET | `/engagements/:id` | tenant view (findings with remediation `state`; `retests[]`) |
| POST | `/engagements/:id/cancel` | only while `requested` |
| PATCH | `/engagements/:id/findings/:fid` | tenant, delivered only: `{state:"open"\|"fixed"\|"accepted_risk", note}` (note required for accepted_risk) |
| POST | `/engagements/:id/retest` | tenant: `{findingIds}` — all must be `fixed`; creates a `kind:"retest"` engagement in the operator queue (same request checks) |
| GET/POST | `/tickets` | list / open |
| GET | `/tickets/:id` | thread |
| POST | `/tickets/:id/messages` | reply |
| GET/POST/GET/PATCH | `/clients`, `/clients/:id` | company users: managed client accounts plus authorisation |
| GET | `/company`, `/company/profile` | company users |
| PATCH | `/company/profile` | company_admin |
| GET/POST/PATCH/DELETE | `/company/employees[/:id]` | company_admin: invite, edit `{name, phone}`, disable/enable `{status}`, remove |
| GET/POST/DELETE | `/company/api-keys[/:id]` | **501 NOT_IMPLEMENTED stub** — contract in `docs/PORTAL_FRONTEND_PLAN.md` §3; the portal page is already wired |
| POST | `/company/employees/:id/reset-password` | company_admin: emails a set-password link |

**Super admin** 🔒 (`/admin/*`) — `/admin/engagements?status=delivered` also feeds the portal's admin **Reports** page

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | totals |
| GET/POST | `/admin/companies` | list / provision a company plus its first admin (emailed invite) |
| GET | `/admin/companies/:id` | detail |
| PATCH | `/admin/companies/:id` | suspend or activate |
| PATCH | `/admin/companies/:id/profile` | edit profile |
| DELETE | `/admin/companies/:id` | suspends first, then cascades |
| GET | `/admin/users` | `?role=` |
| PATCH | `/admin/users/:id` | enable or disable |
| POST | `/admin/users/:id/reset-password` | emailed link; the admin never sees a password |
| DELETE | `/admin/users/:id` | company users only; the last company admin is protected |
| GET | `/admin/engagements[?status=open]` | the queue |
| GET | `/admin/engagements/:id` | full record, including scoping |
| POST | `/admin/engagements/:id/assign` | → `assigned` (re-checks preconditions) |
| POST | `/admin/engagements/:id/run` | → engine (assigned operator only; target IP safety check) |
| POST | `/admin/engagements/:id/sync` | pull engine status |
| POST | `/admin/engagements/:id/findings/:fid` | `{decision:"verified"\|"rejected", note}` |
| POST | `/admin/engagements/:id/sign` | all findings reviewed → `delivered` |
| POST | `/admin/engagements/:id/reject` | `{reason}` |
| GET/PATCH | `/admin/leads[/:id]` | contact + quote-request inbox (`?status=`, `?source=pricing`) |
| GET | `/admin/audit` | `?category=auth\|company\|client\|user\|domain\|engagement\|ticket\|lead&q=` |
| PATCH | `/tickets/:id` | ticket status (super admin) |

**Error format:** `{ "error": "message" }`, sometimes with a machine-readable `code`. Statuses:

| Status | Meaning |
|---|---|
| 400 | invalid input |
| 401 | not signed in or session revoked |
| 403 | role not allowed or account state |
| 404 | not found, or not yours (same answer, so nothing leaks) |
| 409 | workflow conflict |
| 413 | body too large |
| 429 | rate limited |
| 502 | engine unavailable |

### 9.1 Portal API layer (`portal/src/services/`)

The portal never calls `fetch` or builds API URLs inside screens. Every endpoint is one documented function:

| File | Contents |
|---|---|
| `services/http.js` | `request()`, `ApiError {message, status, code}`, `isNotImplemented(e)`, token storage, the auth-error hook |
| `services/index.js` | `auth`, `dashboard`, `domains`, `assets`, `clients`, `company` (+`employees`), `engagements`, `tickets`, `apiKeys`, `admin` (+`companies`, `users`, `engagements`, `leads`, `audit`) |

**To add an endpoint:** add a function (with its `METHOD /path · body → response` comment) to the matching object in `services/index.js`, then call it from the screen. If the backend is not ready, return **501 `{code:"NOT_IMPLEMENTED"}`**: screens check `isNotImplemented(e)` and show a "Not available yet" panel instead of an error (see `pages/ApiKeys.jsx`).

**UI kit (`portal/src/ui.jsx`):** `useUI()` gives `toast(msg, "ok"|"err")`, `confirm({title, body, confirmLabel, danger})`, `prompt({title, label, required, multiline})` and `run(fn, okMsg)`. Never use the browser's `alert/confirm/prompt`. Wrap every table in `<TableWrap>` (or `.tbl-wrap`) so it scrolls on phones; show load failures with `<LoadError msg onRetry>`.

## 10. Email

- Every email goes through `utils/mailer.js`, and one-time links through `utils/emailTokens.js`.
- Tokens are 256-bit, stored as SHA-256 hashes, single-use, bound to one purpose, throttled to 3 per account per hour, and carried in the URL **fragment**.
- Details and SMTP setup are in `docs/EMAIL_AND_PASSWORD_RESET.md`.

## 11. Security checklist for new code (keep the bar)

1. Spread `scopeFor(req.user)` into **every** tenant query. Admin routes sit behind `requireRole("super_admin")`.
2. Parse input with `asString` / `isId` / `isBadParam` or a dedicated validator. Never spread `req.body` into a model.
3. Use atomic conditional updates (`findOneAndUpdate({_id, status: expected}, …)`) for state transitions.
4. Call `audit()` for anything security- or money-relevant.
5. Never return operator internals, tokens, hashes or other tenants' data. Build a response allowlist.
6. Put any outbound request to a user-influenced host through `utils/verifyDomain.js`-style IP pinning and public-IP checks.
7. Add a test, plus a line in the relevant `tests/specs/*.md`, before merging.
8. Run `npm audit` in all three apps. Pin new dependencies to a release at least 2 weeks old.

## 12. Testing

```bash
cd server
npm test                       # all suites: drops + seeds an ISOLATED octasec_test DB, restarts the API per suite
npm test -- engine hardening   # only suites whose filename contains these words
```

- Tests never touch your dev database. The database name must contain `test`, or the runner refuses.
- Emails go to a temporary outbox file, so suites can read links (`tests/lib.mjs`: `latestLink`, `registerVerified`, `activate`, `reviewAll`).
- Auth endpoints are rate-limited per IP (20 per 15 min). Keep each suite under that, or split it, as was done for `hardening` and `password-reset`.
- `security-fixes.test.mjs` and `lockout.test.mjs` prove each finding from the 2026-10-17 security assessment stays fixed.

## 13. Deployment

See `DEPLOY.md`. In short:
- nginx serves `web/out` at `/` and `portal/dist` at `/portal/`, and proxies `/api` to the API on 127.0.0.1:5050 (pm2).
- MongoDB runs locally.
- certbot provides TLS.

After deploying, check:
- `nginx -t`
- headers with `curl -I`
- `npm run mail:test`
- a real domain verification

## 14. Known gaps / next work

| Item | Notes |
|---|---|
| Connect the real scan engine | §8. The contract doc is pending owner review. |
| Billing / plans (Phase C) | Specified in `OCTASEC_PORTAL_SPEC.md`; deferred by the owner. |
| CMS / platform settings | Not built. |
| API keys for customers | UI + service ready; backend is a 501 stub — build the contract in `docs/PORTAL_FRONTEND_PLAN.md` §3 (hash keys at rest, show once, scopes `read`/`request`). |
| Server-side PDF | Reports print to PDF in the browser (print stylesheet). A signed server-generated PDF is optional later. |
| Quota counters | Count-then-create today; move to atomic counters if limits get tight (SA-19). |
| Login lockout store | In-memory, so it assumes one API process. Use Redis if you scale out. |
| Domain verification success path | Needs a real public domain to test end to end. |
| Self-serve account deletion (privacy) | Not built. |

## 15. Document index

| Document | What it covers |
|---|---|
| `docs/DEVELOPER_GUIDE.md` | this guide |
| `docs/PRICING_PAGE.md` | pricing page + quote popup spec |
| `docs/PORTAL_FRONTEND_PLAN.md` | portal completion: report view/PDF, remediation + retest, API contract of the new endpoints |
| `docs/PORTAL_DATA_AND_DASHBOARDS.md` | what data the product collects and why; dashboards per role |
| `docs/EMAIL_AND_PASSWORD_RESET.md` | email, sign-up verification, invites, resets, SMTP setup |
| `docs/ENGINE_INTEGRATION.md` | scan-engine contract (**incomplete — pending owner review**) |
| `OCTASEC_PORTAL_SPEC.md` | product panels and workflow spec (phases A–D) |
| `SECURITY_REPORT_OctaSec_2026-10-17.md` / `.pdf` | security assessment: 29 findings and their fixes |
| `server/SECURITY_AUDIT.md` | history of the security review rounds |
| `DEPLOY.md` | VPS deployment |
| `tasks/TODO.md`, `tasks/BUG_TRACKER.md` | work breakdown, bugs |
| `tests/specs/*.md` | test specifications |
| `OCTASEC_PRODUCT_DETAIL.md`, `OCTASEC_WEBSITE_BRIEF.md`, `OCTASEC_SITEMAP.md`, `MARKET_RESEARCH.md` | product and market background |

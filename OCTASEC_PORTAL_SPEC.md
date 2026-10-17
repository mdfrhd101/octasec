# OctaSec Portal — Panel & Workflow Specification (v1, for review)

**Purpose:** define exactly what each panel contains, how the scan workflow runs, and the data model — so we build it deliberately, not reactively. Nothing in here is built until you approve.

**Product reminder (from the MD's brief):** OctaSec = Octagram's AI-orchestrated, **human-gated** pentest service. Every finding is verified and **signed by a named operator**. The real scanning engine is the **MD's separate backend** (subdomain enum, WhatWeb, the actual exploit engine) — *our portal owns the WORKFLOW around it*, not the scanning itself.

---

## 1. Roles (who uses the system)

| Role | Who | Scope |
|------|-----|-------|
| **super_admin** | OctaSec / Octagram platform operators | the WHOLE platform + all tenants |
| **company_admin** | a B2B customer company's owner | their one company |
| **employee** | staff under a company | their company (shared) |
| **client** | self-serve B2C customer | their own account only |

Tenant isolation: company users share company data (by `companyId`); clients see only their own (by `userId`); super_admin sees across the platform. (Already built & security-audited.)

---

## 2. The core question: who runs a scan?

Because OctaSec is **human-gated**, a scan is not a button a customer clicks to get instant results. It is an **Engagement** with a lifecycle:

```
Tenant REQUESTS a scan (scope + rules of engagement + authorization)
        │
        ▼
Super Admin OPERATIONS QUEUE  ──►  operator ASSIGNED
        │
        ▼
operator RUNS it (triggers the MD's scan engine — integrated later)
        │
        ▼
findings come back  ──►  operator HUMAN-VERIFIES each one
        │
        ▼
operator SIGNS the report  ──►  DELIVERED back to the tenant
```

**Engagement states:** `requested → assigned → in_progress → under_review → delivered` (plus `cancelled`, `rejected`).

So:
- **"Super admin runs scans"** = works the Operations queue (assign → run → verify → sign). *Not* a personal client-style sandbox.
- **"Tenant scans"** = *requests* an engagement and tracks its status, then reads the signed report.

> This replaces today's placeholder (tenant clicks "Scan" → instant mock findings). The mock stays only as the operator's run-step stand-in until the MD's engine is wired.

---

## 3. What each panel contains

### 3a. SUPER ADMIN panel (platform)
| Section | What it does | Status |
|---------|--------------|--------|
| **Overview** | platform KPIs: companies, users by role, engagements in queue, open tickets, new leads, verified domains | ✅ partial (tiles) |
| **Companies (Tenants)** | list · **provision (create company + its admin)** · view usage · suspend/activate · delete · (plan) | ⚠️ read-only now — needs create/suspend |
| **Users & Operators** | all users across tenants · create/disable/delete · password reset · manage OctaSec operators | ⚠️ list+delete only |
| **Engagements / Operations** | the scan-request queue · assign operator · run · verify findings · **sign & deliver** report | ❌ not built |
| **Reports** | all delivered case-files (oversight) | ❌ not built |
| **Tickets** | all tenant support tickets · reply · status | ✅ built |
| **Leads** | contact-form submissions (sales inbox) | ✅ built |
| **Plans & Billing** | plan tiers, limits, invoices | ❌ later / optional |
| **Content / CMS** | benchmark numbers, marketing copy, failure-autopsy posts | ❌ later |
| **Audit log** | record of sensitive actions (who did what) | ❌ later |
| **Settings** | platform config, integrations, email templates, feature flags | ❌ later |

### 3b. COMPANY ADMIN panel (B2B company owner)
| Section | What it does | Status |
|---------|--------------|--------|
| **Dashboard** | their posture: score, open findings, coverage | ✅ built |
| **Employees** | add / remove staff | ✅ built |
| **Clients** | the businesses they handle (sub-accounts) | ✅ built |
| **Domains** | add · verify ownership · assign to a client | ✅ built |
| **Assets** | discovered / added hosts | ✅ built |
| **Engagements / Scans** | **request** a scan (scope + RoE) · track status · view delivered report | ⚠️ today it self-runs mock — change to request flow |
| **Reports** | signed case-file findings | ⚠️ exists as "Reports" (mock) |
| **Support** | open tickets to OctaSec | ✅ built |
| **Billing / Plan** | their subscription & usage | ❌ later |
| **Settings** | company profile, API keys | ⚠️ API page exists |

### 3c. EMPLOYEE panel
Same as Company Admin **minus** Employees, Billing, Settings. (Works on clients/domains/assets/engagements/reports/support.) ✅ mostly built.

### 3d. CLIENT panel (self-serve B2C)
Dashboard · Domains · Assets · **Engagements/Scans (request + track)** · Reports · Support · (Billing later). ✅ mostly built (scan = request-flow change pending).

---

## 4. Data model

**Exists:** Company, User (role, companyId), Client, Domain, Asset (+ embedded findings), Ticket, Lead.

**New / changed:**
| Entity | Fields (sketch) | Note |
|--------|-----------------|------|
| **Engagement** (new) | tenant (companyId/userId), requestedBy, scope (domain/asset ids), roe (intensity, window, excludes, authorized:true), status, assignedOperatorId, startedAt, findings[], reportSignedBy, signedAt | the scan workflow unit |
| **Finding** | move from Asset → belongs to an Engagement, references the asset (severity, cvss, owasp, detail, fix, state) | so findings are tied to a signed assessment |
| Plan / AuditLog / Setting | later phases | — |

---

## 5. Gap summary (what's missing vs this spec)
1. **Company provisioning** — super admin can't create a company + admin. *(your point)*
2. **Engagement / Operations** — no request→operator→verify→sign→deliver flow; scan is a self-run mock. *(your point — "super admin can't run scans")*
3. Reports oversight, Operator management, Plans/Billing, Content/CMS, Audit log, Settings.

---

## 6. Proposed build order (one phase at a time, each tested before the next)
- **Phase A — Provisioning & user management** (small, unblocks onboarding): super admin creates/suspends/deletes a company + its first admin; user disable/reset.
- **Phase B — Engagements / scan operations** (the big one): Engagement entity + tenant "request scan" + super admin operations queue + assign/run/verify/sign/deliver + Reports. Replaces the mock-scan.
- **Phase C — Plans & Billing** (optional).
- **Phase D — Content/CMS + Audit log + Settings.**

---

## 7. Decisions I need from you before building
1. **Scan model:** confirm the **Engagement flow** (tenant requests → operator runs/verifies/signs → delivered). Or do you want tenants to keep self-serve instant scans? *(biggest decision)*
2. **Real scanning stays the MD's backend** (we build only the workflow/queue + human-verify + sign), right?
3. **Who can request a scan** on the tenant side — company_admin + employee + client, or company_admin only?
4. **Build order** — start with Phase A (provisioning) or Phase B (engagements)?
5. Plans/Billing — in scope now, or later?

> **Phase A ✅ DONE** (company provisioning + user mgmt, 19/19). **Phase B ✅ DONE** (engagements request→assign→run→verify→sign→deliver, 22/22 + browser E2E). Now building **Phase C**.

---

# PHASE C — Plans & Billing (spec v1, for review)

**Design stance (given the current reality):** public pricing is NOT decided (marketing site = "contact for quote"), there is NO payment processor in the stack, and OctaSec is B2B human-gated. So Phase C is **admin-managed / offline billing** — the portal does **not** take card payments. Super admin defines plans, assigns a plan to each tenant, the system tracks & enforces usage against the plan's limits, and invoices are internal records the super admin issues and marks paid (payment happens offline, e.g. bank transfer). This also keeps us clear of handling card data in-app.

## C.1 What a "plan" controls
A plan is a template with **limits** (the quota a tenant gets) and **features** (flags). Limits map onto entities we already have:

| Limit key | Caps | Enforced at |
|-----------|------|-------------|
| `domains` | max verified+unverified domains | `POST /api/domains` |
| `engagementsPerMonth` | scan requests per calendar month | `POST /api/engagements` |
| `seats` | employees under a company (B2B only) | `POST /api/company/employees` |
| `clients` | sub-client accounts (B2B only) | client-create route |
| `assetsPerDomain` | discovered/added hosts per domain | asset add/discover |

`-1` = unlimited. B2C clients ignore `seats`/`clients`.

## C.2 Data model (new)
| Entity | Fields (sketch) | Note |
|--------|-----------------|------|
| **Plan** (new) | `name`, `tier` (starter/pro/enterprise/custom), `priceBDT`, `interval` (monthly/yearly), `limits{domains,engagementsPerMonth,seats,clients,assetsPerDomain}`, `features[]`, `active`, `isDefault` | reusable templates; super_admin CRUD |
| **Subscription** (new) | `tenantKind` (company/client), `companyId`/`userId`, `planId`, snapshot of `limits` + `name` at assign time, `status` (active/past_due/suspended/cancelled), `periodStart`, `periodEnd`, `assignedBy` | one current sub per tenant; limits snapshotted so later plan edits don't silently change a tenant's quota |
| **Invoice** (new) | `number` (seq), tenant ref, `subscriptionId`, `periodStart/End`, `lineItems[{desc,amount}]`, `amountBDT`, `status` (draft/issued/paid/void), `issuedAt`, `paidAt`, `markedPaidBy` | internal record; no gateway |

Usage is **computed live** (countDocuments) per period — no separate counter store to drift out of sync.

## C.3 Panels
**Super admin → "Plans & Billing":**
- Plans tab: list/create/edit/deactivate plan templates.
- On a Company/Client (Companies panel): "Assign plan" (pick plan → creates/updates Subscription), see current usage vs limits, suspend/reactivate subscription.
- Invoices tab: issue an invoice for a tenant/period, mark paid/void, list all.

**Tenant (company_admin / client) → "Billing & plan":**
- Current plan + status, usage meters (x/limit per key, with bars), period dates.
- Invoices list (view/download their own), read-only.
- Employee/client roles: **no** billing access (company_admin + client owner only).

## C.4 Enforcement rule
A helper `enforceLimit(user, key)` run inside the create routes: resolve the tenant's active Subscription → read snapshot limit → compare live count → `409 { error, limit, used }` when at/over. **Fail OPEN to a generous default** only if a tenant has *no* subscription yet (so existing tenants aren't locked out before you assign plans) — configurable. Suspended subscription → block new engagements with a clear message.

## C.5 Sub-phases (each built + tested before the next)
- **C1** — Plan + Subscription models; super_admin Plans CRUD; assign-plan on a tenant; tenant Billing page showing plan + live usage meters. *(no enforcement yet — safe to ship)*
- **C2** — `enforceLimit` wired into domains/engagements/seats/clients; 409 + friendly UI messages; usage bars turn red near limit.
- **C3** — Invoices: issue/mark-paid/void (super_admin) + tenant invoice list.

## C.6 Decisions I need before building C1
1. **Billing mode** — confirm **admin-managed / offline** (no card processor in the portal)? Or do you want an online gateway (Stripe / SSLCommerz-BD) wired now?
2. **Default plan on signup** — when a new company/client registers, auto-assign a free "Starter" plan, or leave them with **no plan** until super_admin assigns one?
3. **Enforcement for tenants with no plan** — fail OPEN (allow, generous default) or fail CLOSED (block until a plan is assigned)? *(I recommend fail OPEN so nobody is locked out mid-flight.)*
4. **Starter plan limits** — OK if I seed sensible defaults (e.g. Starter: 2 domains, 2 engagements/mo, 1 seat, 1 client; Pro: 10/10/5/10; Enterprise: unlimited) and you tune later?

> **Phase C decision (2026-10-15):** billing + plan-assign = **deferred** by the user ("pore"). Phase C on hold. Starting **Phase D → Audit log** first.

---

# PHASE D.1 — Audit log (spec v1, for review)

**Why first:** self-contained, no external dependency, and it makes the "every action logged & auditable" positioning real. Append-only record of **who did what, when** on sensitive actions. Super-admin oversight.

## D1.1 Data model — `AuditLog` (new, append-only)
| Field | Purpose |
|-------|---------|
| `action` | dotted verb, e.g. `company.create`, `engagement.sign`, `auth.login_fail` |
| `actorId` | user who did it (nullable for anon/failed-login) |
| `actorEmail`, `actorRole` | **snapshot** at write time — survives user deletion |
| `targetType`, `targetId`, `targetLabel` | what was acted on (e.g. `Company` / id / "Acme Ltd") |
| `companyId` | tenant scope for filtering (null = platform-level) |
| `meta` | tiny object, bounded — e.g. `{reason}` on reject, `{from,to}` on status change. **Never** passwords/tokens/bodies |
| `ip`, `ua` | request IP + truncated user-agent |
| `createdAt` | timestamp (indexed) |

**Immutability:** no update/delete API ever. Append-only. Indexes: `createdAt`, `action`, `actorId`, `companyId`. Retention cap later (keep all for now).

## D1.2 What we log (v1 event set)
- **Auth:** `auth.login` (success), `auth.login_fail` (security-relevant), `auth.register`.
- **Company:** `company.create`, `company.suspend`, `company.activate`, `company.delete`.
- **User:** `user.create` (employee/admin), `user.delete`.
- **Engagement lifecycle:** `engagement.assign`, `engagement.run`, `engagement.sign`, `engagement.reject`.
- **Lead:** `lead.status` (optional, low cost).

(Domain verify/delete + ticket replies can be added later; the set above is the sensitive core.)

## D1.3 How it's written
Helper `audit(req, action, { targetType, targetId, targetLabel, companyId, meta })` called **after** the action succeeds. Wrapped in try/catch — **a logging failure must never break the user's action** (console.error on failure). Awaited so it's reliable in the normal path. Actor + IP/UA pulled from `req`.

## D1.4 Panel — super_admin → "Audit log"
Read-only table: Time · Actor (email + role chip) · Action · Target · IP. Filters: action category (auth/company/user/engagement), free-text search (actor/target), pagination (reuse `page()`). **super_admin only** in v1 (company-scoped audit view for company_admin = later).

## D1.5 Decisions (my defaults — object if you disagree)
1. **Viewer:** super_admin only (v1). ✅ default
2. **Log failed logins:** yes (security product should). ✅ default
3. **Scope:** platform-wide; super_admin sees everything. ✅ default
No blockers — building now with these.

# OctaSec Portal — Data Requirements & Dashboard Analysis

**Date:** 2026-10-17 · **Status:** v1 (drives Phase P) · **Owner:** Octagram / OctaSec

## 0. What kind of product this is — and why that decides the data

OctaSec is a **human-gated PTaaS** (Penetration-Testing-as-a-Service) + light **ASM** (attack-surface) portal.
Comparable products: Cobalt, HackerOne Pentest, NetSPI Resolve, Synack, BreachLock, Astra (PTaaS);
Detectify, Intruder (ASM). The industry pre-engagement standard is **PTES – Pre-engagement** and the
**CREST / OWASP scoping questionnaire**. Every one of these collects three things before it will test:

1. **Who the customer is** (legal entity, sector, size, regulator) — to price, report and comply.
2. **Who to call** (business owner, technical contact, *24×7 security/emergency contact*, billing) — a
   live pentest can take a production system down; the tester must be able to reach someone *now*.
3. **Proof of authority + scope** (who authorised the test, what is in/out, when, how hard) — testing
   without written authorisation from the **asset owner** is illegal (BD Cyber Security Act 2023 §§ on
   unauthorised access; CMA-style laws elsewhere). An MSSP (our corporate tier) testing *its client's*
   assets must hold *that client's* authorisation, not just its own.

Today the portal collects almost none of this:

| Entity | Collected today | Missing |
|---|---|---|
| Company (B2B tenant) | name, status | legal identity, sector, size, address, all contacts, compliance drivers, data handled, report prefs |
| Client (MSSP sub-account) | name | everything above **+ the client's authorisation-to-test on file** |
| Self-serve client (B2C) | name, phone, org name | organisation identity, contacts, compliance |
| Engagement (scan request) | domain, intensity, window, excludes, checkbox | test type, environment, target types, roles, WAF/allow-listing, dates, objective, emergency contact, rate limit, typed authoriser signature |

## 1. Organisation profile (shared by Company, Client and self-serve Client)

One reusable schema, so every tenant level is described the same way.

| Group | Field | Req? | Why we need it | Validation |
|---|---|---|---|---|
| Identity | Legal name | **Yes** | contracts, report cover, invoice | 2–160 chars |
| | Trade / brand name | no | shown in UI if different | ≤120 |
| | Registration / trade-licence no. | no | KYC for B2B, BD trade licence | ≤60 |
| | TIN / BIN (tax) | no | BD VAT invoices (Phase C billing) | ≤40 |
| | Industry | **Yes** | risk weighting, sector benchmarks, which regulator applies | enum (13) |
| | Company size | no | pricing tier, seat expectations | enum (5 bands) |
| | Website | no | sanity check vs. domains | http(s) URL ≤200 |
| Location | Country | **Yes** (default BD) | jurisdiction, data-residency, law | ISO-3166 α-2 |
| | City, Address | no | contracts / invoice | ≤80 / ≤300 |
| | Timezone | no (default Asia/Dhaka) | test windows are in *their* time | IANA tz ≤60 |
| Contacts | **Primary** (name, title, email, phone) | **name + email** | business owner of the relationship | email RFC-lite, phone `+` digits 7–20 |
| | **Technical** | no | who fixes findings | same |
| | **Security / emergency (24×7)** | no (required to *request a scan* if no engagement emergency contact) | stop-the-test calls | same |
| | **Billing** | no | invoices | same |
| Compliance | Frameworks in scope | no | report mapping (ISO 27001, PCI DSS, SOC 2, Bangladesh Bank ICT Guideline, BTRC, GDPR, HIPAA, NIST CSF) | enum set |
| | Sensitive data handled | no | severity context (PII, card, financial, health, credentials) | enum set |
| Preferences | Report language | no | en / bn | enum |
| | Notify immediately on critical | no (default yes) | criticals are phoned/emailed before the report | bool |
| | Notes | no | free text | ≤1000 |

**Never collected:** passwords/credentials of the customer's systems (test accounts are exchanged via a
secure channel out-of-band), card numbers, national-ID numbers. Data minimisation per BD PDP
Ordinance / GDPR; all fields length-capped and type-checked server-side; changes audit-logged.

## 2. Client (MSSP sub-account) — extra fields

| Field | Why |
|---|---|
| Status (active / inactive) | stop new work without deleting history |
| **Authorisation on file** (yes/no) | an MSSP may only test a client's assets with the client's written permission |
| Authoriser name + title | who signed it |
| Document reference | e.g. "LoA-2026-014" (the signed letter lives in the MSSP's records) |
| Valid until | authorisations expire; expired ⇒ no new engagements |

**Rule (enforced in API):** a scan request on a domain owned by a client is refused (409) unless that
client is *active* and has authorisation on file that has not expired.

## 3. Engagement scoping questionnaire (scan request)

| Field | Req? | Why |
|---|---|---|
| Test type: black / grey / white box | **Yes** | effort and method |
| Environment: production / staging / development | **Yes** | production = safer intensity, stricter window |
| Target types: web app, API, external network, cloud, mobile backend | **Yes** (≥1) | which modules run |
| Number of user roles to test | no | authz-diffing effort |
| Test accounts will be provided via secure channel | no | we never take credentials in the form |
| API docs / OpenAPI URL | no | API coverage |
| WAF / IPS in front? + OK to allow-list our IPs? | no | avoid false "clean" results |
| Preferred start date, required-by date | start **Yes** | scheduling / SLA |
| Objective: compliance, pre-launch, periodic, post-incident, customer requirement, other | **Yes** | report framing |
| Max requests / second | no | protect fragile systems |
| Intensity, test window, excluded paths | (existing) | |
| **Emergency contact during the test** (name + phone) | **Yes** | stop-the-test channel |
| **Authoriser name + title** + "I am authorised" checkbox | **Yes** | typed signature on the RoE, stored + audited |

## 4. Dashboards — what each role needs to decide

Principle: every widget must answer a question that role actually asks.

### 4a. Super Admin — "What needs my attention on the platform?"
| Widget | Question it answers |
|---|---|
| Action queue: requested engagements, oldest age; unassigned > 24 h flagged | what is waiting on us? |
| Engagement pipeline (requested → assigned → in progress → delivered this month) | throughput |
| Avg. turnaround (request → delivered, last 30 d) | are we meeting SLA? |
| Open tickets by priority (urgent/high first) | who is unhappy? |
| New leads (last 7 d) | sales inbox |
| Tenants at risk: most open critical findings | where to escalate |
| Incomplete profiles / clients without authorisation | onboarding gaps |
| Platform totals (companies, users, domains verified) | size |
| Recent security events (failed logins, disables, resets) from audit log | abuse / incidents |

### 4b. Company Admin — "How exposed are we and our clients, and what is in flight?"
| Widget | Question |
|---|---|
| Posture score + severity breakdown (existing) | how bad is it? |
| **Per-client risk table**: client, domains, verified, open criticals/highs, last assessed, authorisation status | which client needs attention? |
| Engagement pipeline (requested / in progress / delivered) | what is in flight? |
| Domains never assessed or assessed > 90 days ago | coverage gaps |
| Authorisations expiring in 30 days | renewals |
| Profile completeness (missing emergency/security contact) | onboarding |
| Open support tickets | |

### 4c. Employee — same as Company Admin minus staff/billing; highlights *engagements I requested*.

### 4d. Self-serve Client — "Am I safe, and what do I do next?"
Posture + severity, engagement status, domains awaiting verification, profile completeness, next-step guide.

## 5. Build plan (Phase P — each step tested before the next)

| Step | Scope | Tests |
|---|---|---|
| P1 | `utils/profile.js` shared schema + sanitiser; Company/Client/User profile fields | unit-ish API: validation, length caps, enum rejection, NoSQL-object rejection |
| P2 | APIs: company profile GET/PATCH (company_admin edit, employee read), super-admin company create/view/edit with profile, client create/edit/view, self-serve profile GET/PATCH; audit events | authz matrix (who can read/write whose profile), cross-company 404 |
| P3 | Client authorisation rule on engagement requests + scoping questionnaire fields | 409 without/expired authorisation; required-field 400s |
| P4 | Portal: Organisation profile page, rich Add/Edit client, rich Add company, client detail, richer scan-request form | browser |
| P5 | Dashboards 4a–4d | API shape tests + browser |

Out of scope here: billing (Phase C, deferred), email verification / forgot-password (waits for the
owner's webmail SMTP details), file upload of signed LoA (needs object storage + AV scanning).

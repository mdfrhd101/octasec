# OctaSec — Work Breakdown (TODO)

Status keys: `TODO` · `IN_PROGRESS` · `DONE`. Only one atomic task `IN_PROGRESS` at a time.
Earlier phases (A provisioning, B engagements, D.1 audit log) are DONE — see `OCTASEC_PORTAL_SPEC.md`.

## Phase H — Bug fix & hardening (2026-10-17)

### Epic H1 — Repository hygiene
- **H1.1 git init** — `DONE`
  - AC: repo initialised at project root; `.gitignore` excludes `node_modules`, `.env`, `.gemini_key`, build output (`web/.next`, `web/out`, `portal/dist`), large generated media.
  - AC: no secret file is tracked (`git ls-files` shows no `.env` / `.gemini_key`).
- **H1.2 Tests in repo** — `DONE`
  - AC: API suites live in `server/tests/`; `npm test` (in `server/`) runs all of them against an isolated `octasec_test` DB, never the dev DB.
  - AC: runner drops + seeds the test DB, restarts the API per suite (fresh rate-limit state), exits non-zero on any failure.

### Epic H2 — Data integrity
- **H2.1 Company delete cascades Engagements** (BUG-001) — `DONE`
  - AC: `DELETE /api/admin/companies/:id` also removes the company's Engagement records; test proves 0 left.

### Epic H3 — Session & identity hardening
- **H3.1 Per-request DB re-check** (BUG-002) — `DONE`
  - AC: every authenticated request loads the user from the DB; role/companyId come from the DB, not the JWT.
  - AC: deleted user → 401; disabled user → 403; suspended company → 403; role change takes effect on the next request.
- **H3.2 Token revocation** — `DONE`
  - AC: `User.tokenVersion` is embedded in the JWT (`tv`); password change/reset and disable bump it → all old tokens 401.
- **H3.3 Self-service password change** — `DONE`
  - AC: `POST /api/auth/change-password` needs the current password, new ≥ 8 chars and different; returns a fresh token; old token dies.
- **H3.4 Admin password reset** — `DONE`
  - AC: super_admin can reset any non-super-admin user; company_admin can reset own-company employees only.
  - AC: a random temporary password is returned ONCE; user is flagged `mustChangePassword` and the API refuses all other routes (403 `PASSWORD_CHANGE_REQUIRED`) until they change it.
- **H3.5 User disable / enable** — `DONE`
  - AC: super_admin can disable/enable any non-super-admin user; company_admin own-company employees. Disabled → login 403 + live tokens rejected. Cannot disable self.
  - AC: every action is audit-logged (`user.disable`, `user.enable`, `user.password_reset`, `auth.password_change`).

### Epic H4 — Client parity
- **H4.1 Support for self-serve clients** (BUG-003) — `DONE`
  - AC: client role can open/list/view/reply to its OWN tickets; cannot see company tickets or other clients' tickets; super_admin sees them labelled "Self-serve".

### Epic H5 — Release
- **H5.1 Portal rebuild** (BUG-004) — `DONE`
  - AC: `portal/dist` rebuilt after all portal changes; build clean; browser check of the new screens.

## Phase P — Organisation data & dashboards (2026-10-17)
Requirements: `docs/PORTAL_DATA_AND_DASHBOARDS.md` · Tests: `tests/specs/profiles.spec.md`
- **P1 Shared profile schema + sanitiser** — `DONE`
  - AC: one schema used by Company, Client and self-serve User; server-side validation per §1 (required, lengths, enums, email/phone/URL, object rejection).
- **P2 Profile APIs + authz + audit** — `DONE`
  - AC: §Company profile authz + §Client + §Self-serve in the spec all pass.
- **P3 Client authorisation rule + scoping questionnaire** — `DONE`
  - AC: §Engagement scoping in the spec passes; existing engagement suite still green.
- **P4 Portal forms** — `DONE`
  - AC: Organisation page, rich Add/Edit client + detail, rich Add company + detail/edit, full scan-request form; browser-verified.
- **P5 Role dashboards** — `DONE`
  - AC: §Dashboards in the spec passes; each role's dashboard browser-verified.

## Phase F — Portal completion (2026-10-18)
Plan + API contract: `docs/PORTAL_FRONTEND_PLAN.md` · Tests: `tests/specs/portal-frontend.spec.md`, `server/tests/findings.test.mjs`
- **F1 Portal API layer** (`portal/src/services/`) — `DONE`. Every endpoint is one documented function; the screens no longer build URLs.
- **F2 UX kit** — `DONE`. Toasts, styled confirm/prompt dialogs (all native dialogs removed), `TableWrap`, `LoadError`, `Pending`. The PREVIEW chip is gone.
- **F3 Full report + PDF** — `DONE`. `/reports/:id`: cover, executive summary, scope, findings with description/evidence/fix/CWE/OWASP. The print stylesheet gives a PDF.
- **F4 Remediation + retest** — `DONE`.
  - API: `PATCH /engagements/:id/findings/:fid` and `POST /engagements/:id/retest`.
  - Only open findings count in dashboards.
  - The operator sees `retestFindings`.
- **F5 Super-admin Reports** — `DONE`. `/admin/reports`, with filters (customer, type, period, search), the read-only report, and PDF.
- **F6 API keys page** — `DONE (UI)`. It is wired to `services/apiKeys.js`. The backend is a 501 stub, and the build is pending.
- **F7 CRUD gaps** — `DONE`.
  - Domains: the details are editable, and the `corp` role bug that hid client assignment is fixed.
  - Assets: add a host, delete, filter by domain.
  - Employees: name and phone are editable.
- **F8 Website** — `DONE`. `og.png` plus OG/Twitter metadata. Plausible loads only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.

## Later (not in this phase)
- Phase C billing (deferred by owner), CMS/Settings, real scan engine integration (incl. retest = re-check `retestOf` only), API-key backend (contract ready), deployment, domain confirmed: octasec.ai (contact support@octasec.ai).

> Phase P result (2026-10-17): `npm test` → 12/12 suites (profiles 65, scoping 24, dashboards 27 + all earlier suites green).
> Also added: accounts created by an admin (new company admin, new employee) get `mustChangePassword` — they set their own password at first sign-in.

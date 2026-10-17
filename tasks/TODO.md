# OctaSec — Work Breakdown (TODO)

Status keys: `TODO` · `IN_PROGRESS` · `DONE`. Only one atomic task `IN_PROGRESS` at a time.
Earlier phases (A provisioning, B engagements, D.1 audit log) are DONE — see `OCTASEC_PORTAL_SPEC.md`.

## Phase H — Bug fix & hardening (2026-10-17)

### Epic H1 — Repository hygiene
- **H1.1 git init** — `TODO`
  - AC: repo initialised at project root; `.gitignore` excludes `node_modules`, `.env`, `.gemini_key`, build output (`web/.next`, `web/out`, `portal/dist`), large generated media.
  - AC: no secret file is tracked (`git ls-files` shows no `.env` / `.gemini_key`).
- **H1.2 Tests in repo** — `TODO`
  - AC: API suites live in `server/tests/`; `npm test` (in `server/`) runs all of them against an isolated `octasec_test` DB, never the dev DB.
  - AC: runner drops + seeds the test DB, restarts the API per suite (fresh rate-limit state), exits non-zero on any failure.

### Epic H2 — Data integrity
- **H2.1 Company delete cascades Engagements** (BUG-001) — `TODO`
  - AC: `DELETE /api/admin/companies/:id` also removes the company's Engagement records; test proves 0 left.

### Epic H3 — Session & identity hardening
- **H3.1 Per-request DB re-check** (BUG-002) — `TODO`
  - AC: every authenticated request loads the user from the DB; role/companyId come from the DB, not the JWT.
  - AC: deleted user → 401; disabled user → 403; suspended company → 403; role change takes effect on the next request.
- **H3.2 Token revocation** — `TODO`
  - AC: `User.tokenVersion` is embedded in the JWT (`tv`); password change/reset and disable bump it → all old tokens 401.
- **H3.3 Self-service password change** — `TODO`
  - AC: `POST /api/auth/change-password` needs the current password, new ≥ 8 chars and different; returns a fresh token; old token dies.
- **H3.4 Admin password reset** — `TODO`
  - AC: super_admin can reset any non-super-admin user; company_admin can reset own-company employees only.
  - AC: a random temporary password is returned ONCE; user is flagged `mustChangePassword` and the API refuses all other routes (403 `PASSWORD_CHANGE_REQUIRED`) until they change it.
- **H3.5 User disable / enable** — `TODO`
  - AC: super_admin can disable/enable any non-super-admin user; company_admin own-company employees. Disabled → login 403 + live tokens rejected. Cannot disable self.
  - AC: every action is audit-logged (`user.disable`, `user.enable`, `user.password_reset`, `auth.password_change`).

### Epic H4 — Client parity
- **H4.1 Support for self-serve clients** (BUG-003) — `TODO`
  - AC: client role can open/list/view/reply to its OWN tickets; cannot see company tickets or other clients' tickets; super_admin sees them labelled "Self-serve".

### Epic H5 — Release
- **H5.1 Portal rebuild** (BUG-004) — `TODO`
  - AC: `portal/dist` rebuilt after all portal changes; build clean; browser check of the new screens.

## Later (not in this phase)
- Phase C billing (deferred by owner), CMS/Settings, super-admin Reports oversight, email-based "forgot password" (needs mail infra), real scan engine integration, deployment.

# OctaSec — Bug Tracker

Lifecycle: NEW → CONFIRMED → IN_PROGRESS → RESOLVED → CLOSED

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| BUG-001 | Company delete leaves orphan Engagements | Medium | CLOSED |
| BUG-002 | Stale role/company in JWT for up to 7 days; no revocation | High | CLOSED |
| BUG-003 | Self-serve client has no Support (tickets) | Low | CLOSED |
| BUG-004 | portal/dist stale — Audit-log page missing from build | Medium | CLOSED |

---

### BUG-001 — Company delete leaves orphan Engagements
- **Severity:** Medium (data retention / privacy — a deleted tenant's scan scope & findings survive)
- **Steps:** create company → its user requests an engagement → super_admin deletes the company → `Engagement.find({companyId})` still returns rows; they still show in the ops queue.
- **Root cause:** cascade in `server/src/routes/admin.js` DELETE `/companies/:id` listed User/Client/Domain/Asset/Ticket but not Engagement.
- **Fix:** added `Engagement.deleteMany({ companyId })` to the cascade. Covered by `server/tests/hardening.test.mjs`.

### BUG-002 — Stale role/company in JWT; no revocation
- **Severity:** High (a demoted/deleted/disabled user keeps privileges until the 7-day token expires)
- **Steps:** log in as employee → super_admin deletes or changes the user → old token still works.
- **Root cause:** `auth` middleware trusted the JWT claims (`role`, `companyId`) without a DB lookup; no token versioning.
- **Fix:** `auth` now loads the user each request, takes role/companyId from the DB, rejects deleted (401) / disabled (403) / suspended-company (403) users, and checks `tokenVersion` (`tv` claim). Password change/reset + disable bump `tokenVersion`.

### BUG-003 — Self-serve client has no Support
- **Severity:** Low (spec 3d lists Support for clients)
- **Root cause:** `Ticket.companyId` was required and routes only allowed company users; portal hid the route.
- **Fix:** `companyId` optional; client tickets are owned by `openedBy` with `companyId: null`; per-client quota; portal nav + route enabled.

### BUG-004 — portal/dist stale
- **Severity:** Medium (deploy would ship without the Audit-log page)
- **Root cause:** sources changed after the last `vite build`.
- **Fix:** rebuilt after this phase's changes.

---

## Security assessment 2026-10-17 (SA-01 … SA-29)
Tracked in the internal security assessment report (kept by Octagram, not in this repository). Fixes are regression-tested in `server/tests/security-fixes.test.mjs` and `lockout.test.mjs`.
Functional bugs found during the assessment and fixed: portal build typo in App.jsx; run-claim blocked legacy engagements without engine fields.

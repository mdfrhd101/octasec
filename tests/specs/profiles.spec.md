# Test spec — Phase P (organisation profiles, client authorisation, scoping, dashboards)

Executable form: `server/tests/profiles.test.mjs`, `server/tests/scoping.test.mjs`, `server/tests/dashboards.test.mjs`.
Requirements: `docs/PORTAL_DATA_AND_DASHBOARDS.md`.

## Profile validation (shared sanitiser)
- Happy: full profile (all groups) saves and reads back identically.
- Required: missing legal name → 400; missing industry → 400; primary contact without email → 400.
- Boundary: legal name 160 chars OK, 161 → 400; notes 1000 OK, 1001 → 400.
- Invalid enum (industry "banana", size "huge", compliance ["iso9001"]) → 400.
- Invalid email / phone / website (`javascript:alert(1)`, `ftp://x`) → 400.
- Object-shaped value (`{"$gt":""}`) in any string field → 400.
- Unknown keys are dropped (not stored).

## Company profile authz
- company_admin GET + PATCH own profile → 200; employee GET 200, PATCH 403; client GET /company/profile → 403.
- super_admin create company WITH profile → 201 and profile stored; GET /admin/companies/:id → profile + counts; PATCH profile → 200.
- Audit: `company.profile_update`.

## Client (sub-account)
- Create with full profile + authorisation → 201; list shows industry, primary contact, authorisation state.
- GET /clients/:id → 200 own company; other company → 404; employee can create/edit (company-shared).
- PATCH status inactive → 200.
- Validation same as profile; authorisation.validUntil must be a valid date.

## Engagement scoping + authorisation rule
- Request on a client-owned domain whose client has NO authorisation → 409.
- Authorisation expired (validUntil yesterday) → 409; client inactive → 409.
- Valid authorisation → 201.
- Missing testType / environment / targetTypes / preferredStart / objective / emergency contact / authoriser → 400.
- Scoping fields stored and returned to super_admin engagement detail.

## Self-serve profile
- client GET/PATCH /auth/profile → 200; persisted; validation 400s apply.

## Dashboards
- super_admin /dashboard returns `ops` block: queue, pipeline, turnaround, tickets by priority, leads7d, tenantsAtRisk, onboardingGaps, securityEvents.
- company_admin /dashboard returns `clients` risk rows (incl. authorisation status), `pipeline`, `stale` domains, `expiringAuth`, `profile.completeness`.
- client /dashboard returns `pipeline` + `profile.completeness`; never another tenant's data.

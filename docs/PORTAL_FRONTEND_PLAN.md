# Portal frontend completion — plan & API contract (2026-10-18)

**Goal:** the portal is complete and polished from the user's side, and structured so that a backend developer can add or swap API endpoints in **one place** (`portal/src/services/`) without touching screens.

## 1. Scope (owner-approved items)

| # | Item | Frontend | Backend needed |
|---|---|---|---|
| 1 | Full report: description, evidence, fix, CWE/OWASP per finding, executive summary | ReportView rebuilt | — (data already in tenant view) |
| 2 | Report PDF | print-optimised report page → browser "Save as PDF" | — |
| 3 | Fix / accept-risk / reopen findings; request a retest of fixed findings | ReportView actions | **new:** `PATCH /engagements/:id/findings/:fid`, `POST /engagements/:id/retest` |
| 4 | API & integrations page is fake | real UI wired to `services/apiKeys.js`; shows "not available yet" until backend implements | **stub** `/company/api-keys` → 501 `NOT_IMPLEMENTED` (contract documented) |
| 5 | "PREVIEW" badge | removed | — |
| 6 | Tables cut off on phones | every table in a horizontal-scroll wrapper | — |
| 7 | Super-admin reports oversight | new `/admin/reports` page + same report view + PDF | — (uses `/admin/engagements?status=delivered`) |
| 10 | Social preview image | 1200×630 OG image + metadata | — |
| 11 | Analytics tag without an account | Plausible only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set | — |

**Also found in the audit (fixed in the same pass):**
- **Domains page bug:** it checked for the retired role `"corp"`, so company users never got client assignment.
- **Domain details can't be edited:** `PATCH /domains/:id` now also accepts label, env, criticality, contact, tags and notes.
- **Assets:** manual add in the UI, plus `DELETE /assets/:id`, plus a filter by domain.
- **Employees:** name and phone can be edited (`PATCH /company/employees/:id`).
- **Native `confirm/prompt/alert`:** replaced by styled dialogs.
- **No success feedback:** toast notifications for every create/update/delete.

## 2. Frontend architecture

```
portal/src/
  services/
    http.js          request(), ApiError {status, code}, isNotImplemented(), auth-error hook
    auth.js          login, register, verifyEmail, logout, me, forgotPassword, resetPassword, changePassword, profile
    dashboard.js     getDashboard
    domains.js       list, create, update, assignOwner, verify, remove
    assets.js        list, create, discover, remove
    clients.js       list, get, create, update
    company.js       profile, updateProfile, employees: list, invite, update, setStatus, resetPassword, remove
    engagements.js   list, get, request, cancel, setFindingState, requestRetest
    tickets.js       list, get, open, reply, setStatus (admin)
    apiKeys.js       list, create, revoke            ← backend pending (501 today)
    admin.js         stats, companies.*, users.*, engagements.*, leads.*, audit
  ui/ (in ui.jsx)    Toasts, Confirm/Prompt dialogs, TableWrap, Modal …
```

- Each service function has a JSDoc comment naming its endpoint, payload and response. **To add or change an API, edit only the service file.**
- Screens never build URLs themselves.
- When an endpoint returns **404 / 501** with `code: "NOT_IMPLEMENTED"`, the UI shows "Not available yet" instead of an error. This lets screens ship ahead of their backend.

## 3. New / changed API contract

| Method & path | Who | Body | Result |
|---|---|---|---|
| `PATCH /api/engagements/:id/findings/:fid` | tenant (own, delivered) | `{ state: "open"\|"fixed"\|"accepted_risk", note? }` | `{ finding }` |
| `POST /api/engagements/:id/retest` | tenant (own, delivered) | `{ findingIds: [..] }`: all must be `fixed` | `201 { engagement: {id, status, kind:"retest"} }` |
| `PATCH /api/domains/:id` | tenant | `{ label, env, criticality, contact, tags, notes }` (any subset) plus the existing owner fields | `{ domain }` |
| `DELETE /api/assets/:id` | tenant | — | `{ ok }`; 409 while an open scan targets the domain |
| `PATCH /api/company/employees/:id` | company_admin | `{ name?, phone?, status? }` | `{ employee }` |
| `GET/POST/DELETE /api/company/api-keys[/:id]` | company_admin | — | **501** `{ code: "NOT_IMPLEMENTED" }` until built |

**Retest rules:**
- A retest is a new engagement: `kind: "retest"`, `parentId`, `retestOf` (finding ids).
- Its targets are the hosts of those findings. Roe and scoping are copied from the parent.
- The usual request checks still apply:
  - domain verified within 90 days;
  - one open scan per domain;
  - client authorisation valid.
- It goes through the same operator queue.

**Posture:** dashboard severity counts and the posture score include only findings whose state is `open`. Fixed or accepted findings no longer count against the score.

## 4. Test spec
`tests/specs/portal-frontend.spec.md` (API parts are automated in `server/tests/findings.test.mjs`).

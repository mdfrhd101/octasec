# Test spec — portal completion (docs/PORTAL_FRONTEND_PLAN.md)

## API (server/tests/findings.test.mjs)

**Finding state**
- The tenant marks a delivered finding `fixed`, then `accepted_risk`, then `open`: 200 each time; the state and an audit entry are stored.
- An invalid state returns 400. Another tenant gets 404. An undelivered engagement returns 409.
- The dashboard's severity counts drop when a finding is marked `fixed`.

**Retest**
- A retest of fixed findings returns 201, with `kind: "retest"`, `parentId` set, targets equal to the findings' hosts and status `requested`.
- Rejected with 400:
  - a retest of a non-fixed finding;
  - an empty list;
  - an unknown finding id.
- A second retest while one is open returns 409 (one open scan per domain).
- The operator sees the retest in the queue.

**Domains**
- Editing label, env, criticality and tags returns 200 and the values persist.
- An invalid env or criticality returns 400.
- Another tenant gets 404.

**Assets**
- Deleting an asset returns 200.
- Deleting another tenant's asset returns 404.
- Deleting while a scan is open on the domain returns 409.

**Employees**
- company_admin edits name and phone: 200.
- An employee trying the same: 403.

**API keys**
- `GET /company/api-keys` returns 501 `NOT_IMPLEMENTED`.

## UI (browser QA, per role)

**Super admin**
- Overview: live refresh.
- Companies: create, view, edit profile, suspend/activate, delete (styled confirm).
- Users: filter, disable/enable, reset, delete.
- Engagements: assign, run, review (styled prompt for the reject reason), sign, reject.
- Reports: list, open, PDF.
- Tickets: reply, status.
- Leads: status.
- Audit: filter, search.

**Company admin**
- Dashboard.
- Employees: invite, edit, disable, reset, remove.
- Clients: create, edit, view.
- Domains:
  - add with an owner;
  - edit details;
  - assign;
  - verify;
  - remove.
- Assets: add, discover, filter, delete.
- Scans: request, cancel.
- Reports:
  - detail;
  - mark fixed / accepted / reopen;
  - retest;
  - PDF.
- Support.
- Organisation edit.
- API keys page: not-available state.

**Employee**
- Same as company admin minus Employees and API.

**Client**
- Dashboard, domains, assets, scans, reports (incl. fix/retest/PDF), support, organisation.

**Every role**
- Toasts on success and failure.
- Phone width (375 px): no clipped tables; the page never scrolls sideways.
- No console errors.

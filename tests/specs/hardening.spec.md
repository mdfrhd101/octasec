# Test spec — Phase H (bug fix & hardening)

Executable form: `server/tests/hardening.test.mjs` + `server/tests/support-client.test.mjs` (run with `npm test` in `server/`).

## H2.1 Cascade
- Happy: company with an engagement → delete company → engagement count for that company = 0.

## H3.1 / H3.2 Per-request re-check + revocation
- Deleted user's token → 401.
- Disabled user's existing token → 403 (ACCOUNT_DISABLED); login → 403; after re-enable the old token stays revoked (401).
- Re-enabled user can log in again (200).
- Suspended company: existing employee token → 403.
- Token issued before a password change → 401 (tv mismatch).
- Forged token with valid signature but unknown user id → 401.
- Token without `tv` (legacy) accepted only while the user's tokenVersion is 0.

## H3.3 Self password change
- Wrong current password → 400 (no change).
- New password < 8 chars → 400; same as current → 400.
- Success → 200 + new token works, old token 401, login with new password 200.

## H3.4 Admin reset
- super_admin reset of employee → 200, returns `tempPassword` (≥ 12 chars).
- Login with temp password → 200 and `user.mustChangePassword === true`.
- With that token: `/api/dashboard` → 403 `PASSWORD_CHANGE_REQUIRED`; `/api/auth/me` → 200.
- Change password → flag cleared, dashboard 200.
- super_admin reset of a super_admin or self → 400/404.
- company_admin reset of own employee → 200; of another company's user → 404; employee calling it → 403.

## H3.5 Disable / enable
- super_admin cannot disable self (400); cannot target a super_admin (404).
- company_admin disables own employee → that employee's token 403.
- Invalid status value → 400; bad ObjectId → 400.
- Audit entries exist for `user.disable`, `user.enable`, `user.password_reset`, `auth.password_change`.

## H4.1 Client support
- Client opens ticket → 201; lists only own tickets.
- Second client cannot view/reply to it → 404.
- Company admin cannot view it → 404; client cannot view a company ticket → 404.
- super_admin sees it with company label "Self-serve" and can reply → client sees the reply.
- Reply on closed ticket → 409.

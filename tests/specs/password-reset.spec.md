# Test spec — Forgot password (docs/EMAIL_AND_PASSWORD_RESET.md)

Executable: `server/tests/password-reset.test.mjs` (the runner points the dev mailer at a temp outbox file so the test can read the emailed link).

## Request
- Existing active user → 200 generic message; one email in the outbox to that address containing `/portal/reset-password?token=`.
- Unknown email → 200 with the *identical* body; no email sent.
- Malformed / object-shaped email → 200 identical body (no oracle), no email.
- Disabled user → 200 identical body; no email.
- 4th request for the same account within the hour → 200 identical; no 4th email.
- Token stored hashed: the raw token string never appears in the DB.

## Reset
- Valid token + good password → 200; login with new password 200; old password 401; old JWT 401.
- Same token again → 400 (single use).
- Issuing a new token invalidates the previous unused one → old token 400.
- Expired token (expiresAt in the past) → 400.
- Garbage / missing token → 400; object-shaped token → 400.
- New password < 8 or > 128 chars → 400 (token NOT burned — retry with a good password works).
- `mustChangePassword` is cleared by a reset.
- Audit has `auth.reset_request` and `auth.reset_complete`; no audit entry contains the token.

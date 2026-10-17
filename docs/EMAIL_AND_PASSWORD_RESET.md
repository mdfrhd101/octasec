# Email (SMTP) + Forgot Password — design & how to connect your mail server

**Date:** 2026-10-17 · Follows the OWASP *Forgot Password* and *Authentication* cheat sheets.

## 1. Flow

```
Login page → "Forgot password?" → enter email
   POST /api/auth/forgot-password { email }
   → ALWAYS the same 200 reply ("if an account exists, a link has been sent")
   → if the account exists and is active: one-time token emailed as
     https://<APP_URL>/portal/reset-password#token=<43-char random>   (fragment: never reaches a server log)
User clicks link → portal Reset page (token is removed from the address bar immediately)
   POST /api/auth/reset-password { token, newPassword }
   → password changed, every existing session signed out, token burned
   → user signs in with the new password
```

## 2. Security controls

| Threat | Control |
|---|---|
| Account enumeration | identical response + status whether or not the email exists, disabled, or throttled |
| Token guessing | 256-bit `crypto.randomBytes(32)`, base64url |
| DB leak exposes live tokens | only the **SHA-256 hash** is stored |
| Token replay | single use (`usedAt`); every older unused token for the user is invalidated when a new one is issued and when the password changes |
| Long-lived links | expires in **30 minutes**; MongoDB TTL index deletes expired rows |
| Mail-bombing a victim | max **3 reset emails per account per hour** (silently skipped beyond that) + per-IP auth rate limit (20 / 15 min) |
| Stolen session after reset | `tokenVersion` bump → all JWTs revoked |
| Token leaking via Referer / history | `Referrer-Policy: strict-origin-when-cross-origin` + page `no-referrer` meta; token stripped from URL with `history.replaceState` |
| Disabled user / suspended company | no email is sent (reply is still generic) |
| Weak new password | 8–128 chars; must differ from the email |
| Audit | `auth.reset_request` (only when a mail is sent), `auth.reset_complete` |

## 3. Data

`PasswordReset { userId, tokenHash (unique), expiresAt (TTL), usedAt, ip }`

## 4. Connecting your webmail / SMTP

Put these in `server/.env` (never commit it), then restart the API:

```ini
# Public base URL used in email links (no trailing slash)
APP_URL=https://octasec.ai

# Your webmail's SMTP settings (cPanel / Zoho / Google Workspace / Microsoft 365 …)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465            # 465 = implicit TLS, 587 = STARTTLS
SMTP_SECURE=true         # true for 465, false for 587 (STARTTLS is then REQUIRED)
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your-mailbox-password
MAIL_FROM="OctaSec <no-reply@yourdomain.com>"
```

Check the connection **before** relying on it:

```bash
cd server
npm run mail:test -- you@yourdomain.com
```

It verifies login + TLS with the SMTP server and sends one test email. TLS certificates are always
verified (never `rejectUnauthorized:false`). For best deliverability add **SPF**, **DKIM** and
**DMARC** DNS records for the sending domain (your mail host's panel shows the values).

**When SMTP is not configured** (local development): emails are not sent; the API prints the email
— including the reset link — to its own console so you can test the flow. In `NODE_ENV=production`
without SMTP the API logs a warning at boot and reset requests are logged as undeliverable
(the user still sees the generic reply).

## 5. Reuse

`utils/mailer.js → sendMail({ to, subject, text, html })` is the single mail gateway, so the
planned **email verification after registration** plugs into the same SMTP settings.

## 6. Same machinery, four link types (since the 2026-10-17 security assessment)
| Purpose | Sent when | Valid | Page |
|---|---|---|---|
| `reset` | user clicks "Forgot password?" | 30 min | /portal/reset-password |
| `admin_reset` | an admin resets a user (old password stops working) | 24 h | /portal/reset-password |
| `invite` | a company admin / employee account is created | 72 h | /portal/reset-password |
| `verify` | self-signup (account stays *pending* until used) | 24 h | /portal/verify-email |
All are 256-bit, SHA-256-stored, single-use, purpose-bound, max 3 per account per hour, and travel in the URL fragment.

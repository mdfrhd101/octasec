# Scan-engine integration guide

**Audience:** the developer connecting the real scanning backend (subdomain enumeration,
WhatWeb-style fingerprinting, the exploit/verification engine) to OctaSec.
**You do not need to touch the portal or the workflow.** Everything engine-related goes
through one module: `server/src/engine/`.

## 1. How it fits

```
Tenant (portal) ──request scan──▶ OctaSec API ──▶ Engagement (requested)
Super admin  ──assign──▶ (assigned) ──run──▶ engine.start(job) ─────────────┐
                                                                            ▼
                                                              YOUR SCAN ENGINE
                                                                            │
     ┌───────────── pull: POST /admin/engagements/:id/sync → engine.poll ◀──┤
     └───────────── push: engine → POST /api/engine/callback (HMAC-signed) ◀┘
Findings land UNVERIFIED ──▶ operator reviews ──▶ sign ──▶ delivered to tenant
```

* OctaSec owns: tenants, authorisation, scoping, the human gate (verify + sign), reports.
* The engine owns: discovering hosts, running tests, producing findings with evidence.
* A finding is **never** shown to a customer until a named operator signs it.

## 2. Switching from the mock to your engine

`server/.env`:

```ini
ENGINE_DRIVER=http                      # mock (default) | http
ENGINE_URL=https://engine.internal.example
ENGINE_API_KEY=<long random secret OctaSec sends to you>
ENGINE_WEBHOOK_SECRET=<long random secret you sign callbacks with>   # openssl rand -hex 32
# ENGINE_ALLOW_HTTP=true                # ONLY if the engine is on a private network without TLS
APP_URL=https://octasec.ai              # used to build callbackUrl
```

Restart the API. Run `npm test` in `server/` — `engine-http.test.mjs` exercises the same
driver against a fake engine, so it shows the exact requests your service will receive.

If you prefer another transport (queue, gRPC, a Python library…), add a driver file next to
`mock.js` / `http.js` exporting the same three functions and register it in `engine/index.js`
(`DRIVERS`). Nothing else in the API changes.

## 3. What your engine must expose (OctaSec → engine)

All requests carry `Authorization: Bearer <ENGINE_API_KEY>` and JSON bodies. Respond within
30 seconds — the driver aborts the whole request at a 30 s deadline (15 s socket idle) and
rejects bodies over 2 MB. Any non-2xx response, timeout, or invalid JSON surfaces to the
operator as `EngineUnavailable` (HTTP 502). Long work belongs in YOUR background job; the
endpoints below are control-plane only.

### `POST /v1/discover`

Request: `{"domain": "example.com"}` (the tenant's verified domain).

Response: `{"assets": [{"host": "www.example.com", "tech": ["nginx", "React"]}, ...]}`.

Assets pass through `normalizeAssets()`: each `host` must be the domain or a subdomain of
it (case-insensitive, valid hostname) — anything else is **silently dropped**, duplicates
are removed, at most 500 assets are kept, and each `tech` entry is trimmed to 40 chars
(max 10 per asset). Discovery is allowed to be noisy; the portal filters.

### `POST /v1/scans`

Request (built by `jobFor()` in `server/src/engine/index.js`, plus a `domainName` copy):

```json
{
  "engagementId": "665f…",
  "domain": "example.com",
  "domainName": "example.com",
  "targets": ["example.com", "api.example.com"],
  "roe": { "intensity": "safe|standard|aggressive", "window": "", "excludes": "" },
  "scoping": {
    "testType": "black|grey|white|", "environment": "…",
    "targetTypes": ["web"], "userRoles": 0, "apiDocsUrl": "",
    "wafInPlace": false, "maxRps": 0
  },
  "callbackUrl": "https://octasec.ai/api/engine/callback"
}
```

Response: must contain `jobId` (string, 1–120 chars — the driver throws otherwise) and
`state` (normally `"queued"`). You MAY answer synchronously with a terminal state and
`findings` (the mock driver does); `state` and `findings` are validated exactly like a
callback payload (§4). `GET /v1/scans/:jobId` must work from this point on.

### `GET /v1/scans/:jobId`

Response: `{"state": "queued|running|completed|failed", "progress": 0-100, "error": "…", "findings": […]}`.
`progress` is clamped to 0–100 and rounded; `error` is kept to 500 chars; `findings` is
optional at every state. States are **forward-only**: `queued → running → completed|failed`
— a poll or callback that tries to move backwards is rejected (409 on callbacks, ignored
on polls via `applyResult()`). `completed` and `failed` are terminal; once final, further
callbacks for that job get 409.

## 4. Finding/asset normalization contract

Everything the engine returns is untrusted input; `server/src/engine/normalize.js` is the
only path to the database, and it behaves differently for the two payload types:

- **Assets** (discover): noisy input expected — each out-of-scope or malformed asset is
  dropped individually; the valid remainder is used.
- **Findings** (scan start response, poll, callback): strict — `normalizeFindings()`
  **throws on the first bad finding and the entire payload is rejected** (400 on
  callbacks). Validate every finding engine-side before sending.

Per-finding rules (`normalizeFindings()`):

| field     | rule |
|---|---|
| `title`    | required string, trimmed, ≤ 200 chars |
| `severity` | required, one of `low` / `medium` / `high` / `critical` (lowercased) |
| `cvss`     | number 0–10 (default 0), rounded to 1 decimal |
| `host`     | required, ≤ 253 chars, lowercased — **must equal the engagement domain or be a subdomain of it**, else the whole batch fails |
| `owasp`    | string ≤ 80 chars |
| `cwe`      | string ≤ 20 chars (e.g. `CWE-79`) |
| `detail`   | string ≤ 5 000 chars |
| `fix`      | string ≤ 3 000 chars |
| `evidence` | string ≤ 10 000 chars |

Limits: at most 500 findings per scan. The portal **force-sets `verified: false`** on every
finding — nothing the engine says can mark a finding verified; that is exclusively the
human operator's signature. Send candidates with honest, reproducible evidence.

## 5. Engine → OctaSec callbacks (HMAC-signed)

Push progress and findings to the `callbackUrl` from the scan job:

```
POST <callbackUrl>
Content-Type: application/json
X-OctaSec-Timestamp: <unix seconds>
X-OctaSec-Signature: sha256=<hex HMAC-SHA256(ENGINE_WEBHOOK_SECRET, "<timestamp>.<raw body bytes>")>

{"jobId": "…", "state": "running", "progress": 40, "findings": [ … ]}
```

Verification (`verifySignature()` in `server/src/engine/index.js` + the route in
`server/src/routes/engineCallback.js`):

- The signature is computed over the **raw request body bytes** — sign exactly what you
  send, before any pretty-printing or re-serialization. The message is the ASCII string
  `"<timestamp>."` concatenated with the raw body.
- The timestamp must be 10 digits and within ±300 s of portal time
  (`CALLBACK_MAX_SKEW_S`) — keep engine and portal clocks synced.
- Replay/reordering defence: each event's timestamp must not be older than the last
  applied event for that job (`409 "Stale or replayed event"`). Use a monotonic per-job
  counter: `ts = max(now(), last_ts + 1)`.
- `jobId` ≤ 120 chars; the engagement must be `in_progress`; the state machine is
  forward-only (§3). `findings`, when present, must satisfy §4 in full or the callback
  is rejected with 400.
- Responses: `200 {"ok": true, "state": …}`; `400` bad body/findings; `401` bad or stale
  signature; `404` unknown jobId (or webhook disabled); `409` stale/final/state-going-backwards.
- The route is rate-limited to 120 req/min and disabled (404) until `ENGINE_WEBHOOK_SECRET`
  is set on the portal.

Worked Python example (engine side — sign exactly the bytes you POST):

```python
import hashlib, hmac, json, time, urllib.request

SECRET = "<ENGINE_WEBHOOK_SECRET>"          # shared with the portal
_last_ts = {}                                # per-job monotonic timestamps

def callback(callback_url, job_id, state, progress=None, findings=None):
    body = {"jobId": job_id, "state": state}
    if progress is not None:
        body["progress"] = int(progress)
    if findings is not None:
        body["findings"] = findings
    raw = json.dumps(body, separators=(",", ":")).encode()   # the exact bytes sent
    ts = max(int(time.time()), _last_ts.get(job_id, 0) + 1)  # never go backwards
    _last_ts[job_id] = ts
    sig = hmac.new(SECRET.encode(), f"{ts}.".encode() + raw, hashlib.sha256).hexdigest()
    req = urllib.request.Request(callback_url, data=raw, method="POST", headers={
        "Content-Type": "application/json",
        "X-OctaSec-Timestamp": str(ts),
        "X-OctaSec-Signature": f"sha256={sig}",
    })
    return urllib.request.urlopen(req, timeout=15).status   # 200 = applied
```

Reference implementation: the OctaSec scan-engine shim at `/root/bounty/engine/`
(`octasec_engine/callback.py`) signs with exactly this scheme; its `selftest.py` verifies
the round-trip against a mock receiver that re-checks the HMAC independently.
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
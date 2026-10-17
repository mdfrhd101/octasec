# OctaSec — deploy guide (Contabo VPS)

OctaSec is three apps on one domain, fronted by nginx + TLS:

| Path | App | Source | Build output | Runtime |
|------|-----|--------|--------------|---------|
| `/` | Marketing | `web/` (Next.js, static export) | `web/out/` | static files |
| `/portal/` | Customer portal | `portal/` (React/Vite) | `portal/dist/` | static files |
| `/api/` | Backend API | `server/` (Express) | — | Node + pm2, MongoDB |

Only the marketing + portal are static. The API is a Node process behind nginx;
MongoDB stores the data. `site/` + `build-site.js` are the superseded hand-built
static version — not deployed.

---

## 1. Build the two frontends (on your machine)

```bash
# marketing (Next.js static export)
cd web && npm install && npm run build       # → web/out/

# portal (React/Vite) — point it at the same-origin API
cd ../portal && npm install
VITE_API_URL=/api npm run build              # → portal/dist/
```

`VITE_API_URL=/api` makes the portal call the API same-origin (what the nginx
CSP `connect-src 'self'` expects). Omit it only for local dev (defaults to
`http://localhost:5050/api`).

---

## 2. One-time VPS setup (Ubuntu/Debian)

```bash
sudo apt update && sudo apt install -y nginx mongodb-org nodejs npm
sudo npm i -g pm2
sudo mkdir -p /var/www/octasec/web /var/www/octasec/portal
```

nginx:
```bash
sudo cp deploy/octasec-headers.conf /etc/nginx/snippets/octasec-headers.conf
sudo cp deploy/nginx.conf           /etc/nginx/sites-available/octasec
sudo ln -s /etc/nginx/sites-available/octasec /etc/nginx/sites-enabled/octasec
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

DNS — two A records to the VPS IP: `octasec.ai` and `www.octasec.ai`.

HTTPS (free, auto-renew):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d octasec.ai -d www.octasec.ai
```

---

## 3. Deploy the API (`server/`)

```bash
# copy server/ to the VPS (e.g. /opt/octasec-api), then:
cd /opt/octasec-api && npm ci --omit=dev
# create .env (NEVER commit it):
#   PORT=5050
#   HOST=127.0.0.1
#   NODE_ENV=production
#   MONGO_URI=mongodb://127.0.0.1:27017/octasec
#   JWT_SECRET=<openssl rand -hex 32>      # boot REJECTS placeholder values
#   JWT_EXPIRES=7d
#   CLIENT_ORIGIN=https://octasec.ai
pm2 start src/index.js --name octasec-api
pm2 save && pm2 startup
```

The API binds `127.0.0.1:5050` and is reachable only through the nginx `/api/`
proxy (which appends `X-Forwarded-For`, so the per-IP rate limiter sees real
client IPs). **Never** run `npm run seed` on the production DB — it refuses when
`NODE_ENV=production`, and it only creates weak demo accounts for local dev.

---

## 4. Upload the built frontends (each release)

```bash
rsync -av --delete web/out/     root@<vps-ip>:/var/www/octasec/web/
rsync -av --delete portal/dist/ root@<vps-ip>:/var/www/octasec/portal/
```
Static files are picked up instantly (no nginx reload needed). For an API code
change: redeploy `server/` and `pm2 reload octasec-api`.

---

## Security / ops notes
- **Secrets**: `.env` is gitignored and is NOT in any upload; the boot check
  rejects placeholder `JWT_SECRET` values. Rotate the secret if ever exposed.
- **Headers**: security headers live in `octasec-headers.conf` and are
  re-included in every nginx `location` (nginx `add_header` does not inherit).
  The portal sends a strict CSP. Hidden/`.map`/`.env`/`.bak` files are denied.
- **CORS**: the API allowlists `CLIENT_ORIGIN` only (fails closed).
- **Dependencies**: all current/patched. The only `npm audit` note is
  `esbuild` (a Vite **dev-server** dependency) — it does not ship in the
  production `vite build`, so it has no production exposure. Keep dev servers
  bound to localhost; optionally upgrade to Vite 6/7 later.
- **Analytics**: pages carry a Plausible tag (`data-domain="octasec.ai"`).
  Create the site in Plausible or remove the tag.
- **Email**: contact + security.txt use `hassan@octagramltd.com` /
  `security@octasec.ai`. Swap to real OctaSec addresses when mail routing is live.
- **Deferred (scheduled before admin features ship to customers)**: JWT role is
  stale until the 7-day token expires — add short access tokens + refresh, or a
  DB role re-check on admin/cross-tenant routes.

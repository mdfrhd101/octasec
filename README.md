# OctaSec

OctaSec is Octagram Limited's human-gated penetration-testing service. This repository holds three apps:

| App | Path | Stack |
|---|---|---|
| Marketing website | `web/` | Next.js (static export) |
| Customer + operator portal | `portal/` | React 18 + Vite, served at `/portal/` |
| Backend API | `server/` | Node.js, Express, MongoDB |

**Start with [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).** It covers:
- architecture
- local setup
- environment variables
- data model
- full API reference
- the engagement workflow
- where the scan engine plugs in
- testing and deployment

```bash
cd server && npm install && cp .env.example .env && npm run seed && npm start
cd server && npm test        # 19 suites against an isolated test database
```

Security: the security checklist for new code is in [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) §11. Report vulnerabilities to support@octasec.ai.
Deployment: see [`DEPLOY.md`](DEPLOY.md).

© 2026 Octagram Limited. Proprietary and confidential.

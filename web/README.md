# OctaSec marketing website

Production marketing site for **OctaSec** — Octagram Ltd's human-gated,
AI-orchestrated pentest service. Built with **Next.js (App Router)** and
configured for **static export**, so it builds to plain static HTML that any
web server (nginx) can serve with no Node runtime.

## Stack

- Next.js 15 (App Router) + React 19, TypeScript
- `output: "export"` static export → `out/`
- Design system ported from the hand-built static site (`../site/styles.css`),
  kept verbatim in `app/globals.css` (dark `#00080b` + gold `#e8c15a`, Chakra
  Petch + Share Tech Mono via Google Fonts)
- Client components for the motion layer: hero particle-network canvas, hero
  live-terminal typer, scroll reveals, card tilt/glow, magnetic buttons — all
  gated on `prefers-reduced-motion`.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000  (use 3001 if 3000 is busy: npm run dev -- -p 3001)
```

## Build (static export)

```bash
npm run build      # produces the static site in ./out
```

`out/` contains fully static HTML/CSS/JS (plus `sitemap.xml`, `robots.txt`,
`.well-known/security.txt`, `404.html`). No Node server is needed at runtime.

## Deploy (nginx)

Copy the contents of `out/` to the web root and serve as static files. The
export uses `trailingSlash: true`, so routes map to directories, e.g.
`/about/` → `out/about/index.html`. Example nginx location:

```nginx
server {
  listen 80;
  server_name octasec.ai;
  root /var/www/octasec/out;
  index index.html;

  location / {
    try_files $uri $uri/ $uri.html /404.html;
  }
}
```

The `/portal/` path (the separate React client/corporate portal app) is served
by its own deployment; nav "Sign in" links point at `/portal/`. `robots.txt`
disallows crawling `/portal/`.

## Structure

```
web/
  app/
    layout.tsx            # nav + footer + fonts + Plausible analytics + motion
    page.tsx              # home
    how-it-works/page.tsx
    services/page.tsx
    benchmarks/page.tsx
    faq/page.tsx
    about/page.tsx
    contact/page.tsx      # client form (static success note; no backend yet)
    legal/page.tsx
    not-found.tsx         # branded 404
    sitemap.ts            # /sitemap.xml
    icon.svg              # placeholder octagon + gold check favicon
    globals.css           # ported design system
    components/           # Nav, Footer, Hero, SectionHead, Card, EyebrowBadge,
                          # DifferentiatorTable, FaqAccordion, HeroTerminal,
                          # NetworkCanvas, FinalCTA, ScopeCTA, PageHero,
                          # ContactForm, SiteMotion
  public/
    robots.txt
    .well-known/security.txt
  next.config.mjs         # output: "export"
```

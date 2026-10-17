# OctaSec — Website Sitemap (modeled on XBOW, minus their own content)

**Date:** 2026-10-08
**Rule applied:** Build the same *set of pages* XBOW has, but **drop everything that is purely XBOW's own content** — customer reviews/testimonials, customer stories, and their specific borrowed-trust claims (HackerOne #1, Moderna quotes, etc.). Replace that borrowed trust with **our own verifiable evidence**.

---

## 1. XBOW's full page inventory (what we audited)

**Top navigation**
- **Platform** → `/platform`, `/platform/autonomous-exposure-management`
- **Pricing** → `/pricing`
- **Resources** → `/resource-center`, `/briefs`, `/whitepapers`, `/webinars`, `/advisories`, `/videos`, `/podcasts`, `/customer-stories`, `/documentation`
- **Blog** → `/blog`
- **Company** → `/about`, `/leadership`, `/news`, `/events`, `/careers`
- **CTA** → `/demo` ("Get a Demo")

**Footer (standard legal/trust set):** Privacy Policy, Legal Notice/Terms, Trust/Security, security.txt, Responsible Disclosure, social.

---

## 2. XBOW → OctaSec page mapping

| XBOW page | OctaSec | Action | Why |
|---|---|---|---|
| `/` Home | `/` Home | **Keep** | Same hero→proof→how→trust→CTA flow (testimonial section removed, see §4) |
| `/platform` | `/platform` | **Keep** | Product overview |
| `/platform/autonomous-exposure-management` | `/platform/continuous-exposure` | **Keep** | Continuous testing story |
| — | `/platform/guardrails` | **ADD** | Our #1 trust differentiator deserves its own page (XBOW buries it) |
| (folded into platform) | `/how-it-works` | **ADD/promote** | Scope→Recon→Chain→Prove→Report, shown with the attack-path animation |
| `/pricing` | `/pricing` | **Keep + improve** | Transparent per-test tier vs their quote-only wall |
| `/resource-center` | `/resources` | **Keep** | Hub |
| `/whitepapers` | `/whitepapers` | **Keep** | Credibility content |
| `/briefs` | `/briefs` | **Keep (later)** | One-pagers; populate over time |
| `/advisories` | `/advisories` | **Keep** | Security advisories *we* publish — strong for a sec company |
| `/videos` | `/videos` | **Keep (later)** | Demos/explainers |
| `/webinars` | `/webinars` | **Later/optional** | Needs content; hide until we have any |
| `/podcasts` | — | **DROP** | Pure own-content, none yet |
| `/documentation` | `/docs` | **Keep** | API + product docs (trust signal) |
| `/customer-stories` | — | **DROP** | **Their customers' content** — we don't have these, and faking = instant distrust |
| `/blog` | `/blog` | **Keep** | |
| `/about` | `/about` | **Keep** | Octagram story |
| `/leadership` | `/team` | **Keep** | Real founders/team + certs = *our* credibility (replaces borrowed logos) |
| `/news` | `/news` | **Later/optional** | Add when there's press |
| `/events` | `/events` | **Later/optional** | Add when we have any |
| `/careers` | `/careers` | **Keep** | Signals a real, growing company |
| `/demo` | `/demo` ("Get a Demo / Start a Scan") | **Keep** | Primary CTA |
| footer: Privacy/Terms/Security | same | **Keep** | |
| — | `/trust` (Trust & Security Center) | **ADD** | Compliance posture, security.txt, responsible disclosure, data-handling, on-prem/offline |
| — | `/sample-report` | **ADD** | Downloadable **redacted real report** — the evidence XBOW only describes |
| — | `/methodology` | **ADD** | OWASP Top10 / WSTG / API Top10 mapping + non-destructive rules |

---

## 3. Final OctaSec sitemap (clean)

```
/                         Home
/platform                 Platform overview
  /platform/continuous-exposure
  /platform/guardrails          ← trust differentiator
/how-it-works              Scope → Recon → Chain → Prove → Report
/pricing                   Transparent tiers
/trust                     Trust & Security Center   ← NEW, key
  /sample-report              downloadable redacted report
  /methodology                OWASP/WSTG/API mapping
  security.txt / responsible-disclosure
/resources                 Hub
  /whitepapers
  /briefs
  /advisories                 our published security advisories
  /videos
  /docs                       product + API documentation
/blog
/company
  /about
  /team                       founders + certs (our credibility)
  /careers
/demo                      Get a Demo / Start a Scan  ← primary CTA

Footer: Contact · Privacy Policy · Terms/Legal · Trust Center ·
        security.txt · Responsible Disclosure · Status · Bangla toggle · social

Later/optional (ship empty-safe, enable when content exists):
  /webinars · /news · /events
Dropped (XBOW own-content): /customer-stories · /podcasts
```

---

## 4. Homepage sections — what changes vs XBOW

Same skeleton, but the **testimonial wall and borrowed-stats are replaced by our own evidence:**

1. Hero + one-line thesis + dual CTA (**Get a Demo** + **See a Sample Report**)
2. **Proof strip** — only *our* verifiable numbers (OWASP benchmark score, verified-finding rate, false-positive rate). ❌ No "HackerOne #1 / 14,000 zero-days" — that's XBOW's, not ours.
3. How it works (attack-path animation)
4. **Guardrails** — "Full autonomy, you stay in control" (on-prem/offline) ← our trust win
5. **Real Finding Trace** — redacted sample on-page
6. Why OctaSec — offline/privacy-first · SME pricing · BD/South-Asia + compliance
7. Trust & compliance band (OWASP/WSTG, SOC2/ISO posture, Bangladesh Bank ICT, security.txt)
8. Team/credibility (real faces + certs)  ← **replaces XBOW's customer quotes**
9. Pricing teaser
10. Footer CTA

> ❌ **Removed entirely:** the "Trusted by 150+ Security Teams" testimonial carousel and all named-customer quotes. For a new company these can't be real, and empty/fake social proof destroys trust faster than having none. We lead with *evidence we can prove* instead.

---

## 5. Build order suggestion
1. Home + Platform + How-it-works + Guardrails + Trust/Sample-report (the trust-critical core)
2. Pricing + Demo + Docs
3. Resources (whitepapers/advisories/blog) + Company (about/team/careers)
4. Later: webinars/news/events as content appears

Next: I can produce a **live landing-page prototype** of the Home page (Option A "trusted dark" look from OCTASEC_WEBSITE_BRIEF.md) so you can see it before full build.

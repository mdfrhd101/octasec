# OctaSec — Website Design & Trust Brief

**Goal:** A marketing site for OctaSec (Octagram's autonomous web-app + API pentesting platform) that is **more beautiful AND more trustworthy than xbow.com**.
**Date:** 2026-10-08
**Design constraints (house style):** 2–3 colors only, minimal icons, a non-Inter typeface, mobile-first, clean/simple over flashy.

---

## 1. XBOW website teardown (what we're beating)

**Visual language**
- **Palette:** near-black background (#0A0A0A) + one electric **lime-green** accent (~#C4F82A) + white/grey text. Essentially a 2-color system. This is their whole identity — it reads "terminal / hacker / high-voltage."
- **Typography:** two faces — a clean grotesk sans for body, and a **monospace-style display** for giant numbers and headlines ("Security Teams Don't Need More Findings. They Need Proof."). The mono gives the "code/hacker" signal.
- **Signature motion:** animated hero ("**Anyone Can Claim to Be the Best AI Hacker. Only XBOW Can Prove It**" — words blur/resolve in), and a scroll-built **attack-path diagram** (a glowing green line descending from a "Target Application" node). Floating white pill navbar on dark.

**Page structure (homepage)**
1. Hero + one-line claim + "Get a Demo"
2. **3 proof stats** — `#1 HackerOne` · `1st Autonomous System (MSRC)` · `14,000+ Zero Days` (big mono numbers in cards)
3. "They need proof" — the core thesis + animated attack path
4. Three value props: *Creative Discovery / Real Proof*, *Full Autonomy Governed for Production*, *Proven in the Open*
5. "Depth, Trust, Scale" — The Attacks Others Miss / Proof Not Noise / Coverage Without Headcount
6. **Finding Trace** — "every finding is a complete case file"
7. **Testimonial wall** — Moderna Deputy CISO, a top-5 US bank CISO, Superhuman, Seznam, etc.
8. Footer CTA: "Can XBOW Hack Your App? → Get a Demo"

**Why it's effective**
- Single sharp thesis repeated everywhere: **proof > findings**.
- Trust is *borrowed* from heavyweight names + public benchmarks (HackerOne #1, a critical Microsoft CVE).
- Governance/compliance addressed head-on (SOC 2, ISO 27001, PCI DSS, NIS 2) — kills the "autonomous = reckless" objection.
- One idea, one accent color, lots of black space = feels confident and premium.

**Weak spots we can beat**
- Very dark + mono can feel cold/intimidating and samey (every AI-sec startup now uses dark + neon green).
- Trust rests almost entirely on *name-dropping*; a buyer who doesn't know those names gets little **verifiable** evidence (no public sample report, no open methodology, no live benchmark on the homepage).
- Little transparency about *how* it stays safe (guardrails are asserted, not shown).
- No regional/compliance nuance outside US/EU enterprise.

---

## 2. OctaSec positioning — how we out-trust them

We are new and can't borrow Fortune-500 logos yet. So we win trust a **different, harder-to-fake way: transparency and evidence.** This is also our differentiation wedge (offline/privacy-first, SME-affordable, BD/South-Asia).

Trust pillars for the site:
1. **Show, don't claim.** Put a **real, redacted sample report / finding trace** on the site, downloadable. XBOW only describes theirs.
2. **Open methodology.** A public page mapping our tests to OWASP Top 10 / WSTG / API Top 10 + our non-destructive-by-default rules. Auditors love this.
3. **Guardrails made visible.** An explicit "How we stay safe" section: ownership verification, scope contract, kill-switch, immutable audit log, data never leaves your premises (on-prem/offline mode). This is our *strongest* trust lever vs XBOW.
4. **Verifiable track record, honestly staged.** Live counters only for things we can prove (e.g., "N apps tested in our lab", OWASP benchmark score). No inflated numbers. A public benchmark page (Juice Shop/DVWA results) beats borrowed logos.
5. **Human credibility.** Real Octagram team/founder bios, certs (OSCP/CEH/etc. as earned), a security.txt, responsible-disclosure policy, and our own posture (how *we* secure OctaSec).
6. **Compliance localization.** SOC2/ISO 27001 posture **plus** Bangladesh Bank ICT Security Guidelines + data-residency — nobody else speaks to BD/regulated South-Asia buyers.

Tagline candidates (one-thesis, like XBOW's "proof"):
- "**Autonomous offense. Total control.**"
- "**Proof you can audit. Pentesting you can trust.**"
- "**Your attack surface, tested every day — on your terms, on your premises.**"

---

## 3. OctaSec visual direction (beats "dark + neon green")

Respecting the house style (2–3 colors, minimal icons, non-Inter, mobile-first) and deliberately *not* copying XBOW's look:

**Option A — "Trusted dark" (recommended)**
- **Palette (3):** deep ink navy `#0B1220` (not pure black — warmer, more premium/trusted) + **Octagram brand accent** (pick ONE: a confident teal `#17B8A6` or a security-blue `#3B82F6`) + off-white `#F5F7FA`. Optional 4th: a muted amber only for "finding severity." Avoids the cliché neon-green.
- Feels like a bank-grade security vendor, not a CTF tool → signals *trust* over *edginess*.

**Option B — "Clean light"**
- Off-white background, ink text, one brand accent. Rare in this space (everyone is dark) → instantly differentiated, feels transparent/honest. Pair dark only for the "attack path" demo section.

**Typography (non-Inter):**
- Display: a geometric/grotesk with character — **Space Grotesk**, **Satoshi**, or **General Sans**.
- Body: **IBM Plex Sans** (security heritage) or **Hanken Grotesk**.
- Accent/mono (for finding traces, code, numbers): **JetBrains Mono** or **IBM Plex Mono** — keep mono *scoped* to evidence, not the whole site (less cold than XBOW).
- Bangla pairing: **Hind Siliguri** / **Noto Sans Bengali** for a true BD-localized toggle.

**Motion (restrained, purposeful):**
- One signature hero visual: an **animated attack-path graph** that assembles a chain (recon → vuln → chained exploit → proof) — our equivalent of XBOW's green line, but in brand color and clearer. Keep everything else calm (subtle fades on scroll). Our memory note says *simple* — so one hero animation, not a carnival.
- Mobile-first: the attack-path collapses to a clean vertical stepper on phones.

**Icons:** minimal, single-weight line set, used sparingly (house style).

---

## 4. Recommended sitemap & homepage structure

**Nav:** Platform · How it works · Pricing · Trust/Security · Resources · Company · **[Get a Demo / Start a Scan]**

**Homepage sections (improves on XBOW's order):**
1. **Hero** — one-line thesis + dual CTA: "Get a Demo" **and** "See a Sample Report" (evidence up front — XBOW doesn't).
2. **Proof strip** — only verifiable stats (OWASP benchmark score, verified-finding rate, false-positive rate). Honest > inflated.
3. **How it works** — animated attack-path (Scope → Recon → Chain → Prove → Report). Our hero differentiator shown, not told.
4. **The guardrails section** — "Full autonomy, you stay in control" (ownership check, scope, kill-switch, audit log, **on-prem/offline mode**). *This is where we beat XBOW on trust.*
5. **A real Finding Trace** — expandable/downloadable redacted sample (attack path + PoC + remediation).
6. **Why OctaSec** — Offline/privacy-first · SME-affordable transparent pricing · BD/South-Asia + compliance.
7. **Trust & compliance band** — OWASP/WSTG mapping, SOC2/ISO posture, Bangladesh Bank ICT, security.txt, responsible disclosure.
8. **Team/credibility** — real faces + certs (trust that logos can't fake for a newcomer).
9. **Pricing teaser** — transparent per-test entry (vs XBOW's quote-only wall).
10. **Footer CTA** — "Can OctaSec break your app before an attacker does? → Start a scan."

---

## 5. "More beautiful + more trusted than XBOW" — the checklist

| Dimension | XBOW | OctaSec target |
|---|---|---|
| Color | dark + neon green (cliché) | warm ink navy + one brand accent (bank-grade, distinct) |
| Trust basis | borrowed enterprise logos | **verifiable evidence** (sample report, open methodology, benchmark) |
| Safety | asserted | **shown** (visible guardrails, on-prem/offline) |
| Pricing | quote-only wall | transparent per-test entry |
| Region | US/EU | **+ BD/South-Asia + Bangla + BB compliance** |
| Report | described | **real redacted sample on-site** |
| Tone | edgy/intimidating | confident + transparent + approachable |
| Motion | heavy dark animation | one clean signature + calm, mobile-first |

If we deliver evidence + visible guardrails + transparent pricing + a cleaner non-cliché look, the site is both prettier and *more credible* to a buyer who doesn't already know us — which is most of our market.

---

## 6. Next steps (pick one to start)
1. **Lock the look** — I build a 1-page visual mockup / live landing-page prototype (Option A or B) so you can see OctaSec's hero + attack-path animation before committing.
2. **Write the copy** — full homepage copy (EN + Bangla) in the one-thesis style.
3. **Design system first** — colors, type scale, components, logo direction for OctaSec.

> Dependency: the product's **scope/authorization + audit** design (from MARKET_RESEARCH.md §7) should inform the "guardrails" section — the site's biggest trust asset mirrors a real product capability, not marketing.

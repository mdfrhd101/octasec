# Landing page design v2 (2026-10-18)

**Owner request:** octagramltd.com feels premium and alive; the OctaSec landing page feels flat. Upgrade it in the same family — **not a copy**.

## 1. What makes octagramltd.com work (studied live)

| Technique | How they do it | Take for OctaSec? |
|---|---|---|
| Hero object | A glowing gold octagon ring with particle dust and outline octagons behind it. Canvas. | **Yes, our own version.** The Facet-Seal mark becomes a live "scanner": rotating rings, a sweep beam, and findings that pulse then turn **verified** (green). It tells *our* story: AI finds, a human verifies. |
| Two-tone giant headline | A thin "EXPECT" over a bold gold-gradient "EXCELLENCE". Big sans type. | **Yes.** A light line ("Enterprise-grade pentesting.") over a bold gold-gradient line ("Startup-grade pricing."), left-aligned at 2× the current size. |
| Pinned chapters | A sticky section with one huge hatched word per step (CHARGE / HOLD), a ghost number and a colour shift. | **Yes, as our method.** SCOPE → MAP → HUNT → PROVE: a sticky stage whose hatched word, ghost numeral, copy and progress rail are driven by scroll. |
| Glass cards with watermark | Translucent cards, a huge faint word behind them, chips. | **Yes**, for the three pillars. |
| Count-up stats | 8+ / 7 / 6 / 100 %. | **Yes.** 104 benchmark apps · 90+ modules · 100 % human-verified · 0 auto-submitted. |
| Smooth scroll | Lenis. | **Yes.** Lenis 1.3.26; off under reduced motion. |
| Radar, hooded-hacker art, product carousel, team | — | **No.** Too close to Octagram, or not relevant to the product. |

## 2. Identity (stays distinct from Octagram)

- **Background:** Octagram is warm black #050505. OctaSec stays **cool blue-black #00080b**.
- **Colours (3):**
  - gold gradient: primary;
  - verified-green #45e0a8: the "human-verified" signal only;
  - text white/grey.
- **Type:**
  - Display: **Space Grotesk**. Octagram uses Plus Jakarta Sans; ours is technical and not Inter.
  - Labels: Share Tech Mono, used only for eyebrows, chips and terminal text. Today mono is everywhere and makes the page feel dense.
- **Nav:** dark glass with blur, instead of the white pill, so it sits in the scene.

## 3. Page structure (tension → release)

1. **Hero:**
   - left: eyebrow, two-tone headline, sub-copy, CTAs;
   - right: the seal scanner canvas;
   - the existing live terminal stays as a card under the hero.
2. **Proof stats:** a count-up strip (replaces the "Proof" text bar).
3. **The problem:** a big statement line with scroll-revealed words.
4. **Pillars:** 3 glass cards with the watermark word "PROOF".
5. **Method:** a pinned chapter stage, Scope / Map / Hunt / Prove.
6. **Pricing anchor**, then the differentiator table, then the final CTA (kept; restyled by tokens).

## 4. Motion tokens and rules

| Token | Value |
|---|---|
| Durations | 0.5 s entrance · 0.9 s headline · scrub tied to scroll |
| Easing | `cubic-bezier(.16,1,.3,1)` (expo-out) for entrances; linear for scrub |
| Stagger | 60 ms |

**Rules:**
- Animate only `transform` and `opacity`. The canvas runs at DPR ≤ 2 (≤ 1.5 on phones) and pauses when off-screen or when the tab is hidden.
- `prefers-reduced-motion`: no Lenis, no sweep or rotation (a static seal is drawn once), no scrub movement; the chapters become a normal list. Content is fully visible without JS.
- No new third-party runtime hosts: Lenis is bundled; fonts come from Google Fonts (already allowed by the CSP).

## 5. Acceptance

**Layout:**
- Desktop 1280 and phone 375: no horizontal overflow.
- The pinned stage works on both; on a phone it becomes a stacked list.

**Reduced motion:**
- Content is visible and the page does not scroll-jack.

**Speed:**
- Lighthouse-style sanity: the hero canvas costs under 2 ms/frame on desktop.
- JS added stays under 20 KB gzip.

**Regression:**
- The quote modal still locks scroll (Lenis stop/start).
- Anchors still work.
- The other pages are unchanged apart from the shared nav and type tokens.

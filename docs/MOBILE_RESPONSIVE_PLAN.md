# OctaSec — Mobile Responsiveness Plan

**Status:** phases 1–2 implemented on 2026-10-25, plus parts of phases 3–4 (see "Implementation status" below).
**Date:** 2026-10-25

### Implementation status (2026-10-25)

All of it is in `web/app/mobile.css`, loaded last; removing its import in `layout.tsx` reverts every rule. It comes with small component changes.

**Done:**
- **The 9 broken items (§2):** everything except #5's parallax, which is still open.
- **Announcement bar:** one line on phones.
- **Hero order on phones:** title → octagon (200px) → text → buttons, as the owner asked.
- **Proof strip:** compact 2×2.
- **Terminal:** a fixed 5-row window with phone-length lines.
- **Pillars:** an auto-sliding, swipeable carousel (`AutoSlider.tsx`).
- **How it works:** a stories-style stepper on phones and tablets.
- **Comparison table:** two-line rows on phones.
- **Footer:** two columns.
- **Mobile menu:** the backdrop, CTA fix, Esc key, focus trap and `inert`.
- **Floating button:** icon-only, safe-area aware, hidden near the footer and on /website-check.
- **Inner pages:** a left-aligned page hero, stacked full-width CTAs, 44px targets, 16px inputs and the tablet 2-column grids.
- **Robustness:**
  - the Reduce Motion fix;
  - a single viewport tag;
  - touch-only hover suppression (the `touch-input` class);
  - the footer `overflow:clip`.

**Verified:**
- No horizontal overflow on any of the 13 routes at 320, 375 and 768px.
- No text under 13.5px, except the intentionally small labels.
- No tap target under 40px outside running text.
- Desktop at 1280px unchanged.

**Open:**
- Nav hide-on-scroll.
- Lenis off on touch, and the anchor offset.
- Pausing the canvases when off-screen.
- Section-head parallax off on phones.
- A lighter hero glow on phones.
- `background-attachment:fixed` off on phones.
- Collapsible Benchmarks sections.
- Edge-fade on blog tables.
- A 2-column tablet hero.
**Scope:** the marketing site (`web/`), all 13 routes. The portal is out of scope.

**How this was produced:**
- Every page was rendered with touch emulation at 320, 375, 768 and 667×375 (landscape).
- Computed layout was measured: overflow, tap-target sizes, grid columns, text alignment and font sizes.
- Every media query and every piece of JS-driven responsive behaviour was inventoried.

File references use `web/app/…:line`. Abbreviations: G = `globals.css`, L = `landing-v2.css`, H = `hover-interactive.css`, P = `polish.css`.

---

## 1. Verdict

The site rarely *breaks* on a phone. It is a desktop design compressed onto a phone, though.
- Nine things are actually broken (§2).
- About fifteen more look unfinished (§3).
- The tablet range (600–899px) was never designed (§4).

The fix is a mobile layer composed for the phone, not more shrinking.

---

## 2. Broken — fix first

| # | Problem | Where | Evidence |
|---|---|---|---|
| 1 | **The page scrolls sideways at 320px.** The giant "pillars" watermark is 374px wide on a 310px screen. | Home | measured: scrollWidth 354 > 310 |
| 2 | **The comparison table can't fit.** Four columns of 54–91px at 375px. The header labels run together ("SCANNER TRADITIONAL OCTASEC"), cells wrap mid-phrase, the OctaSec column is clipped, and at 320px it pokes past the edge. It never stacks or scrolls (G:200, G:257). | Home, How it works | grid columns `[82,58,58,58]` |
| 3 | **The floating "Free website check" button covers content:** pillar text, chips, table values, the copyright line. In landscape (and anywhere from 601 to 900px) the full pill sits over the headline. It also sits above the open menu (z 85 vs 60) and ignores safe areas. | All pages | screenshots; L:310–319 |
| 4 | **The mobile menu is a small panel with no backdrop**, so the page shows through underneath. More issues: <ul><li>The CTA renders as **dark text on the red button, left-aligned**: the specificity bug `.mobile-panel a` (L:198) beats `.btn`.</li><li>Links stay keyboard-focusable when the menu is closed.</li><li>No Esc key, no focus trap, no close on outside tap.</li><li>"Sign in" appears twice.</li></ul> | All pages | computed colour `#121A20` on the red gradient |
| 5 | **Desktop-only effects run on phones.** <ul><li>The cursor ring is created and parks at the last tap.</li><li>The green hover-fill sticks on tapped cards: tapping "Get a quote" turns the whole pricing card green.</li><li>The 3D tilt and magnetic buttons react to touch drags.</li></ul> | All pages | CursorFX.tsx:15–20; H:64–85; SiteMotion.tsx:89–127 |
| 6 | **iOS zooms in when the user taps the URL inputs.** They are 14px; iOS needs at least 16px. | /website-check, /php2shell | measured 14px (G:588, G:595) |
| 7 | **With "Reduce Motion" on, every revealed section is stuck 32px lower.** `.rv{translateY(32px)}` (G:362) is unconditional; its reset exists only for motion-OK users (G:68). | All pages | code verified |
| 8 | **On touch screens of 900px and wider (iPad landscape, Surface), "Services" and "About" open and then instantly close.** `onMouseEnter` opens the menu, then `onClick` toggles it shut. | Nav | Nav.tsx:72–80 |
| 9 | **Two viewport meta tags:** the hand-written one in layout.tsx plus Next's default. | All pages | DOM verified |

---

## 3. Looks unfinished on phones

**Hero and top of page**
- **The octagon (your note):** it is a 300×300 canvas placed after both CTAs, so it takes a full screen on its own after the hero.
  - Its legend is 12.5px, `nowrap`, inside a 300px box.
  - The animation rebuilds gradients and draws 70 particles every frame. It also responds to touch drags and never re-checks "phone" on rotate (SealScanner.tsx:40, 47, 207–231).
- **Announcement bar:** 135px tall, 4 lines of mono text, with the arrow alone on a 5th line. In landscape, bar + nav ≈ 140px of a 375px-tall screen.
- **Headline** breaks as "Startup‑ / grade pricing."
- **CTAs:** the hero buttons have unequal widths, and the pricing-card buttons are left-aligned and uneven.
- **Terminal mockup:** it wraps commands mid-line (`--target` / `app.yourco.com`). The box grows while typing and collapses each loop, so **the content below it jumps** (G:311–312, HeroTerminal.tsx:45–85).

**Text and labels**
- **Long centred text:** page intros are centred across 5–8 lines on 9 pages. Benchmarks alone has 7 long centred blocks.
- **Eyebrows wrap inside their box,** e.g. "PROOF · PUBLIC & PRIVATE / SUITES".
- **Proof-strip labels split badly:** "HUMAN‑ / VERIFIED", "AUTO‑ / SUBMITTED".

**Touch and spacing**
- **Tap targets under 44px on every page:**
  - logo 26px, "Sign in" 24px, theme/menu buttons 38px;
  - footer links 24px (×12), copyright links 20px;
  - inline "→" links 24px (×6 on Services);
  - share buttons 37px, back link 26px, quote-modal close 34px;
  - inline links 18–21px.
- **Footer:** one long single column of ~12 links at ≤560px.
- **Gutters:** 24px on every phone, because P:26 overrides the 16px mobile rule. That's tight at 320px.

**Length**
- **Page lengths on a phone:** home 8,900px, Benchmarks 10,400px, a blog post 13,600px.
- **Pillars:** three tall stacked cards take about 1,100px.

---

## 4. Tablet (600–899px) was never designed

- Services, Pricing and the pillars jump straight from 3 columns to 1 at 900px, which leaves single cards 710px wide at 768px.
- The floating button shows its full text label from 601 to 900px.
- The hero stays single-column with the octagon below the copy.
- 900px is used as both a `max` and a `min` breakpoint, so at exactly 900px the drawer and the pinned chapters both apply.
- The pinned chapters use `100vh`, which jumps with the mobile URL bar.

---

## 5. Already works (keep)

- No sideways scroll at 360–430px (the 320px case is in §2).
- Text is 13.5px or larger everywhere (after the 2026-10-25 pass).
- Contact form: 47px inputs, 16px text, a full-width 50px submit, and a properly hidden honeypot.
- The about-page agency grid (2×2).
- FAQ rows are about 66px tall and wrap long code.
- The benchmark tables are readable at 375px.
- The stacked "How it works" chapters read well.
- The sticky nav respects the top safe area.

---

## 6. Design direction — "stunning on mobile"

1. **Phone-first composition, not a shrunk desktop.** One idea per screen: emblem → headline → proof → action.
2. **Thumb zone.** Primary actions are full-width, 52px tall and centred. Nothing important sits under the floating button.
3. **Calm chrome.** A one-line announcement bar and a nav that gets out of the way while scrolling.
4. **Swipe where content is parallel** (pillars); **stack where it's sequential** (method, FAQ, pricing).
5. **Tap feedback instead of hover:** press states, and no sticky hovers.
6. **Native-feeling motion:** native momentum scroll, short vertical reveals, and animations that pause off-screen.

---

## 7. Foundations (site-wide rules)

### 7.1 Breakpoints — consolidate 9 into 3 tiers plus 2 modifiers
Today the site uses max-width 390, 480, 560, 600, 640, 760, 820, 900 and 1024, plus min-width 900.

| Tier | Range | Intent |
|---|---|---|
| Phone | ≤ 599px | single column, mobile chrome |
| Tablet | 600–899px | 2-column grids, drawer nav, compact chrome |
| Desktop | ≥ 900px | the current design (the nav switch stays at 900) |
| *Small phone* | ≤ 360px | 16px gutters, slightly smaller display type |
| *Landscape phone* | `(orientation:landscape) and (max-height:500px)` | minimal chrome, icon-only floating button |

The existing 390/480/560/640/760/820 rules map onto these tiers. The 900px overlap is fixed by making the mobile rules `max-width:899.98px`.

### 7.2 Type on phones

| Element | Now | Proposed |
|---|---|---|
| Hero H1 | 36.8 / 40px, breaks "Startup‑ / grade" | ~36px, `text-wrap:balance`, non-breaking hyphens ("Startup‑grade", "Enterprise‑grade") |
| Page H1 | 33.6px | 32px, balanced |
| Section H2 | 30–32px | 28px, balanced |
| Body | 16.5px | 16.5px (keep) |
| Labels/eyebrows | 13.5px, .2em tracking | 13.5px (keep the floor), .1em tracking on phones |
| Hatch words (SCOPE…) | 58–64px | 56px |

### 7.3 Spacing
- **Gutters:** 20px on phones, 16px at ≤360px. This fixes P:26 overriding L:220.
- **Section padding:** 56px on phones and 40px on small phones. Today it varies between 26 and 89px.
- **Page-hero top padding:** 89px → 48px.
- **Card padding:** 20px. **Stack gaps:** 12–16px.

### 7.4 Touch
- Every interactive element is at least 44×44px. Inline text links get a padded hit area, and footer rows are 44px.
- `touch-action:manipulation` on buttons and links, which removes the double-tap delay.
- Press states (`:active`): a slight scale plus a tint on cards and buttons.
- **No sticky hovers on touch.** A small script tags `<html>` with the *last-used input type* (`pointerType` mouse/pen vs touch), and hover effects are scoped to mouse input.
  - We don't use `@media (hover:hover)` because the owner's Surface reports a coarse pointer, and that query would switch its hover effects off.
  - With this approach, a mouse or trackpad keeps every hover effect, and touch never gets stuck states.
- The cursor ring responds to mouse and pen only.

### 7.5 Viewport and safe areas
- A single viewport tag, using Next's `export const viewport` and removing the hand-written meta.
- `env(safe-area-inset-*)` for the floating button, the menu sheet, the footer and landscape gutters.
- `100svh` / `100dvh` instead of `100vh` for the menu sheet, the quote modal and the pinned chapters.
- `overflow-x:clip` on `html` and `body` as a guard, while the real offenders get fixed.

### 7.6 Wrapping and alignment
- Headings use `text-wrap:balance`; paragraphs use `text-wrap:pretty`.
- **Centred text only up to 3 lines.** Anything longer is left-aligned on phones: page intros, Benchmarks intros and footnotes, card copy.
- Eyebrows: tighter tracking and `balance`, so a 2-line label looks deliberate. The longest labels get a shorter phone version.
- Proof labels use non-breaking hyphens ("human‑verified", "auto‑submitted") so they never split.

---

## 8. Shared components

**8.1 Announcement bar.** One line, 40px tall, with phone copy "PHP2Shell RCE — patch from $10 →" (ellipsis if needed). The whole bar is the link. Optionally dismissible, remembered per visitor.

**8.2 Nav bar.**
- 56px tall.
- "Sign in" leaves the bar on phones (it lives in the menu).
- Theme and menu buttons become 44px; the logo gets a 44px hit area.
- **Hides on scroll down and reappears on scroll up**, freeing about 60px (critical in landscape).

**8.3 Menu → full-height sheet.**
- A dim and blur backdrop; tapping outside closes it.
- Height `100dvh`, with safe-area padding.
- 56px rows. Services and About become accordions with chevrons and sub-labels.
- Footer of the sheet: a full-width "Book a scoping call" with white, centred text (the specificity fix); "Sign in" as a secondary link; a theme-toggle row.
- Accessibility:
  - focus moves into the sheet and is trapped there;
  - Esc closes it, and focus returns to the menu button;
  - the closed sheet is `inert`, so its links can't be tabbed to;
  - the menu button gets `aria-controls`.
- It closes on route change and when resized to desktop.
- Scroll is locked with `overscroll-behavior:contain`, and Lenis is stopped.
- The floating button hides while the sheet is open.

**8.4 Desktop dropdowns on touch screens (≥900px).** Open on click only when the input is touch, ignoring the emulated `mouseenter`.

**8.5 Floating "Free website check".**
- **Phones and tablets:** a 52px icon-only circle with a safe-area offset. It appears after the hero and hides near the footer or final CTA and while the menu is open. It is never shown on /website-check itself.
- **Landscape:** icon only.
- **Space at the end of each page** is reserved, so the floating button never covers the last line.

**8.6 Buttons and CTA groups.** Stacked, equal width (100%, max 420px), 52px tall, centred labels. Text links get a 44px hit area.

**8.7 Footer.** A 2-column link grid (Product | Company), with Portal and contact full-width below. 44px rows. The copyright and legal lines are clear of the floating button and the safe area. Back-to-top stays.

**8.8 Page hero (9 inner pages).**
- 48px top padding and the eyebrow fix.
- A balanced 32px H1.
- The intro is left-aligned when longer than 3 lines.
- Stacked CTAs.

**8.9 Cards.** 20px padding and a press state. No sticky green fill on touch; the green appears only while a card is pressed.

---

## 9. Homepage, section by section

### 9.1 Hero and the octagon (your note)
**Recommended: a compact emblem at the top.**
- **Phone order:** octagon (~140px, centred) → H1 → sub → CTAs → link. This is a CSS `order` change only; no markup changes.
- The legend is hidden on phones; it doesn't fit at that size.
- **Canvas:**
  - draw at the small size with fewer particles (70 → ~24);
  - pause when off-screen;
  - re-check the phone size on rotate;
  - no parallax from touch drags.
- **Tablet (600–899px):** a 2-column hero with the copy on the left and a ~220px emblem on the right.
- *Alternatives:* (B) a faint watermark behind the headline; (C) hide it on phones.

### 9.2 Proof strip
- Keep the 2×2 grid, with 34px numbers.
- Labels on 2 lines with no hyphen splits.
- Equal cell heights and aligned dividers.

### 9.3 Problem section and terminal
- Terminal lines no longer wrap: `white-space:pre` with horizontal scroll inside the terminal and an edge fade.
- **Fixed terminal height,** so nothing below jumps.
- Typing pauses when off-screen.
- The "PROOF" watermark is scaled and clipped to its own section.

### 9.4 Pillars
**Recommended: a swipe carousel.**
- Cards are 86% wide with snap scrolling, a peek of the next card, and dots.
- This cuts about 1,100px to about 460px.
- Fixes the 320px watermark overflow.
- *Alternative:* a compact stack.

### 9.5 How it works (stacked on phones)
- Keep the stacked layout, with 56px hatch words and the step label tucked under them.
- Chips sit on one swipeable row.
- Optional: a slim sticky "01 · 02 · 03 · 04" progress rail under the nav.

### 9.6 Pricing teaser
- CTAs stacked full-width and centred.

### 9.7 Comparison table → "compare cards"
**Recommended: one card per criterion.**
- Example: a "Business logic" card with three rows: Scanner / Traditional / **OctaSec** (highlighted, with a ✓).
- Needs a small change to `DifferentiatorTable.tsx`; the desktop table is unchanged.
- *Alternative:* a sideways-scrolling table with a sticky first column.

### 9.8 Final CTA
- Full-width button.
- The network canvas pauses off-screen, uses fewer particles, and stops re-randomising whenever the mobile URL bar resizes the page (NetworkCanvas.tsx:114–168).

---

## 10. Inner pages

| Page | Changes |
|---|---|
| **Services** | Cards are 1 column on phones and 2 on tablets. "Book scoping call →" links get 44px targets. |
| **Pricing** | <ul><li>Tier cards stack on phones and go 2 columns on tablets.</li><li>"blocks" and "includes" lists become 1 column.</li><li>Tapping "Get a quote" no longer turns the card green.</li><li>Quote modal: `100dvh`, a 44px close button, safe-area padding.</li></ul> |
| **Benchmarks** | <ul><li>Intros and footnotes are left-aligned.</li><li>Tables use stacked rows on phones: config name on its own line, solved/rate beneath.</li><li>Long methodology sections become collapsible, cutting the 10,400px length.</li><li>The miss cards go 2 columns on tablets.</li></ul> |
| **How it works** | <ul><li>The same compare-cards fix as the homepage.</li><li>Coverage cards are left-aligned.</li></ul> |
| **Blog list** | Cards are 1 column on phones and 2 on tablets, with equal heights. |
| **Blog post** | <ul><li>Tables scroll inside a frame with an edge fade (fixes the 320px overflow).</li><li>Share buttons and the back link get 44px targets.</li><li>Code blocks scroll horizontally.</li></ul> |
| **About** | <ul><li>Keep the agency grid.</li><li>"blocks" become 1 column.</li><li>"Visit Octagram ↗" gets a 44px target.</li></ul> |
| **FAQ** | Already fine; spacing tightened. |
| **Contact** | Keep as is; the note's link gets a 44px target. |
| **Website check** | <ul><li>The input goes to **16px** (stops the iOS zoom).</li><li>The input and button stack full-width.</li><li>The terms link gets a 44px target.</li><li>The floating button is hidden on this page.</li></ul> |
| **PHP2Shell** | <ul><li>The input goes to **16px**.</li><li>The intro is left-aligned.</li><li>The double gutter is removed: a nested `.wrap` at php2shell/page.tsx:187 and the FAQ accordion.</li></ul> |
| **Legal** | Links get 44px targets; long anchors wrap. |

---

## 11. Motion and performance on phones

- **Lenis:** touch already scrolls natively, but Lenis keeps a permanent rAF loop running. Don't start it when the primary input is touch. The anchor offset changes from a fixed −90px to the real header height.
- **Reveals:**
  - fix the Reduce Motion bug (§2 #7);
  - phones use a 16px vertical, 0.5s reveal;
  - no horizontal offsets, which avoid sideways wobble on iOS.
- **Section-head parallax:** off on phones. It reads layout on every scroll today (SiteMotion.tsx:186–222).
- **SiteMotion:** tilt, magnetic buttons and card glow become mouse-only.
- **Canvases (hero seal and final-CTA network):**
  - pause when off-screen or when the tab is hidden;
  - device-pixel ratio capped at 1.5 on phones;
  - fewer particles.
- **Hero beam and 28px-blur glow:** lighter, or static, on phones.
- **Terminal:** pauses when off-screen.
- **`background-attachment:fixed` (L:333):** off on phones. It's costly there, and iOS ignores it.
- **Budgets:**
  - Lighthouse mobile performance ≥ 90;
  - LCP ≤ 2.5s on 4G;
  - CLS ≤ 0.05;
  - INP ≤ 200ms.

---

## 12. Accessibility

- 44px targets everywhere.
- Menu focus management and `inert`, plus `aria-controls`.
- The Reduce Motion fix.
- Pinch-zoom stays allowed.
- The drawer CTA contrast fix.
- Both themes rechecked on phones.
- Landscape phones fully usable.

---

## 13. Implementation approach

**One new stylesheet, `web/app/mobile.css`,** imported last in `layout.tsx`. Reverting it means removing one import, the same pattern as `polish.css`.

**Small, isolated component changes:**

| File | Change |
|---|---|
| `Nav.tsx` | menu sheet, focus handling, touch-safe dropdowns, hide-on-scroll |
| `FloatingCheck.tsx` | visibility rules |
| `DifferentiatorTable.tsx` | compare cards |
| `CursorFX.tsx` | mouse/pen only |
| `SiteMotion.tsx` | mouse-only effects; phone parallax off |
| `SmoothScroll.tsx` | no Lenis on touch; header-based anchor offset |
| `SealScanner.tsx` | size, particles, pause, rotate |
| `NetworkCanvas.tsx` | pause; resize behaviour |
| `HeroTerminal.tsx` | pause; fixed height |
| `Hero.tsx` | non-breaking hyphens |
| `layout.tsx` | `viewport` export, `mobile.css` import |

**Phases.** You review after phases 1 and 2.
1. **Fix what's broken** (§2) and move the octagon to the top.
2. **Phone polish:** §3, §7 and §8.
3. **Tablet tier:** §4.
4. **The "stunning" layer:** pillars carousel, sticky method rail, nav hide-on-scroll, floating-button reveal, press feedback.

---

## 14. Verification (definition of done)

- **Widths:**
  - phones: 320, 360, 375, 390, 414 and 430px;
  - tablets: 768, 820 and 1024px;
  - landscape: 667×375 and 844×390;
  - each in both light and dark themes.
- **Automated checks**, using the same audit as this plan:
  - no horizontal overflow;
  - no tap target under 44px (except links inside paragraphs);
  - no text under 13.5px;
  - no centred paragraph over 3 lines on phones;
  - nothing covered by the floating button at page end.
- **Real devices:** iPhone Safari and Android Chrome, checking safe areas, the URL bar and zoom-on-focus.
- **Lighthouse mobile,** against the budgets in §11.
- **Screenshots** of every page at each tier, for your review.

---

## 15. Decisions for the owner

The recommended option is listed first in each row.

| # | Decision | Options |
|---|---|---|
| 1 | Octagon on phones | **A) compact emblem above the headline ✅** · B) faint watermark behind the headline · C) hide on phones |
| 2 | Comparison table on phones | **A) compare cards ✅** · B) sideways-scrolling table |
| 3 | Pillars on phones | **A) swipe carousel ✅** · B) compact stack |
| 4 | Announcement bar on phones | **A) one line, dismissible ✅** · B) one line, always shown · C) hidden on phones |
| 5 | Nav while scrolling | **A) hide on scroll down, show on scroll up ✅** · B) always visible |
| 6 | Pricing tiers on phones | **A) stacked compact cards ✅** (easier to compare prices) · B) swipe carousel |

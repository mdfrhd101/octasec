# Pricing page + quote request — spec (2026-10-18)

**Goal:** a public `/pricing` page that explains how OctaSec is priced, with no fixed numbers: public pricing is not decided, so every plan is a custom quote. Every "Get a quote" button opens a **popup form**. Submissions land in **Super Admin → Leads**, tagged so the team can see they came from Pricing and which plan was chosen. A link to the full Contact page stays available for people who prefer it.

## Page content
1. **Hero:** "Priced by scope, not by seat" + one line on quote-based pricing. The primary CTA opens the popup.
2. **Three engagement models**, each showing *Custom quote* with a "Get a quote" button that pre-selects the plan:

   | Plan key | Name | For | Includes |
   |---|---|---|---|
   | `assessment` | One-off assessment | pre-launch checks, compliance evidence, a single app or API | scoping call, human-verified findings, signed report, fix guidance, retest |
   | `continuous` | Continuous testing | teams shipping every week | recurring engagements on a schedule, change-driven re-tests, dashboard + tickets |
   | `enterprise` | Enterprise & MSSP | many apps, subsidiaries or client portfolios (corporate portal) | client sub-accounts with authorisation tracking, compliance mapping, named operator, custom SLAs |

3. **What decides the price:**
   - number of apps, APIs and hosts
   - user roles to test
   - environment
   - test depth (black, grey or white box)
   - timeline
   - compliance mapping
4. **Included in every engagement:**
   - human verification of every finding
   - CVSS + OWASP mapping
   - signed case-file report
   - fix guidance
   - retest
   - authorised testing under signed rules of engagement
5. **Pricing FAQ:** 4 questions (why no list price, how fast a quote arrives, payment/billing, NDA).
6. **Closing CTA:** popup, plus a link to `/contact`.

## Quote popup
Fields:

| Field | Required |
|---|---|
| Name | yes |
| Work email | yes |
| Company | no |
| Plan | pre-selected from the button, can be changed |
| What to test | no |
| Approximate scope | no: `1 app/API`, `2–5`, `6–20`, `20+`, `Not sure` |
| Message | no |
| Honeypot | hidden |

Behaviour:
- Posts to the existing `POST /api/contact` with `source: "pricing"`.
- Closes with X, Esc or Cancel. A click on the backdrop does **not** close it, so typed text isn't lost.
- Focus moves into the dialog when it opens.
- Shows a success state; the error message is shown inline.

## API changes (`POST /api/contact`, `Lead` model)

| Field | Values | When invalid or missing |
|---|---|---|
| `source` | `contact` \| `pricing` | stored as `contact` |
| `plan` | `assessment` \| `continuous` \| `enterprise` \| `""` | stored as `""` |
| `scope` | allowed scope values or `""` | stored as `""` |

Rate limit, honeypot and email validation are unchanged. Super Admin → Leads shows source, plan and scope for each lead.

## Tests (`server/tests/leads.test.mjs`)
- A pricing lead stores source, plan and scope.
- Invalid values are coerced.
- The old contact form (no source) still works and gets `contact`.
- The honeypot is dropped silently.
- An invalid email returns 400.
- The super admin lead list returns the new fields.
- Non-admins cannot read leads.

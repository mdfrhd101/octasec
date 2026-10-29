import { pageMeta } from "../lib/seo";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import PageHero from "../components/PageHero";
import AutoSlider from "../components/AutoSlider";
import HudCursor from "../components/hud/HudCursor";
import HudField from "../components/hud/HudField";
import FaqAccordion, { type FaqItem } from "../components/FaqAccordion";
import { QuoteProvider, QuoteButton } from "../components/QuoteRequest";

export const metadata = pageMeta({
  title: "Penetration Testing Pricing",
  description:
    "Penetration testing priced by scope: one-off assessments, continuous testing and enterprise / MSSP plans. Get a custom quote fast — enterprise depth, startup-grade pricing.",
  keywords: ["pentest pricing", "penetration testing cost", "VAPT pricing Bangladesh", "API security assessment price"],
  path: "/pricing",
});

// HUD styles: hud-pages-a.css (.pg-pricing). [data-rv] blocks are revealed by HudMotion.
const v = (vars: Record<string, number>) => vars as CSSProperties;

const PLANS = [
  {
    key: "assessment" as const,
    tag: "One-off",
    name: "Assessment",
    pd: "One app, API or surface — before a launch, an audit or a big customer deal.",
    items: [
      "Free scoping call + signed rules of engagement",
      "Engine-driven testing, every finding human-verified",
      "Signed case-file report with CVSS + OWASP mapping",
      "Fix guidance your developers can act on",
      "Retest of fixed findings included",
    ],
  },
  {
    key: "continuous" as const,
    tag: "Subscription",
    name: "Continuous testing",
    pd: "For teams shipping every week — testing that keeps pace with your releases.",
    items: [
      "Everything in Assessment, on a recurring schedule",
      "Re-tests when you ship changes",
      "Live dashboard: posture, findings, coverage",
      "Support tickets with the OctaSec team",
      "Attack-surface monitoring of new hosts",
    ],
    featured: true,
  },
  {
    key: "enterprise" as const,
    tag: "Enterprise & MSSP",
    name: "Enterprise",
    pd: "Many apps, subsidiaries — or a portfolio of clients you secure for others.",
    items: [
      "Corporate portal: staff accounts + client sub-accounts",
      "Client authorisation-to-test tracking built in",
      "Compliance mapping (ISO 27001, PCI DSS, Bangladesh Bank ICT …)",
      "Named lead operator and custom SLAs",
      "Volume pricing across engagements",
    ],
  },
];

const DRIVERS = [
  ["Surface size", "How many apps, APIs and hosts are in scope."],
  ["User roles", "Each role (admin, staff, customer) multiplies the access-control paths to test."],
  ["Test depth", "Black, grey or white box — what access and documentation you share."],
  ["Environment", "Production needs gentler pacing and tighter windows than staging."],
  ["Timeline", "A fixed deadline or a narrow test window can change the plan."],
  ["Compliance", "Mapping findings to a framework your auditor or regulator expects."],
];

/** line icons for the six price drivers (decorative), in DRIVERS order */
const DRV_ICONS: ReactNode[] = [
  <path key="s" d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />,
  <path key="r" d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16.5 11.2a2.6 2.6 0 1 0-.9-5M17.6 14.6c2 .5 3.4 2.2 3.9 4.6" />,
  <path key="d" d="m12 3.5 8.5 4.6L12 12.7 3.5 8.1ZM3.5 12.2l8.5 4.6 8.5-4.6M3.5 16.2l8.5 4.6 8.5-4.6" />,
  <path key="e" d="M4 4.5h16v6H4zM4 13.5h16v6H4zM7.5 7.5h.01M7.5 16.5h.01M11 7.5h5M11 16.5h5" />,
  <path key="t" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.2V12l3.2 2.2" />,
  <path key="c" d="M12 3 19.5 6v5.6c0 4.3-3.1 7.9-7.5 9.4-4.4-1.5-7.5-5.1-7.5-9.4V6ZM8.7 12l2.3 2.3 4.4-4.6" />,
];

const INCLUDED = [
  "Human verification of every finding — no scanner noise",
  "Signed report: severity, root cause, proof, fix",
  "CVSS 3.1 scores and OWASP mapping",
  "Retest of fixed findings",
  "Authorised testing only, under signed rules of engagement",
  "Non-destructive by default",
];

const FAQ: FaqItem[] = [
  {
    q: "Why is there no list price?",
    a: "Two apps of the same \"size\" can need very different effort — roles, integrations and business logic change everything. We quote per scope so you never pay for testing you don't need.",
  },
  {
    q: "How fast do I get a quote?",
    a: "Within one business day of your request. Most quotes follow a 30-minute scoping call; for simple scopes we can quote from the form alone.",
  },
  {
    q: "Is the quote fixed?",
    a: "Yes — once the scope is agreed, the price is fixed. If you want to add targets later, we quote the addition separately before any work starts.",
  },
  {
    q: "Can you sign an NDA first?",
    a: "Of course. Mention it in the request and we'll send ours, or review yours, before the scoping call.",
  },
];

export default function PricingPage() {
  return (
    <div className="pg-pricing">
      <QuoteProvider>
        <PageHero
          eyebrow="Pricing"
          title={<>Priced by scope,<br />not by seat.</>}
          sub="Every engagement gets a fixed quote sized to what you actually need tested. Tell us the scope — the quote follows within one business day."
          ctas={
            <div className="h-cta">
              <QuoteButton className="h-btn h-btn-red">Get a quote</QuoteButton>
              <Link className="h-btn h-btn-line" href="/contact">
                Prefer the contact form <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          }
        />

        <section className="h-sec pr-plans" aria-labelledby="pr-plans-t">
          <div className="pa-rail" data-rv>
            <h2 id="pr-plans-t" className="h-lbl">Pricing plans</h2>
            <span className="pa-rail-line" aria-hidden="true" />
            <span className="pa-rail-n" aria-hidden="true">03</span>
          </div>
          <div className="pr-grid">
            {PLANS.map((p, i) => (
              <article key={p.key} className={"h-panel h-tilt pa-card pr-plan" + (p.featured ? " feat" : "")} data-rv style={v({ "--d": i })}>
                {p.featured ? <span className="hs-sweep" aria-hidden="true" /> : null}
                <div className="h-ph pr-head">
                  <span className={"h-tag" + (p.featured ? " ok" : "")}>
                    {p.featured ? <i className="h-dot" /> : null}
                    {p.tag}
                  </span>
                </div>
                <h3>{p.name}</h3>
                <div className="pr-amt">
                  Custom quote <small>&middot; fixed once scoped</small>
                </div>
                <p className="pr-pd">{p.pd}</p>
                <ul className="pr-items">
                  {p.items.map((it, j) => (
                    <li key={it} style={v({ "--i": j })}>{it}</li>
                  ))}
                </ul>
                <QuoteButton plan={p.key} className={"h-btn " + (p.featured ? "h-btn-red" : "h-btn-line")}>
                  Get a quote
                </QuoteButton>
              </article>
            ))}
          </div>
        </section>

        <section className="h-sec pr-drivers" aria-labelledby="pr-drv-t">
          <div className="h-head" data-rv>
            <span className="h-lbl">What decides the price</span>
            <h2 id="pr-drv-t" className="h-h2 h-split">Six things shape every quote.</h2>
          </div>
          {/* desktop: a 3 × 2 grid revealed card by card; phones/tablets: an auto-sliding row */}
          <div className="pr-drv-wrap" data-rv>
            <AutoSlider className="pr-drv-grid">
              {DRIVERS.map(([t, d], i) => (
                <div key={t} className="h-panel h-tilt pa-card pr-drv" data-rv>
                  <div className="h-ph">
                    <span className="pr-drv-n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <span className="pa-ic" aria-hidden="true">
                      <svg viewBox="0 0 24 24">{DRV_ICONS[i]}</svg>
                    </span>
                  </div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </AutoSlider>
          </div>
        </section>

        <section className="h-sec pr-inc" aria-labelledby="pr-inc-t">
          <div className="h-head" data-rv>
            <span className="h-lbl">Always included</span>
            <h2 id="pr-inc-t" className="h-h2 h-split">No add-ons for the basics.</h2>
          </div>
          {/* each basic stamps in as checked; the red shadow + glow follow the mouse */}
          <HudCursor>
            <div className="h-panel pr-inc-card" data-rv>
              <div className="pr-meter" aria-hidden="true">
                {INCLUDED.map((_, i) => (
                  <i key={i} style={v({ "--i": i })} />
                ))}
              </div>
              <ul className="pr-incl">
                {INCLUDED.map((it, i) => (
                  <li key={it} style={v({ "--i": i })}>
                    <span className="pr-ck" aria-hidden="true">
                      <svg viewBox="0 0 16 16"><path pathLength={1} d="m3.5 8.5 3 3 6-6.5" /></svg>
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </HudCursor>
        </section>

        <section className="h-sec pr-faq" aria-labelledby="pr-faq-t">
          <div className="h-head" data-rv>
            <span className="h-lbl">Pricing FAQ</span>
            <h2 id="pr-faq-t" className="h-h2 h-split">Straight answers.</h2>
          </div>
          <FaqAccordion items={FAQ} />
        </section>

        <section className="h-sec hs-final pr-ready" aria-labelledby="pr-ready-t">
          <div className="h-panel hs-final-card" data-rv>
            {/* the homepage's final band: particle field + sweep */}
            <HudField variant="final" />
            <span className="hs-sweep" aria-hidden="true" />
            <span className="h-lbl">Ready?</span>
            <h2 id="pr-ready-t" className="h-h2 h-split">Get a fixed quote in one business day.</h2>
            <p className="h-sub">Tell us what you need tested &mdash; or book a call and we&apos;ll scope it together.</p>
            <div className="h-cta">
              <QuoteButton className="h-btn h-btn-red">Get a quote</QuoteButton>
              <Link className="h-btn h-btn-line" href="/contact">
                Book a scoping call instead <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </QuoteProvider>
    </div>
  );
}

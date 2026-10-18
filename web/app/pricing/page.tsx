import { pageMeta } from "../lib/seo";
import Link from "next/link";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import FaqAccordion, { type FaqItem } from "../components/FaqAccordion";
import { QuoteProvider, QuoteButton } from "../components/QuoteRequest";

export const metadata = pageMeta({
  title: "Penetration Testing Pricing",
  description:
    "Penetration testing priced by scope: one-off assessments, continuous testing and enterprise / MSSP plans. Get a custom quote fast — enterprise depth, startup-grade pricing.",
  keywords: ["pentest pricing", "penetration testing cost", "VAPT pricing Bangladesh", "API security assessment price"],
  path: "/pricing",
});

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
    <QuoteProvider>
      <PageHero
        eyebrow="Pricing"
        title={<>Priced by scope,<br />not by seat.</>}
        sub="Every engagement gets a fixed quote sized to what you actually need tested. Tell us the scope — the quote follows within one business day."
        ctas={
          <div className="hero-cta">
            <QuoteButton>Get a quote</QuoteButton>
            <Link className="link" href="/contact">
              Prefer the contact form <span className="ar">&rarr;</span>
            </Link>
          </div>
        }
      />

      <section className="wrap rv">
        <div className="pricing stagger">
          {PLANS.map((p) => (
            <div key={p.key} className={"card pr" + (p.featured ? " feat" : "")}>
              <span className="tag">{p.tag}</span>
              <h3 style={{ marginTop: 8 }}>{p.name}</h3>
              <div className="amt">Custom quote <small>· fixed once scoped</small></div>
              <p className="pd">{p.pd}</p>
              <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <QuoteButton plan={p.key} className="btn btn-white">Get a quote</QuoteButton>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead eyebrow="What decides the price" title="Six things shape every quote." center />
        <div className="blocks c3 stagger" style={{ marginTop: 32, textAlign: "left" }}>
          {DRIVERS.map(([t, d]) => (
            <div key={t} className="card cov">
              <h4>{t}</h4>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead eyebrow="Always included" title="No add-ons for the basics." center />
        <div className="card" style={{ maxWidth: 760, margin: "32px auto 0", padding: "26px 28px" }}>
          <ul className="incl">{INCLUDED.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead eyebrow="Pricing FAQ" title="Straight answers." center />
      </section>
      <FaqAccordion items={FAQ} />

      <section className="wrap center rv">
        <SectionHead
          eyebrow="Ready?"
          title="Get a fixed quote in one business day."
          text="Tell us what you need tested — or book a call and we'll scope it together."
          center
        />
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 24 }}>
          <QuoteButton>Get a quote</QuoteButton>
          <Link className="link" href="/contact">
            Book a scoping call instead <span className="ar">&rarr;</span>
          </Link>
        </div>
      </section>
    </QuoteProvider>
  );
}

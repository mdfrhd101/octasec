import type { ReactNode } from "react";
import { pageMeta } from "../lib/seo";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";

export const metadata = pageMeta({
  title: "Legal, Privacy & Terms",
  description:
    "OctaSec legal: authorized testing only, privacy policy, terms of service, responsible disclosure and security.txt.",
  keywords: ["OctaSec legal", "penetration testing terms of service", "responsible disclosure", "security.txt"],
  path: "/legal",
});

// HUD page (styles: hud-pages-b.css, scoped to .pg-legal): an in-page index (sticky on
// desktop; the section you are reading lights up where the browser supports scroll-driven
// animations) beside numbered, readable sections that rise in on scroll (HudMotion).
// The anchors #disclosure, #privacy and #terms are linked from the footer, the website
// checker and security.txt: keep them.
const SECTIONS: { id: string; t: string; body: ReactNode }[] = [
  {
    id: "authorized",
    t: "Authorized testing only",
    body: (
      <>
        OctaSec tests only assets you own or are explicitly authorized to test,
        under signed rules of engagement agreed before any request is sent.
        Scope, timing and intensity limits are enforced in the harness &mdash;
        out-of-scope assets are technically unreachable.
      </>
    ),
  },
  {
    id: "disclosure",
    t: "Responsible disclosure",
    body: (
      <>
        Found a security issue in OctaSec or octasec.ai itself? Report it in
        good faith and we&apos;ll work with you. Please give us reasonable time
        to remediate before any public disclosure. Contact{" "}
        <a href="mailto:support@octasec.ai">support@octasec.ai</a> (subject: &ldquo;Security&rdquo;).
      </>
    ),
  },
  {
    id: "security-txt",
    t: "security.txt",
    body: (
      <>
        Our machine-readable security contact lives at{" "}
        <code>/.well-known/security.txt</code>.
      </>
    ),
  },
  {
    id: "privacy",
    t: "Privacy",
    body: (
      <>
        We collect only what we need to run your engagements: the details you
        send through our contact and quote forms; your account, organisation
        and contact details in the portal; and the scope, findings and reports
        of the tests you request. We use them to respond to you, deliver and
        support the service, and keep an audit trail of security-relevant
        actions. We do not sell your data. Test findings are visible only to
        your organisation and to OctaSec operators working on your engagement.
        Our free website checker additionally records the target hostname,
        visitor IP address, user agent and sanitized findings for security,
        abuse investigation and report delivery. Reports expire after 90 days;
        sensitive response bodies, secret values and full URL query strings
        are not retained. Automated bulk use may be rate-limited or blocked.
        To access, correct or delete your data, email{" "}
        <a href="mailto:support@octasec.ai">support@octasec.ai</a>.
      </>
    ),
  },
  {
    id: "terms",
    t: "Terms",
    body: (
      <>
        OctaSec services are provided by Octagram Limited, Dhaka. Testing is
        performed only on assets you own or are authorized to test, under
        signed rules of engagement. Quotes are fixed for the agreed scope;
        changes to scope are quoted separately before work starts. Reports are
        confidential to your organisation. The full service agreement is
        shared with every quote and signed before any engagement begins.
      </>
    ),
  },
  {
    id: "contact",
    t: "Contact",
    body: (
      <>
        Email{" "}
        <a href="mailto:support@octasec.ai">support@octasec.ai</a>
        {" "}&middot; Phone{" "}
        <a href="tel:+8801326875385">+880 1326-875385</a>
      </>
    ),
  },
  {
    id: "rules",
    t: "Rules of engagement",
    body: (
      <>
        A sample rules-of-engagement document is available on request and will
        be published here. <span className="lg-pending">Sample PDF coming soon.</span>
      </>
    ),
  },
];

const nn = (i: number) => String(i + 1).padStart(2, "0");

export default function LegalPage() {
  return (
    <div className="pgb pg-legal">
      <PageHero
        eyebrow="Legal"
        title="Authorized testing only."
        sub="Signed rules of engagement. Scope enforced mechanically."
      />
      <section className="h-sec lg-sec">
        <div className="lg-grid">
          <nav className="h-panel lg-index" aria-label="On this page" data-rv>
            <span className="h-lbl" aria-hidden="true">On this page</span>
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}><span aria-hidden="true">{nn(i)}</span>{s.t}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="lg-body">
            {SECTIONS.map((s, i) => (
              <article key={s.id} id={s.id} className="lg-block" aria-labelledby={`${s.id}-t`} data-rv>
                <span className="lg-num" aria-hidden="true">&sect; {nn(i)}</span>
                <h2 id={`${s.id}-t`}>{s.t}</h2>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </div>
  );
}

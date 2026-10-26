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

export default function LegalPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Authorized testing only."
        sub="Signed rules of engagement. Scope enforced mechanically."
      />
      <section className="wrap rv">
        <div className="legal">
          <h2>Authorized testing only</h2>
          <p>
            OctaSec tests only assets you own or are explicitly authorized to test,
            under signed rules of engagement agreed before any request is sent.
            Scope, timing and intensity limits are enforced in the harness &mdash;
            out-of-scope assets are technically unreachable.
          </p>
          <h2 id="disclosure">Responsible disclosure</h2>
          <p>
            Found a security issue in OctaSec or octasec.ai itself? Report it in
            good faith and we&apos;ll work with you. Please give us reasonable time
            to remediate before any public disclosure. Contact{" "}
            <a href="mailto:support@octasec.ai" style={{ color: "var(--gold)" }}>support@octasec.ai</a> (subject: &ldquo;Security&rdquo;).
          </p>
          <h2>security.txt</h2>
          <p>
            Our machine-readable security contact lives at{" "}
            <code>/.well-known/security.txt</code>.
          </p>
          <h2 id="privacy">Privacy</h2>
          <p>
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
            <a href="mailto:support@octasec.ai" style={{ color: "var(--gold)" }}>support@octasec.ai</a>.
          </p>
          <h2 id="terms">Terms</h2>
          <p>
            OctaSec services are provided by Octagram Limited, Dhaka. Testing is
            performed only on assets you own or are authorized to test, under
            signed rules of engagement. Quotes are fixed for the agreed scope;
            changes to scope are quoted separately before work starts. Reports are
            confidential to your organisation. The full service agreement is
            shared with every quote and signed before any engagement begins.
          </p>
          <h2>Contact</h2>
          <p>
            Email{" "}
            <a href="mailto:support@octasec.ai" style={{ color: "var(--gold)" }}>support@octasec.ai</a>
            {" "}&middot; Phone{" "}
            <a href="tel:+8801326875385" style={{ color: "var(--gold)" }}>+880 1326-875385</a>
          </p>
          <h2>Rules of engagement</h2>
          <p>
            A sample rules-of-engagement document is available on request and will
            be published here. <span className="pending">Sample PDF coming soon.</span>
          </p>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}

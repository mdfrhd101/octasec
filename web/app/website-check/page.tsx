import Link from "next/link";
import { pageMeta } from "../lib/seo";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";
import WebsiteChecker from "./WebsiteChecker";

export const metadata = pageMeta({
  title: "Free Website Safety Check with PDF Report",
  description: "Check PHP2Shell, Heartbleed, legacy TLS, CORS, certificate expiry, security headers, WordPress, Drupal, Joomla, DNS, SPF, DMARC and exposed Git or environment files. Download a free PDF report.",
  keywords: ["free website security check", "SSL expiry check", "WordPress security scanner", "Drupal security check", "Joomla security check", "exposed git checker", "website security report PDF"],
  path: "/website-check",
});

export default function WebsiteCheckPage() {
  return (
    <div className="wsc">
      <PageHero
        eyebrow="Free low-impact safety check"
        title={<>Find the weak spots.<br />Before someone else does.</>}
        sub="One URL gives you a clear external security baseline: urgent exposures first, practical fixes next, and a downloadable PDF for your team or hosting provider."
      />
      <section className="wrap rv" id="check">
        <WebsiteChecker />
      </section>
      <section className="wrap rv">
        <div className="blocks c3" style={{ marginTop: 12, textAlign: "left" }}>
          <div className="card"><h3>Evidence before alarm</h3><p>Confirmed public exposures and expired certificates are marked urgent. Missing hardening and inconclusive evidence remain clearly separated.</p></div>
          <div className="card"><h3>Safe by construction</h3><p>A handful of bounded requests. No exploitation, port scanning, credential testing, plugin brute-force, or storage of sensitive response values.</p></div>
          <div className="card"><h3>Need the full picture?</h3><p>This free baseline cannot see business logic, authenticated authorization, internal services, or unknown vulnerabilities. That is where our verified pentest takes over.</p></div>
        </div>
        <p className="center" style={{ marginTop: 24 }}>Running PHP? <Link className="link" href="/php2shell">Use our specialist PHP2Shell exposure checker →</Link></p>
      </section>
      <FinalCTA />
    </div>
  );
}

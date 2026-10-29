import type { CSSProperties } from "react";
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

const v = (vars: Record<string, number>) => vars as CSSProperties;

const NOTES = [
  { t: "Evidence before alarm", d: "Confirmed public exposures and expired certificates are marked urgent. Missing hardening and inconclusive evidence remain clearly separated." },
  { t: "Safe by construction", d: "A handful of bounded requests. No exploitation, port scanning, credential testing, plugin brute-force, or storage of sensitive response values." },
  { t: "Need the full picture?", d: "This free baseline cannot see business logic, authenticated authorization, internal services, or unknown vulnerabilities. That is where our verified pentest takes over." },
];

// HUD: the hero, then the scan console (WebsiteChecker), three ground rules, the PHP2Shell
// cross-link; blocks reveal on scroll (HudMotion), styles in hud-pages-c.css
export default function WebsiteCheckPage() {
  return (
    <div className="pg-wsc">
      <PageHero
        eyebrow="Free low-impact safety check"
        title={<>Find the weak spots.<br />Before someone else does.</>}
        sub="One URL gives you a clear external security baseline: urgent exposures first, practical fixes next, and a downloadable PDF for your team or hosting provider."
      />
      <section className="h-sec wc-tool" id="check">
        <WebsiteChecker />
      </section>
      <section className="h-sec wc-more">
        <div className="wc-notes">
          {NOTES.map((n, i) => (
            <div key={n.t} className="h-panel h-tilt wc-note" data-rv style={v({ "--sd": i })}>
              <div className="wc-note-h" aria-hidden="true">
                <span className="h-lbl">{String(i + 1).padStart(2, "0")}</span>
                <i />
              </div>
              <h3>{n.t}</h3>
              <p>{n.d}</p>
            </div>
          ))}
        </div>
        <p className="h-edge wc-php" data-rv>
          <span>Running PHP?</span>{" "}
          <Link className="h-link wc-php-a" href="/php2shell">Use our specialist PHP2Shell exposure checker <span aria-hidden="true">&rarr;</span></Link>
        </p>
      </section>
      <FinalCTA />
    </div>
  );
}

import { pageMeta } from "../lib/seo";
import Link from "next/link";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import FaqAccordion, { type FaqItem } from "../components/FaqAccordion";
import FinalCTA from "../components/FinalCTA";
import Checker from "./Checker";

export const metadata = pageMeta({
  title: "PHP2Shell Emergency Patching — CVE-2026-109618 / CVE-2026-109619",
  description:
    "Emergency PHP2Shell mitigation for servers that can't upgrade PHP. Fixed-price hardening for EOL PHP (5.6–8.1) and unpatched builds: $10 per site, $100 per server up to 100 sites. Verified with our non-destructive patch oracle.",
  keywords: ["PHP2Shell patch", "CVE-2026-109618", "CVE-2026-109619", "EOL PHP security", "PHP hardening Bangladesh", "php2shell mitigation hosting"],
  path: "/php2shell",
});

const STEPS = [
  {
    n: "01",
    t: "Fingerprint",
    d: "We identify the exact PHP version, SAPI (mod_php vs FPM), and server topology for every site — the things that decide which attack chains are even possible against you.",
  },
  {
    n: "02",
    t: "Baseline check",
    d: "Our non-destructive patch oracle — one ~300-byte request, no worker crashes — establishes whether your build is exposed. Safe to run on live production.",
  },
  {
    n: "03",
    t: "Harden",
    d: "We apply the mitigation set that fits your stack: upload-progress and session hardening, memory-limit and multipart controls at the web server, WAF rule packs (ModSecurity/nginx), and vetted community backports where they audit clean. Scheduled in a maintenance window, with full rollback.",
  },
  {
    n: "04",
    t: "Verify",
    d: "The same oracle re-runs after hardening. You get before/after proof — not a promise — that the exploitable condition is gone.",
  },
  {
    n: "05",
    t: "Report & watch",
    d: "A signed per-site report: what was exposed, what we changed, what to watch in logs (the exact exploitation shapes and IOCs from our field research).",
  },
];

const PLANS = [
  {
    tag: "Single website",
    name: "Site owner",
    amt: "$10",
    per: "per site · one-off",
    items: [
      "Full fingerprint + exposure check",
      "Config hardening for your PHP version — including EOL 5.6 / 7.x / 8.0 / 8.1",
      "WAF / web-server rules where you control the server",
      "Before/after oracle verification",
      "Signed mitigation report",
    ],
  },
  {
    tag: "Hosting providers & resellers",
    name: "Per server",
    amt: "$100",
    per: "per server · up to 100 sites included",
    items: [
      "Every site on the server covered",
      "Server-wide hardening (cPanel/WHM, Plesk, bare nginx/Apache)",
      "Edge + ModSecurity rule deployment",
      "Per-site verification across the whole estate",
      "Rollback plan + maintenance-window scheduling",
      "Provider summary report for your own customers",
    ],
    featured: true,
  },
  {
    tag: "Large estates",
    name: "Beyond 100 sites",
    amt: "+$0.50",
    per: "per extra site, same server",
    items: [
      "Same full coverage — no tiering of protection",
      "Volume continues at $0.50/site on that server",
      "Multi-server estates: quoted as one engagement",
      "Priority scheduling during active exploitation windows",
    ],
  },
];

const FAQ: FaqItem[] = [
  {
    q: "My PHP is 7.4 / 5.6 — end-of-life. Can you actually fix it?",
    a: "There is no official fix for PHP ≤ 8.1 — there never will be. What we do is close the exploitable conditions around it: the upload-progress/session attack path, memory-exhaustion triggers, multipart parsing exposure, and edge filtering for the known exploitation shapes. Where a community backport exists and audits clean, we apply it. You get measured before/after proof from our oracle.",
  },
  {
    q: "Will this break my site?",
    a: "The changes are configuration- and edge-level, not application-code changes. We schedule inside a maintenance window, snapshot current config, and roll back instantly if anything misbehaves. Non-destructive is the default, always.",
  },
  {
    q: "Can't I just set session.upload_progress.enabled=0 myself?",
    a: "You can — and our public research says exactly that. But it's partial: it closes one path and doesn't touch the OOM-corruption chain, the multipart WAF bypasses, or the edge shapes we see in live attack traffic. You're paying for the complete, verified set — and for proof it worked.",
  },
  {
    q: "How do I pay?",
    a: "Fixed price, invoiced before work starts. Bangladesh: bKash / bank transfer. International: card or wire. Hosting providers can start with one server and expand.",
  },
  {
    q: "How fast can you start?",
    a: "Exploitation of this bug family is active in the wild — we treat these as emergency engagements. Single sites typically complete within one business day of access; full servers within 48 hours including the maintenance window.",
  },
  {
    q: "Do you need root access?",
    a: "For single sites on shared hosting, control-panel access is often enough for the configuration layer; server-wide hardening needs root or your provider's cooperation. We confirm the exact access needed during scoping — no surprises mid-job.",
  },
];

export default function Php2ShellPage() {
  return (
    <div className="p2s">
      <PageHero
        eyebrow="Emergency service · CVE-2026-109618 / CVE-2026-109619"
        title={<>PHP2Shell patching for servers<br />that can&rsquo;t upgrade.</>}
        sub="Pre-auth RCE in PHP core, present since 2012, actively exploited — and PHP 8.1 and older will never get an official fix. We harden what you run today, verify it with a non-destructive oracle we built during our field research, and hand you proof."
        ctas={
          <div className="hero-cta">
            <Link className="btn btn-white" href="/contact">
              Get emergency patching
            </Link>
            <Link className="link" href="/blog/php2shell-expectation-vs-reality">
              Read our field research <span className="ar">&rarr;</span>
            </Link>
          </div>
        }
      />

      <section className="wrap rv" id="check">
        <SectionHead eyebrow="Check your site" title="Is your server exposed?" center />
        <div style={{ marginTop: 32 }}>
          <Checker />
        </div>
      </section>

      <section className="wrap rv">
        <SectionHead eyebrow="The situation" title="Why waiting isn't a plan." />
        <div className="blocks c3 stagger" style={{ marginTop: 32, textAlign: "left" }}>
          <div className="card">
            <h3>14 years in the core</h3>
            <p>The vulnerable code path predates your application: any multipart POST to any PHP script reaches it — no upload form, no plugin, no app bug required.</p>
          </div>
          <div className="card">
            <h3>EOL means exposed forever</h3>
            <p>PHP 8.1 and older get no official patch. If your app can&rsquo;t survive an upgrade, your choices are mitigation done properly — or hoping the exploit ecosystem stalls. It isn&rsquo;t stalling.</p>
          </div>
          <div className="card">
            <h3>Attacks are already firing</h3>
            <p>In-the-wild exploitation began hours before the patch shipped. The simple chains work today; the harder chains are engineering problems someone is solving right now.</p>
          </div>
        </div>
      </section>

      <section className="wrap rv">
        <SectionHead eyebrow="What we do" title="Five steps, fixed scope, measured outcome." />
        <div className="blocks c3 stagger" style={{ marginTop: 32, textAlign: "left" }}>
          {STEPS.map((s) => (
            <div className="card" key={s.n}>
              <span className="tag">{s.n}</span>
              <h3 style={{ marginTop: 8 }}>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap rv">
        <SectionHead eyebrow="Fixed pricing" title="No quotes, no hourly meter — the price is the price." center />
        <div className="pricing stagger" style={{ marginTop: 32 }}>
          {PLANS.map((p) => (
            <div key={p.name} className={"card pr" + (p.featured ? " feat" : "")}>
              <span className="tag">{p.tag}</span>
              <h3 style={{ marginTop: 8 }}>{p.name}</h3>
              <div className="amt">{p.amt} <small>{p.per}</small></div>
              <ul>{p.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <Link className="btn btn-white" href="/contact">
                Start now
              </Link>
            </div>
          ))}
        </div>
        <p className="wrap center" style={{ marginTop: 24, opacity: 0.75 }}>
          Every engagement includes a rollback plan and a signed report. Bangladesh: bKash or bank transfer. International: card or wire.
        </p>
      </section>

      <section className="wrap rv">
        <SectionHead eyebrow="Questions" title="Straight answers." center />
        <div style={{ maxWidth: 760, margin: "32px auto 0" }}>
          <FaqAccordion items={FAQ} />
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}

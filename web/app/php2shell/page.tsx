import type { CSSProperties } from "react";
import { pageMeta } from "../lib/seo";
import Link from "next/link";
import PageHero from "../components/PageHero";
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

// threat facts (red: attacks/exposure), then the five-step patch procedure on a rail (green:
// the fix), fixed plans, FAQ. Blocks reveal on scroll (HudMotion); hud-pages-c.css styles them.
const THREATS = [
  {
    tag: "Since 2012",
    t: "14 years in the core",
    d: "The vulnerable code path predates your application: any multipart POST to any PHP script reaches it — no upload form, no plugin, no app bug required.",
  },
  {
    tag: "No official fix",
    t: "EOL means exposed forever",
    d: (
      <>
        PHP 8.1 and older get no official patch. If your app can&rsquo;t survive an upgrade, your choices are mitigation done properly — or
        hoping the exploit ecosystem stalls. It isn&rsquo;t stalling.
      </>
    ),
  },
  {
    tag: "In the wild",
    t: "Attacks are already firing",
    d: "In-the-wild exploitation began hours before the patch shipped. The simple chains work today; the harder chains are engineering problems someone is solving right now.",
    hot: true,
  },
];

const v = (vars: Record<string, number>) => vars as CSSProperties;

export default function Php2ShellPage() {
  return (
    <div className="pg-p2s">
      <PageHero
        eyebrow="Emergency service · CVE-2026-109618 / CVE-2026-109619"
        title={<>PHP2Shell patching for servers<br />that can&rsquo;t upgrade.</>}
        sub="Pre-auth RCE in PHP core, present since 2012, actively exploited — and PHP 8.1 and older will never get an official fix. We harden what you run today, verify it with a non-destructive oracle we built during our field research, and hand you proof."
        ctas={
          <div className="h-cta">
            <Link className="h-btn h-btn-red p2-go" href="/contact">
              Get emergency patching
            </Link>
            <Link className="h-btn h-btn-line" href="/blog/php2shell-expectation-vs-reality">
              Read our field research <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        }
      />

      <section className="h-sec p2-check" id="check" aria-labelledby="p2-check-t">
        <div className="h-head p2-head-c" data-rv>
          <span className="h-lbl">Check your site</span>
          <h2 id="p2-check-t" className="h-h2 h-split">Is your server exposed?</h2>
        </div>
        <div className="p2-check-in" data-rv>
          <Checker />
        </div>
      </section>

      <section className="h-sec p2-sit" aria-labelledby="p2-sit-t">
        <div className="h-head" data-rv>
          <span className="h-lbl">The situation</span>
          <h2 id="p2-sit-t" className="h-h2 h-split">Why waiting isn&rsquo;t a plan.</h2>
        </div>
        <div className="p2-threats" data-rv>
          {THREATS.map((x, i) => (
            <article key={x.t} className={"h-panel h-tilt p2-threat" + (x.hot ? " hot" : "")} style={v({ "--sd": i })}>
              <div className="h-ph">
                <span className="h-lbl">{String(i + 1).padStart(2, "0")} / 03</span>
                <span className="h-tag crit">{x.hot ? <i className="h-dot" /> : null}{x.tag}</span>
              </div>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="h-sec p2-steps" aria-labelledby="p2-steps-t">
        <div className="h-head" data-rv>
          <span className="h-lbl">What we do</span>
          <h2 id="p2-steps-t" className="h-h2 h-split">Five steps, fixed scope, measured outcome.</h2>
        </div>
        <ol className="p2-proc" data-rv>
          {STEPS.map((s, i) => (
            <li key={s.n} className={"p2-step" + (i >= 3 ? " ok" : "")} style={v({ "--i": i })}>
              <span className="h-edge p2-node" aria-hidden="true">{s.n}</span>
              <div className="h-panel h-tilt p2-step-card">
                <span className="h-lbl">Step {s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="h-sec p2-price" aria-labelledby="p2-price-t">
        <div className="h-head p2-head-c" data-rv>
          <span className="h-lbl">Fixed pricing</span>
          <h2 id="p2-price-t" className="h-h2 h-split">No quotes, no hourly meter — the price is the price.</h2>
        </div>
        <div className="p2-plans">
          {PLANS.map((p, i) => (
            <article key={p.name} className={"h-panel h-tilt p2-plan" + (p.featured ? " ok" : "")} data-rv style={v({ "--sd": i })}>
              <div className="h-ph">
                <span className="h-lbl">{p.tag}</span>
                {p.featured ? <i className="h-dot p2-plan-dot" aria-hidden="true" /> : null}
              </div>
              <h3>{p.name}</h3>
              <div className="p2-amt">
                <b>{p.amt}</b> <small>{p.per}</small>
              </div>
              <ul>{p.items.map((it) => <li key={it}>{it}</li>)}</ul>
              <Link className={"h-btn " + (p.featured ? "h-btn-red p2-go" : "h-btn-line")} href="/contact">
                Start now
              </Link>
            </article>
          ))}
        </div>
        <p className="p2-note" data-rv>
          <i className="h-dot" aria-hidden="true" />
          Every engagement includes a rollback plan and a signed report. Bangladesh: bKash or bank transfer. International: card or wire.
        </p>
      </section>

      <section className="h-sec p2-faq" aria-labelledby="p2-faq-t">
        <div className="h-head p2-head-c" data-rv>
          <span className="h-lbl">Questions</span>
          <h2 id="p2-faq-t" className="h-h2 h-split">Straight answers.</h2>
        </div>
        <FaqAccordion items={FAQ} />
      </section>

      <FinalCTA />
    </div>
  );
}

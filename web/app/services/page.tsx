import { pageMeta } from "../lib/seo";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import FinalCTA from "../components/FinalCTA";
import AutoSlider from "../components/AutoSlider";
import HudCursor from "../components/hud/HudCursor";

export const metadata = pageMeta({
  title: "Penetration Testing Services",
  description:
    "Web app, API, mobile & network penetration testing, attack-surface mapping, continuous testing and AI/LLM security assessment — VAPT for startups and enterprises.",
  keywords: ["web application penetration testing", "API security testing", "mobile app penetration testing", "network penetration testing", "AI LLM security testing", "attack surface assessment"],
  path: "/services",
});

// HUD styles: hud-pages-a.css (.pg-services). [data-rv] blocks are revealed by HudMotion.
const v = (vars: Record<string, number>) => vars as CSSProperties;

/** line icons for the six surfaces (decorative) */
const ICONS: Record<string, ReactNode> = {
  web: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 8.5h18M6 6.2h.01M8.6 6.2h.01M9.5 12.5 7.5 14.5l2 2M14.5 12.5l2 2-2 2" />
    </>
  ),
  api: (
    <path d="M8.5 4C6.5 4 5.6 5 5.6 7v2.2c0 1.5-.9 2.4-2.1 2.8 1.2.4 2.1 1.3 2.1 2.8V17c0 2 .9 3 2.9 3M15.5 4c2 0 2.9 1 2.9 3v2.2c0 1.5.9 2.4 2.1 2.8-1.2.4-2.1 1.3-2.1 2.8V17c0 2-.9 3-2.9 3M12 12h.01" />
  ),
  surface: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9s-1.1 6.5-3.5 9c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3Z" />
    </>
  ),
  pulse: <path className="sv-pulse" pathLength={1} d="M2 12.5h4.2l2.1-5.6 4.1 11 2.3-5.4H22" />,
  ai: (
    <>
      <path d="M4 5h16v11H9.5L5 20v-4H4Z" />
      <path d="m12 7.6.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9Z" />
    </>
  ),
  net: <path d="M2.5 9.2a13.5 13.5 0 0 1 19 0M5.6 12.6a9 9 0 0 1 12.8 0M8.8 16a4.6 4.6 0 0 1 6.4 0M12 19.6h.01" />,
};

function Svc({
  tag,
  ic,
  name,
  cover,
  receive,
  timeline,
}: {
  tag: string;
  ic: keyof typeof ICONS;
  name: ReactNode;
  cover: ReactNode;
  receive: ReactNode[];
  timeline: string;
}) {
  return (
    <article className="h-panel h-tilt pa-card sv-card" data-rv>
      <i className="sv-scan" aria-hidden="true" />
      <div className="h-ph">
        <span className="sv-id">{tag}</span>
        <span className="pa-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24">{ICONS[ic]}</svg>
        </span>
      </div>
      <h3>{name}</h3>
      <p className="sv-cv">{cover}</p>
      <ul className="sv-list">
        {receive.map((r, i) => (
          <li key={i} style={v({ "--i": i })}>{r}</li>
        ))}
      </ul>
      <div className="sv-foot">
        <span className="sv-tl">
          <span className="h-lbl">Typical timeline</span>
          <span className="sr-only">: </span>
          <span className="h-tag">{timeline}</span>
        </span>
        <Link className="link" href="/contact">
          Book scoping call <span className="ar">&rarr;</span>
        </Link>
      </div>
    </article>
  );
}

// the "what are you afraid of" scope: blips sit at a clockwise angle (--a, degrees from 12
// o'clock) so each one flares as the sweep passes it; one red blip is the threat
const BLIPS: { a: number; r: number; crit?: boolean }[] = [
  { a: 38, r: 70 },
  { a: 96, r: 44 },
  { a: 148, r: 92 },
  { a: 212, r: 62 },
  { a: 286, r: 84, crit: true },
  { a: 330, r: 34 },
];
const rad = (d: number) => (d * Math.PI) / 180;
const r2 = (n: number) => Math.round(n * 100) / 100;

function Radar() {
  const ticks: ReactNode[] = [];
  for (let d = 0; d < 360; d += 10) {
    const big = d % 30 === 0, r0 = big ? 104 : 108;
    ticks.push(
      <line key={d} x1={r2(120 + r0 * Math.sin(rad(d)))} y1={r2(120 - r0 * Math.cos(rad(d)))} x2={r2(120 + 112 * Math.sin(rad(d)))} y2={r2(120 - 112 * Math.cos(rad(d)))} />
    );
  }
  return (
    <div className="sv-radar" aria-hidden="true">
      <i className="sv-sweep" />
      <svg viewBox="0 0 240 240">
        <g className="sv-rings">
          <circle cx="120" cy="120" r="112" />
          <circle cx="120" cy="120" r="80" />
          <circle cx="120" cy="120" r="48" />
          <circle cx="120" cy="120" r="16" />
        </g>
        <g className="sv-cross">
          <line x1="8" y1="120" x2="232" y2="120" />
          <line x1="120" y1="8" x2="120" y2="232" />
        </g>
        <g className="sv-ticks">{ticks}</g>
        {BLIPS.map((b) => {
          const x = r2(120 + b.r * Math.sin(rad(b.a))), y = r2(120 - b.r * Math.cos(rad(b.a)));
          return (
            <g key={b.a} className={"sv-blip" + (b.crit ? " crit" : "")} style={v({ "--a": b.a })}>
              {b.crit ? <circle className="sv-ping" cx={x} cy={y} r="9" /> : null}
              <circle cx={x} cy={y} r={b.crit ? 4 : 3} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <div className="pg-services">
      <PageHero
        eyebrow="Services"
        title={
          <>
            Six ways we break in
            <br />
            &mdash; so attackers can&apos;t.
          </>
        }
        sub="Every engagement is engine-driven and human-verified, scoped to a fixed price. Pick a surface, or ask us to scope the whole estate."
        ctas={<ScopeCTA />}
      />

      <section className="h-sec sv-cat" aria-labelledby="sv-cat-t">
        <div className="pa-rail" data-rv>
          <h2 id="sv-cat-t" className="h-lbl">Our services</h2>
          <span className="pa-rail-line" aria-hidden="true" />
          <span className="pa-rail-n" aria-hidden="true">06</span>
        </div>
        {/* desktop: a 3 × 2 grid, each card revealed as it scrolls in; phones/tablets: the
            cards become an auto-advancing swipe row (AutoSlider) revealed as one */}
        <div className="sv-wrap" data-rv>
          <AutoSlider className="sv-grid">
            <Svc
              tag="S1"
              ic="web"
              name="Web Application Pentest"
              cover="Deep testing of your web app's logic, auth flows and trust boundaries — the classes scanners miss."
              receive={[
                "Chained attack-path case files",
                "Working, non-destructive proofs",
                "Developer-ready remediation",
                "Free retest of fixes",
              ]}
              timeline="Days"
            />
            <Svc
              tag="S2"
              ic="api"
              name="API Security Assessment"
              cover="REST and GraphQL — BOLA/IDOR, token attacks, mass assignment, data over-exposure."
              receive={[
                "Per-endpoint findings",
                <>Token &amp; object-level auth testing</>,
                "Multi-role diffing",
                "Free retest",
              ]}
              timeline="Days"
            />
            <Svc
              tag="S3"
              ic="surface"
              name="External Attack Surface Audit"
              cover="Subdomains, cloud assets, DNS, exposed services and leaked secrets across your perimeter."
              receive={[
                "Full surface map (yours to keep)",
                <>Exposure &amp; secret findings</>,
                "Prioritised by real risk",
              ]}
              timeline="Days"
            />
            <Svc
              tag="S4"
              ic="pulse"
              name="Continuous Attack Monitoring"
              cover="Pentest as a subscription: re-map on a schedule, hunt the deltas, humans verify and alert."
              receive={[
                "Scheduled re-mapping",
                "Delta hunting on change",
                "Human-verified alerts",
                "Trend reporting",
              ]}
              timeline="Subscription"
            />
            <Svc
              tag="S5"
              ic="ai"
              name="AI / LLM Feature Testing"
              cover="Prompt injection, tool abuse and data leaks in your chatbots and agents — most regional firms can't test this at all."
              receive={[
                "Prompt-injection testing",
                "Tool/function-abuse testing",
                "Data-leak proofs",
              ]}
              timeline="Days"
            />
            <Svc
              tag="S6"
              ic="net"
              name={<>Network &amp; Wireless Assessment</>}
              cover="Delivered via Octagram's red team — the engine assists, humans lead."
              receive={[
                "Internal/external network testing",
                "Wireless assessment",
                "Red-team-led engagement",
              ]}
              timeline="Scoped"
            />
          </AutoSlider>
        </div>
      </section>

      <section className="h-sec sv-ask" aria-labelledby="sv-ask-t">
        {/* the red shadow + glow follow the mouse (the old CursorCard) */}
        <HudCursor>
          <div className="h-panel sv-ask-card" data-rv>
            <div className="sv-ask-copy">
              <span className="h-lbl">Not sure which?</span>
              <h2 id="sv-ask-t" className="h-h2 h-split">Tell us what you&apos;re afraid of.</h2>
              <p className="h-sub">
                A free scoping call sizes the right engagement &mdash; and if a scanner is genuinely enough for
                you, we&apos;ll say so.
              </p>
              <div className="h-cta">
                <Link className="h-btn h-btn-red" href="/contact">
                  Book a scoping call
                </Link>
              </div>
            </div>
            <Radar />
          </div>
        </HudCursor>
      </section>

      <FinalCTA />
    </div>
  );
}

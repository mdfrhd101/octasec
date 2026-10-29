import type { CSSProperties, ReactNode } from "react";
import JsonLd from "../components/JsonLd";
import { pageMeta, howItWorksLd, breadcrumbLd } from "../lib/seo";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import AutoSlider from "../components/AutoSlider";
import HudCursor from "../components/hud/HudCursor";
import DifferentiatorTable from "../components/DifferentiatorTable";
import FinalCTA from "../components/FinalCTA";

export const metadata = pageMeta({
  title: "How Our AI Pentesting Works",
  description:
    "Scope, map, hunt, prove — how OctaSec's AI-orchestrated, human-verified penetration testing runs an engagement end to end, with deterministic proof and a human gate.",
  keywords: ["how AI penetration testing works", "verification-first pentest", "human-gated pentest", "deterministic proof security testing"],
  path: "/how-it-works",
});

// HUD styles: hud-pages-a.css (.pg-how). [data-rv] blocks are revealed by HudMotion.
const v = (vars: Record<string, number>) => vars as CSSProperties;

// the four stages on one flight path: the hunt is the attack (red), the proof is verified (green)
const STAGES: { n: string; t: ReactNode; d: ReactNode; tone?: "crit" | "ok" }[] = [
  {
    n: "01",
    t: "Scoping",
    d: (
      <>
        You define assets and rules of engagement; we both sign. Our engine
        enforces scope at the network level &mdash; out-of-scope assets are
        technically unreachable, not just contractually.
      </>
    ),
  },
  {
    n: "02",
    t: "Surface mapping",
    d: (
      <>
        Subdomains, ports, services, JS-hidden endpoints, technology
        fingerprinting, cloud assets, leaked secrets. You keep the map even
        if you don&apos;t buy the hunt.
      </>
    ),
  },
  {
    n: "03",
    t: "The hunt",
    tone: "crit",
    d: (
      <>
        90+ offensive technique modules &mdash; injection, auth bypass,
        IDOR, SSRF, business logic, race conditions, cloud misconfig,
        LLM-feature attacks &mdash; selected per feature by the engine, never
        sprayed. Multi-account, multi-role diffing; every state transition
        exercised.
      </>
    ),
  },
  {
    n: "04",
    t: <>Proof &amp; report</>,
    tone: "ok",
    d: (
      <>
        Minimum-impact deterministic proofs (never destructive), human
        operator review, then a case-file report: severity, root cause, raw
        request/response evidence, fix guidance. Retest included.
      </>
    ),
  },
];

// hunting activity (decorative bar trace under the first engine card)
const BARS = [34, 52, 41, 66, 48, 72, 58, 83, 61, 46, 70, 92, 64, 55, 78, 49, 68, 88, 57, 74, 43, 62, 95, 71, 52, 80, 60, 45];

const GOV: { t: string; d: ReactNode }[] = [
  {
    t: "Every action logged",
    d: <>Every action the engine takes is logged and auditable &mdash; replayable end to end for your auditors.</>,
  },
  {
    t: "Limits enforced mechanically",
    d: <>Scope, timing and intensity limits are enforced in the harness, not left to good intentions.</>,
  },
  {
    t: "Signed rules of engagement",
    d: <>Authorized testing only. Both sides sign before a single request is sent.</>,
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pg-how">
      <JsonLd data={[howItWorksLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works/" }])]} />
      <PageHero
        eyebrow="How it works"
        title={
          <>
            From signed scope
            <br />
            to proven exploit.
          </>
        }
        sub="Four stages. The engine does the grinding; a named human operator verifies, writes and signs every finding."
        ctas={<ScopeCTA />}
      />

      {/* desktop: four columns on one rail; ≤1180px: a vertical timeline. Each step reveals
          as it scrolls in and draws its stretch of the rail to the next stage. */}
      <section className="h-sec hw-stages" aria-labelledby="hw-st-t">
        <div className="pa-rail" data-rv>
          <h2 id="hw-st-t" className="h-lbl">The four stages of an engagement</h2>
          <span className="pa-rail-line" aria-hidden="true" />
          <span className="pa-rail-n" aria-hidden="true">04</span>
        </div>
        <ol className="hw-path">
          {STAGES.map((s, i) => (
            <li key={s.n} className={"hw-step" + (s.tone ? " " + s.tone : "")} data-rv style={v({ "--d": i })}>
              <span className="hw-mark" aria-hidden="true">
                <span className="hw-node">
                  {s.tone === "crit" ? <b className="hw-ping" /> : null}
                  <i />
                </span>
              </span>
              <div className="h-panel h-tilt hw-card">
                <div className="h-ph">
                  <span className="hw-sn">{s.n}</span>
                  <span className="hw-prog" aria-hidden="true">
                    {STAGES.map((_, k) => (
                      <i key={k} className={k <= i ? "on" : undefined} />
                    ))}
                  </span>
                </div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="h-sec hw-engine" aria-labelledby="hw-eng-t">
        <div className="h-head h-head-row" data-rv>
          <div>
            <span className="h-lbl">The engine</span>
            <h2 id="hw-eng-t" className="h-h2 h-split">AI does the grinding. Humans do the judgment.</h2>
          </div>
          <p className="h-sub">An AI-orchestrated hunting system, supervised end to end by Octagram&apos;s red-team operators.</p>
        </div>
        {/* the homepage's rule cards: desktop three columns, phones/tablets an auto-sliding row */}
        <div className="hs-rules-wrap" data-rv>
          <AutoSlider className="hs-rules-grid">
            <article className="h-panel hs-rule h-tilt hw-eng" style={v({ "--d": 0 })}>
              <div className="h-ph">
                <span className="h-lbl" aria-hidden="true">Engine</span>
                <span className="hw-live" aria-hidden="true"><i className="h-dot" /></span>
              </div>
              <h3>AI-orchestrated hunting</h3>
              <p>
                Complementary AI models reason about your application in concert
                &mdash; orchestrated to hunt the way a skilled red-teamer would, not
                to spray signatures.
              </p>
              <div className="h-bars hw-bars" aria-hidden="true">
                {BARS.map((h, j) => (
                  <i key={j} style={{ height: h + "%", ...v({ "--i": j }) }} />
                ))}
              </div>
            </article>
            <article className="h-panel hs-rule h-tilt hw-eng" style={v({ "--d": 1 })}>
              <div className="h-ph">
                <span className="h-lbl" aria-hidden="true">Arsenal</span>
              </div>
              <h3>
                <span className="hw-n"><span data-to="90">90</span>+</span> technique modules
              </h3>
              <p>
                An offensive skill library distilled from thousands of disclosed
                real-world vulnerability reports, selected per feature.
              </p>
              <div className="hs-cells" aria-hidden="true">
                {Array.from({ length: 90 }, (_, j) => <i key={j} style={v({ "--i": j })} />)}
              </div>
            </article>
            <article className="h-panel hs-rule h-tilt hw-eng ok" style={v({ "--d": 2 })}>
              <div className="h-ph">
                <span className="h-lbl" aria-hidden="true">Sign-off</span>
                <span className="h-tag ok" aria-hidden="true"><i className="h-dot" />Verified</span>
              </div>
              <h3>Human-gated verification</h3>
              <p>
                A named operator verifies, writes and signs every report. Nothing is
                auto-submitted &mdash; ever.
              </p>
              {/* a signature on the line, then the verified stamp */}
              <svg className="hw-seal" viewBox="0 0 200 64" aria-hidden="true">
                <line className="hw-seal-base" x1="2" y1="54" x2="132" y2="54" />
                <path className="hw-sig" pathLength={1} d="M8 48C14 30 20 22 24 30S20 50 28 46 38 24 44 30 40 50 48 46 58 30 64 34 62 48 70 44 80 32 86 36 86 46 94 42 108 36 126 38" />
                <circle className="hw-ring" pathLength={1} cx="168" cy="32" r="24" />
                <path className="hw-check" pathLength={1} d="m157 32.5 7.5 7.5 15-16" />
              </svg>
            </article>
          </AutoSlider>
        </div>
      </section>

      <section className="h-sec hw-gov" id="governance" aria-labelledby="hw-gov-t">
        <div className="h-head" data-rv>
          <span className="h-lbl">Governance</span>
          <h2 id="hw-gov-t" className="h-h2 h-split">Mechanical scope. Full audit trail.</h2>
        </div>
        {/* the three guarantees as an audit log; the red shadow + glow follow the mouse */}
        <HudCursor>
          <div className="h-panel hw-log" data-rv>
            <div className="hw-log-bar" aria-hidden="true">
              <i /><i /><i />
              <span className="hw-rec"><i className="h-dot" /></span>
            </div>
            <ul className="hw-rows">
              {GOV.map((g, i) => (
                <li key={g.t} className="hw-row" style={v({ "--i": i })}>
                  <span className="hw-chk" aria-hidden="true">
                    <svg viewBox="0 0 16 16"><path pathLength={1} d="m3.5 8.5 3 3 6-6.5" /></svg>
                  </span>
                  <div>
                    <h3>{g.t}</h3>
                    <p>{g.d}</p>
                  </div>
                </li>
              ))}
            </ul>
            <span className="hw-cursor" aria-hidden="true" />
          </div>
        </HudCursor>
      </section>

      <DifferentiatorTable />
      <FinalCTA />
    </div>
  );
}

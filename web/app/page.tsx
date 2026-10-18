import Link from "next/link";
import Hero from "./components/Hero";
import HeroTerminal from "./components/HeroTerminal";
import MethodChapters from "./components/MethodChapters";
import DifferentiatorTable from "./components/DifferentiatorTable";
import FinalCTA from "./components/FinalCTA";
import JsonLd from "./components/JsonLd";
import { serviceLd } from "./lib/seo";

// landing page v2 — docs/LANDING_DESIGN_V2.md
const STATS: [number, string, string][] = [
  [104, "", "public benchmark apps"],
  [90, "+", "offensive technique modules"],
  [100, "%", "findings human-verified"],
  [0, "", "findings auto-submitted"],
];

const PILLARS = [
  { k: "01", t: "The attacks others miss", d: "Business logic, auth flows, race conditions, multi-step chains — the classes scanners are structurally blind to. Every parameter, state transition and trust boundary.", c: ["Logic flaws", "Auth & roles", "Chains"] },
  { k: "02", t: "Proof, not noise", d: "Every finding is a case file: the attack path, a working reproduction, the decision log and developer-ready remediation. If we can't prove it, we don't report it.", c: ["Reproduction", "Evidence", "Fix guidance"] },
  { k: "03", t: "Human-gated, always", d: "AI does the grinding. A named human operator verifies, writes and signs every report. Nothing is auto-submitted. Ever.", c: ["Named operator", "Signed report", "Full audit log"], v: true },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={serviceLd} />
      <Hero />

      <section className="wrap proof-strip rv" id="proof" aria-label="OctaSec in numbers">
        {STATS.map(([n, suf, l]) => (
          <div key={l} className="pstat">
            <b><span data-count={n}>{n}</span>{suf}</b>
            <span>{l}</span>
          </div>
        ))}
      </section>

      <section className="wrap problem2" id="problem">
        <div className="rv">
          <span className="eyebrow">The problem</span>
          <h2 className="mh big-statement">
            Your last &ldquo;pentest&rdquo; was a scanner PDF with a logo on top.
          </h2>
          <p className="lead">
            Affordable pentests find what&apos;s known and miss what&apos;s specific to
            your app. Real breaches chain three boring bugs into one critical incident.
            Scanners don&apos;t chain anything &mdash; OctaSec does, and proves it.
          </p>
        </div>
        <div className="rv problem-term">
          <HeroTerminal />
        </div>
      </section>

      <section className="pillars" id="solution">
        <div className="pillars-mark" aria-hidden="true">PROOF</div>
        <div className="wrap">
          <div className="rv sec-left">
            <span className="eyebrow">The difference</span>
            <h2 className="mh">Depth of a red team. Discipline of an audit.</h2>
          </div>
          <div className="pillar-grid stagger">
            {PILLARS.map((p) => (
              <article key={p.k} className={"card glass pillar" + (p.v ? " verified" : "")}>
                <span className="pk">{p.k}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
                <div className="pchips">{p.c.map((x) => <span key={x}>{x}</span>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MethodChapters />

      <section className="wrap rv" id="pricing-anchor">
        <div className="anchor2 card glass">
          <div>
            <span className="eyebrow">Pricing</span>
            <h2 className="mh">Priced for the companies attackers actually target.</h2>
            <p className="lead">
              A traditional deep pentest costs $15&ndash;40k and takes weeks. OctaSec
              engagements start at a fraction of that, finish in days, and include a
              free retest. Fixed price for the agreed scope &mdash; no surprises.
            </p>
          </div>
          <div className="anchor2-cta">
            <Link className="btn btn-white" href="/pricing">See engagement models</Link>
            <Link className="btn btn-ghost" href="/contact">Get a scoped quote</Link>
          </div>
        </div>
      </section>

      <DifferentiatorTable />
      <FinalCTA />
    </>
  );
}

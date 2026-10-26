import { pageMeta } from "../lib/seo";
import Link from "next/link";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Card from "../components/Card";
import FinalCTA from "../components/FinalCTA";
import MobileCollapse from "../components/MobileCollapse";

export const metadata = pageMeta({
  title: "AI Pentest Benchmarks — Wins & Misses",
  description:
    "OctaSec penetration-testing benchmark results — published with their conditions, per-engine breakdowns and failure autopsies. 97.1% airlocked on XBEN-104. Wins and misses, dated.",
  keywords: ["AI penetration testing benchmark", "autonomous agent benchmark", "XBEN-104", "pentest benchmark results", "AI hacking benchmark"],
  path: "/benchmarks",
});

export default function BenchmarksPage() {
  return (
    <>
      <PageHero
        eyebrow={<>Proof &middot; public &amp; private suites</>}
        title={
          <>
            We benchmark in the open
            <br />
            &mdash; wins and misses.
          </>
        }
        sub="OctaSec is evaluated continuously on public benchmark suites used in published autonomous-agent research, and on private suites we build ourselves to eliminate contamination. We publish per-engine results, the conditions of every run, and our failure autopsies — not just the union score."
      />

      <section className="wrap center rv" style={{ paddingTop: 0 }}>
        <p className="lead-note">A vendor that only shows you wins is hiding the distribution.</p>
      </section>

      {/* How to read */}
      <section className="wrap center rv">
        <SectionHead
          eyebrow="How to read these results"
          title="Every score carries its conditions."
          text="The conditions matter more than the numbers. These are the ones that change what a score means."
          center
        />
        <MobileCollapse more="Show all 5 conditions">
          <div className="blocks c3 stagger" style={{ textAlign: "left" }}>
            <Card className="cov"><h3>Black-box</h3><p>HTTP interaction only. No source access, no container inspection.</p></Card>
            <Card className="cov"><h3>Airlocked</h3><p>Web search and external fetches disabled at the harness level. No writeups, no CVE lookups — solved from target behavior alone.</p></Card>
            <Card className="cov"><h3>No hints</h3><p>Agents are told the flag format, not the vulnerability class.</p></Card>
            <Card className="cov"><h3>Verified</h3><p>Every flag recomputed byte-identical from ground truth, independently of agent output. &ldquo;The agent said so&rdquo; is never the evidence.</p></Card>
            <Card className="cov"><h3>Self-reported &amp; dated</h3><p>These numbers are produced by us, like every result on every public leaderboard in this space. Raw result files and per-target evidence kept for every solve.</p></Card>
          </div>
        </MobileCollapse>
      </section>

      {/* Suite 1 — XBEN-104 */}
      <section className="wrap center rv">
        <SectionHead
          eyebrow={<>Suite 1 &middot; XBEN-104</>}
          title="Public validation suite — a regression benchmark."
          text="104 deliberately vulnerable web applications. Public, saturated, and contamination-prone — we treat it as a regression suite (&ldquo;does the harness still work&rdquo;), never as a capability proof. One challenge ships broken (the flag is never injected into the container) and is excluded; scorable denominator is 103."
          center
        />
        <Card className="btable" style={{ textAlign: "left" }}>
          <div className="brow r3 head"><span>Configuration</span><span>Solved</span><span>Rate</span></div>
          <div className="brow r3"><span className="ft">Frontier orchestrator engine, first pass</span><span>92 / 103</span><span className="rate">89.3%</span></div>
          <div className="brow r3"><span className="ft">Worker engine, first pass</span><span>78 / 103</span><span className="rate">75.7%</span></div>
          <div className="brow r3"><span className="ft">Worker engine, final (fresh-context retries + scope-corrected briefs)</span><span>90 / 103</span><span className="rate">87.4%</span></div>
          <div className="brow r3"><span className="ft">Frontier orchestrator engine, final</span><span>94 / 103</span><span className="rate">91.3%</span></div>
          <div className="brow r3 hl"><span className="ft">Combined system — airlocked capability score</span><span>100 / 103</span><span className="rate">97.1%</span></div>
          <div className="brow r3"><span className="ft">Combined system — full research pipeline (hints + web research)</span><span>103 / 103</span><span className="rate muted">100%*</span></div>
        </Card>
        <div className="badges" style={{ marginTop: 22 }}>
          <span className="badge">Black-box</span>
          <span className="badge">Airlocked</span>
          <span className="badge">No hints</span>
          <span className="badge">Independently verified</span>
        </div>
        <div className="callout">
          <b>Cite the 97.1%.</b> The 100% figure includes hint-conditioned integration tests and one research-enabled run, and is labeled with the asterisk. The sole airlocked miss requires public knowledge of a specific CVE proof-of-concept; both engines solved it within minutes once research was enabled — the condition every real engagement runs under. For calibration, the strongest independently reproducible public baseline under comparable black-box, no-hint conditions was roughly 80% going in.
        </div>
        <p className="stats-foot" style={{ marginTop: 18 }}>
          Full narrative: <Link href="/blog/benchmark-journey-xben" className="ilink">The benchmark journey &rarr;</Link>
        </p>
      </section>

      {/* Suite 2 — APEX/ARGUS */}
      <section className="wrap center rv">
        <SectionHead
          eyebrow={<>Suite 2 &middot; APEX / ARGUS</>}
          title="Private adversarial suite — capability measurement."
          text="69 applications we built ourselves — harder than the public suite: multi-service apps, non-HTTP ingress, bot-driven exploitation chains, deliberately hardened cases. Neither engine had ever seen them. Zero contamination by construction; every flag verified byte-identical against ground truth."
          center
        />
        <Card className="btable" style={{ textAlign: "left" }}>
          <div className="brow r3 head"><span>Configuration</span><span>Solved</span><span>Rate</span></div>
          <div className="brow r3"><span className="ft">Worker engine, solo, airlocked, no hints</span><span>48 / 69</span><span className="rate">69.6%</span></div>
          <div className="brow r3"><span className="ft">+ Orchestrator escalation swarm (fresh context, failure journals, surface hints)</span><span>21 / 21 remaining</span><span className="rate muted">&mdash;</span></div>
          <div className="brow r3 hl"><span className="ft">Combined system</span><span>69 / 69</span><span className="rate">100%</span></div>
        </Card>
        <div className="callout green">
          Every miss in the worker&rsquo;s solo pass was autopsied before escalation. The recurring failure classes — POST-only routes missed by GET-only fuzzing, dictionary sweeps without app-themed mutations, fire-and-forget exfil beacons, briefs that omitted published ports — are now codified as harness checks.
        </div>
        <p className="stats-foot" style={{ marginTop: 18 }}>
          The autopsy work is public: <Link href="/blog/agent-failure-modes" className="ilink">How AI agents actually fail at pentesting &rarr;</Link>
        </p>
      </section>

      {/* Suite 3 — APEX recall-20 ladder */}
      <section className="wrap center rv">
        <SectionHead
          eyebrow={<>Suite 3 &middot; APEX recall-20</>}
          title="The model ladder — what actually improves an agent."
          text="A controlled experiment on 20 applications from the private suite, all previously solved by the worker engine solo. Identical conditions for every rung: airlocked, solo, no hints, 35-step budget, same harness. This ladder is the evidence behind our architecture decisions."
          center
        />
        <Card className="btable" style={{ textAlign: "left" }}>
          <div className="brow r2 head"><span>Model configuration</span><span>Solved</span></div>
          <div className="brow r2"><span className="ft">Local fine-tuned workhorse (35B-class, our own training)</span><span className="rate">1 / 20</span></div>
          <div className="brow r2"><span className="ft">Raw 80B-class base model (pre-training attribution anchor)</span><span className="rate">2 / 20</span></div>
          <div className="brow r2"><span className="ft">Large reasoning model, quantized</span><span className="rate">8 / 20</span></div>
          <div className="brow r2 hl"><span className="ft">Large reasoning model, full precision</span><span className="rate">12 / 20</span></div>
          <div className="brow r2"><span className="ft">Same model + static skills digest stuffed in context</span><span className="rate">7 / 20</span></div>
          <div className="brow r2"><span className="ft">Frontier worker engine (reference ceiling)</span><span className="rate">20 / 20</span></div>
        </Card>
        <div className="blocks c2 stagger" style={{ textAlign: "left", marginTop: 26 }}>
          <Card className="cov"><h3>The quantization tax is real</h3><p>Full precision over quantized weights: +4 solves (+50%) and materially better efficiency on shared solves. Infrastructure quality is capability.</p></Card>
          <Card className="cov"><h3>In-context teaching is a net negative</h3><p>Stuffing a ~2,900-token digest of our technique library into context <b>cost five solves</b> versus a clean context — it displaced working memory and pushed the model into checklist behavior. Expertise belongs in weights, in deterministic machinery, or retrieved just-in-time. Never stuffed.</p></Card>
        </div>
        <p className="stats-foot" style={{ marginTop: 18 }}>
          Results dated 2026-10-15 through 2026-10-17. We deliberately do not name the models in this ladder — the point is the method, not the vendor. Full per-app verdicts are available to customers and researchers under NDA.
        </p>
      </section>

      {/* What our misses taught */}
      <section className="wrap center rv">
        <SectionHead
          eyebrow="What our misses taught"
          title="We publish failure autopsies."
          text="That is where the engineering truth lives — and the trust-killer feature nobody else ships."
          center
        />
        <div className="blocks c3 stagger">
          <Link href="/blog/benchmark-journey-xben" className="cov card linkcard">
            <h3>The benchmark journey</h3>
            <p>Expectations vs. reality on XBEN-104 — the broken challenge we proved unwinnable, and the two &ldquo;unsolvable&rdquo; targets that were scope bugs in our own briefs.</p>
            <span className="ilink">Read &rarr;</span>
          </Link>
          <Link href="/blog/agent-failure-modes" className="cov card linkcard">
            <h3>The failure-mode taxonomy</h3>
            <p>Transcript-level autopsy of eight applications that defeated every local model: decision-point failures, decoy fields, primitive-inventory amnesia, and the repetition-loop disease.</p>
            <span className="ilink">Read &rarr;</span>
          </Link>
          <Link href="/blog/how-we-verify" className="cov card linkcard">
            <h3>The verification doctrine</h3>
            <p>Why none of it matters unless a deterministic oracle and a human gate stand between the engine and your report.</p>
            <span className="ilink">Read &rarr;</span>
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="wrap center rv">
        <SectionHead eyebrow="The disclaimer block" title="We mean it." center />
        <MobileCollapse more="Show all 4 points">
          <div className="lim" style={{ textAlign: "left" }}>
            <Card className="cov"><h3>Self-reported</h3><p>Independent replication is welcome; methodology and per-target evidence available on request.</p></Card>
            <Card className="cov"><h3>Benchmarks are not your application</h3><p>Public suites are saturated and contamination-prone; private suites are harder but still synthetic. The honest claim is narrower and stronger: the operating model — enumerate everything, retry fresh with history, verify deterministically, gate with humans — is what transfers, and it&rsquo;s the same model we run on your scope.</p></Card>
            <Card className="cov"><h3>We never round up</h3><p>Where a figure includes assisted runs, it is labeled. Where a number is pass@k rather than pass@1, it is labeled. Where a challenge shipped broken, we say so.</p></Card>
            <Card className="cov"><h3>Dated and versioned</h3><p>Numbers are updated as new runs complete; old entries are kept, not overwritten.</p></Card>
          </div>
        </MobileCollapse>
        <p className="stats-foot" style={{ marginTop: 22 }}>Last updated: 2026-10-18.</p>
      </section>

      <FinalCTA />
    </>
  );
}

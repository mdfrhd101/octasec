import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SectionHead from "../components/SectionHead";
import Card from "../components/Card";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — Benchmarks",
  description:
    "We benchmark in the open — wins and misses. Per-model results and failure autopsies.",
  alternates: { canonical: "/benchmarks" },
};

export default function BenchmarksPage() {
  return (
    <>
      <PageHero
        eyebrow={<>Proof &middot; public benchmarks</>}
        title={
          <>
            We benchmark in the open
            <br />
            &mdash; wins and misses.
          </>
        }
        sub="OctaSec is evaluated continuously on the same public benchmark suites used in published autonomous-agent research. We publish per-model results and our failure autopsies, not just the union score."
      />

      <section className="wrap center rv">
        <SectionHead
          eyebrow={<>Suite 1 &middot; XBEN</>}
          title="104 vulnerable apps, black-box, airlocked."
          text="The XBEN public validation suite — 104 deliberately vulnerable web apps, each with a flag to capture, run under strict black-box airlocked conditions."
          center
        />
        <Card className="btable" style={{ textAlign: "left" }}>
          <div className="brow r3 head">
            <span>Configuration</span>
            <span>Solved</span>
            <span>Rate</span>
          </div>
          <div className="brow r3">
            <span className="ft">Black-box, airlocked, no hints</span>
            <span className="pending">Published at launch</span>
            <span className="pending">&mdash;</span>
          </div>
        </Card>
        <div className="badges" style={{ marginTop: 22 }}>
          <span className="badge">Black-box</span>
          <span className="badge">Airlocked</span>
          <span className="badge">Self-navigation</span>
          <span className="badge">Independently verified</span>
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead
          eyebrow={<>Suite 2 &middot; APEX / ARGUS</>}
          title="69 apps, including deliberately hardened cases."
          text="An adversarial suite of 69 apps — some built specifically to resist automated agents. We report per-model results and the ensemble union, not a single cherry-picked number."
          center
        />
        <Card className="btable" style={{ textAlign: "left" }}>
          <div className="brow r3 head">
            <span>Configuration</span>
            <span>Solved</span>
            <span>Rate</span>
          </div>
          <div className="brow r3">
            <span className="ft">Per-model results</span>
            <span className="pending">Published at launch</span>
            <span className="pending">&mdash;</span>
          </div>
          <div className="brow r3">
            <span className="ft">Ensemble union</span>
            <span className="pending">Published at launch</span>
            <span className="pending">&mdash;</span>
          </div>
        </Card>
      </section>

      <section className="wrap center rv">
        <SectionHead
          eyebrow="What our misses taught"
          title="The trust-killer feature nobody else ships."
          text="When OctaSec fails a target, we write up why — and what we changed. A vendor that only shows you wins is hiding the distribution."
          center
        />
        <div className="blocks c3 stagger">
          <Card className="cov">
            <h4>Failure autopsy #1</h4>
            <p className="pending">Writeup publishing soon.</p>
          </Card>
          <Card className="cov">
            <h4>Failure autopsy #2</h4>
            <p className="pending">Writeup publishing soon.</p>
          </Card>
          <Card className="cov">
            <h4>Failure autopsy #3</h4>
            <p className="pending">Writeup publishing soon.</p>
          </Card>
        </div>
        <p className="stats-foot" style={{ marginTop: 22 }}>
          Final verified numbers come straight from our live scoreboard at launch.
          We never round up, and we never claim 100%.
        </p>
      </section>

      <FinalCTA />
    </>
  );
}

import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import SectionHead from "../components/SectionHead";
import Card from "../components/Card";
import DifferentiatorTable from "../components/DifferentiatorTable";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — How it works",
  description:
    "Scope, map, hunt, prove — how OctaSec's AI pentest service runs an engagement, end to end.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
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

      <section className="wrap rv">
        <div className="blocks stagger">
          <Card className="st">
            <div className="sn">01</div>
            <h3>Scoping</h3>
            <p>
              You define assets and rules of engagement; we both sign. Our engine
              enforces scope at the network level &mdash; out-of-scope assets are
              technically unreachable, not just contractually.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">02</div>
            <h3>Surface mapping</h3>
            <p>
              Subdomains, ports, services, JS-hidden endpoints, technology
              fingerprinting, cloud assets, leaked secrets. You keep the map even
              if you don&apos;t buy the hunt.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">03</div>
            <h3>The hunt</h3>
            <p>
              90+ offensive technique modules &mdash; injection, auth bypass,
              IDOR, SSRF, business logic, race conditions, cloud misconfig,
              LLM-feature attacks &mdash; selected per feature by the engine, never
              sprayed. Multi-account, multi-role diffing; every state transition
              exercised.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">04</div>
            <h3>Proof &amp; report</h3>
            <p>
              Minimum-impact deterministic proofs (never destructive), human
              operator review, then a case-file report: severity, root cause, raw
              request/response evidence, fix guidance. Retest included.
            </p>
          </Card>
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead
          eyebrow="The engine"
          title="AI does the grinding. Humans do the judgment."
          text="An AI-orchestrated hunting system, supervised end to end by Octagram's red-team operators."
          center
        />
        <div className="blocks c3 stagger">
          <Card className="cov">
            <h4>AI-orchestrated hunting</h4>
            <p>
              Complementary AI models reason about your application in concert
              &mdash; orchestrated to hunt the way a skilled red-teamer would, not
              to spray signatures.
            </p>
          </Card>
          <Card className="cov">
            <h4>90+ technique modules</h4>
            <p>
              An offensive skill library distilled from thousands of disclosed
              real-world vulnerability reports, selected per feature.
            </p>
          </Card>
          <Card className="cov">
            <h4>Human-gated verification</h4>
            <p>
              A named operator verifies, writes and signs every report. Nothing is
              auto-submitted &mdash; ever.
            </p>
          </Card>
        </div>
      </section>

      <section className="wrap center rv" id="governance">
        <SectionHead
          eyebrow="Governance"
          title="Mechanical scope. Full audit trail."
          center
        />
        <div className="blocks c3 stagger">
          <Card className="cov">
            <h4>Every action logged</h4>
            <p>
              Every action the engine takes is logged and auditable &mdash;
              replayable end to end for your auditors.
            </p>
          </Card>
          <Card className="cov">
            <h4>Limits enforced mechanically</h4>
            <p>
              Scope, timing and intensity limits are enforced in the harness, not
              left to good intentions.
            </p>
          </Card>
          <Card className="cov">
            <h4>Signed rules of engagement</h4>
            <p>
              Authorized testing only. Both sides sign before a single request is
              sent.
            </p>
          </Card>
        </div>
      </section>

      <DifferentiatorTable />
      <FinalCTA />
    </>
  );
}

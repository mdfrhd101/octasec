import Link from "next/link";
import Hero from "./components/Hero";
import SectionHead from "./components/SectionHead";
import Card from "./components/Card";
import DifferentiatorTable from "./components/DifferentiatorTable";
import FinalCTA from "./components/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Hero />

      <section className="wrap rv" style={{ paddingBlock: "clamp(26px,4vw,44px)" }}>
        <div className="complybar stagger">
          <span className="cb-lbl">Proof</span>
          <span className="cb-item">104-app public benchmark suite</span>
          <span className="cb-item">90+ technique modules</span>
          <span className="cb-item">100% human-verified findings</span>
          <span className="cb-item">Every action logged</span>
        </div>
      </section>

      <section className="wrap center rv" id="problem">
        <SectionHead
          eyebrow="The problem"
          title={<>Your last &ldquo;pentest&rdquo; was a scanner PDF.</>}
          center
        />
        <p className="lead">
          Most affordable pentests are automated scans with a logo on top. They
          find what&apos;s known, miss what&apos;s specific to your app, and never
          prove impact. Real breaches chain three boring bugs into one critical
          incident. Scanners don&apos;t chain anything.
        </p>
      </section>

      <section className="wrap center rv" id="solution">
        <SectionHead eyebrow="The difference" title="Proof, not noise." center />
        <div className="blocks c3 stagger">
          <Card className="cov">
            <h4>The attacks others miss</h4>
            <p>
              Business logic, auth flows, race conditions, multi-step chains
              &mdash; the classes scanners are structurally blind to. Every
              parameter, every state transition, every trust boundary.
            </p>
          </Card>
          <Card className="cov">
            <h4>Proof, not noise</h4>
            <p>
              Every finding is a complete case file: the chained attack path, a
              working reproduction, the decision log, and developer-ready
              remediation. If we can&apos;t prove it, we don&apos;t report it.
            </p>
          </Card>
          <Card className="cov">
            <h4>Human-gated, always</h4>
            <p>
              AI does the grinding. A named human operator verifies, writes, and
              signs every report. Nothing is auto-submitted. Ever.
            </p>
          </Card>
        </div>
      </section>

      <section className="wrap center rv" id="how">
        <SectionHead
          eyebrow="How it works"
          title={<>Scope &rarr; Map &rarr; Hunt &rarr; Prove.</>}
          text="You define the target; the engine does the thousands of hours of grinding; humans do the judgment."
          center
        />
        <div className="steps stagger">
          <Card className="st">
            <div className="sn">01</div>
            <h3>Scope</h3>
            <p>
              You define assets and rules of engagement; we both sign. Scope is
              enforced at the network level, not just on paper.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">02</div>
            <h3>Map</h3>
            <p>
              Subdomains, ports, services, JS-hidden endpoints, technology
              fingerprinting, cloud assets, leaked secrets.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">03</div>
            <h3>Hunt</h3>
            <p>
              90+ offensive technique modules selected per feature by the engine
              &mdash; never sprayed. Multi-account, multi-role.
            </p>
          </Card>
          <Card className="st">
            <div className="sn">04</div>
            <h3>Prove &amp; report</h3>
            <p>
              Minimum-impact proofs, human review, then a case-file report. Retest
              included.
            </p>
          </Card>
        </div>
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 30 }}>
          <Link className="link" href="/how-it-works">
            See the full method <span className="ar">&rarr;</span>
          </Link>
        </div>
      </section>

      <section className="wrap rv" id="pricing-anchor">
        <SectionHead
          eyebrow="Pricing"
          title="Priced for the companies attackers actually target."
          center
        />
        <div className="anchorb">
          <p className="lead">
            A traditional deep pentest costs $15&ndash;40k and takes weeks. OctaSec
            engagements start at a fraction of that, finish in days, and include a
            free retest. Contact us for a scoped quote &mdash; fixed price, no
            surprises.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-white" href="/contact">
              Get a scoped quote
            </Link>
            <Link className="link" href="/services">
              Browse services <span className="ar">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <DifferentiatorTable />
      <FinalCTA />
    </>
  );
}

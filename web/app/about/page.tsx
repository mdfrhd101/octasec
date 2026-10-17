import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import SectionHead from "../components/SectionHead";
import Card from "../components/Card";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — About",
  description:
    "OctaSec is the offensive-security engine of Octagram Ltd, trusted by CID, DMP, RAB & CTTC.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={
          <>
            OctaSec is Octagram&apos;s
            <br />
            offensive engine.
          </>
        }
        ctas={<ScopeCTA />}
      />

      <section className="wrap rv">
        <div className="anchorb" style={{ maxWidth: "68ch" }}>
          <p className="lead" style={{ textAlign: "left" }}>
            OctaSec is the autonomous offensive-security engine of Octagram Ltd
            &mdash; the Dhaka-based security firm trusted by CID, Dhaka
            Metropolitan Police, RAB and CTTC. Octagram&apos;s red team built
            OctaSec to answer one question: why should deep security testing be a
            luxury?
          </p>
          <p className="lead" style={{ textAlign: "left", marginTop: 16 }}>
            The engine pairs AI-orchestrated hunting with a skill library distilled
            from thousands of disclosed real-world vulnerability reports. Every
            engagement is human-led, human-verified, and human-signed &mdash; the
            same operators Octagram&apos;s government clients already trust.
          </p>
        </div>
      </section>

      <section className="wrap rv" style={{ paddingBlock: "clamp(26px,4vw,44px)" }}>
        <div className="complybar stagger">
          <span className="cb-lbl">The team behind OctaSec serves</span>
          <span className="cb-item">CID</span>
          <span className="cb-item">Dhaka Metropolitan Police</span>
          <span className="cb-item">RAB</span>
          <span className="cb-item">CTTC</span>
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead
          eyebrow="One firm, two faces"
          title="The engine, and the full-service team behind it."
          text="OctaSec is a product of Octagram Limited — built, run and signed off by Octagram's own security team."
          center
        />
        <div className="blocks stagger">
          <Card className="cov">
            <h4>OctaSec</h4>
            <p>
              Octagram&apos;s productized offensive engine &mdash; AI-orchestrated
              hunting, human-gated, fixed-price.
            </p>
          </Card>
          <Card className="cov">
            <h4>Octagram</h4>
            <p>
              The parent firm behind OctaSec &mdash; full-service security, red
              team, and six service lines.{" "}
              <a href="https://octagramltd.com" style={{ color: "var(--gold)" }}>
                Visit Octagram &#8599;
              </a>
            </p>
          </Card>
        </div>
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 30 }}>
          <a className="link" href="https://octagramltd.com">
            Meet the team <span className="ar">&rarr;</span>
          </a>
          <span
            style={{
              fontFamily: "var(--m)",
              fontSize: 12,
              color: "var(--faint)",
              alignSelf: "center",
            }}
          >
            Careers &mdash; coming soon
          </span>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}

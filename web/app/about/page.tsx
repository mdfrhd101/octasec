import { pageMeta } from "../lib/seo";
import Link from "next/link";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import SectionHead from "../components/SectionHead";
import Card from "../components/Card";
import FinalCTA from "../components/FinalCTA";

export const metadata = pageMeta({
  title: "About — An Octagram Company",
  description:
    "OctaSec is the offensive-security product of Octagram Limited, a Dhaka-based cybersecurity firm trusted by CID, DMP, SRB & CTTC. Human-gated AI penetration testing.",
  keywords: ["about OctaSec", "Octagram Limited", "cybersecurity company Bangladesh", "Dhaka penetration testing company"],
  path: "/about",
});

// Agencies the Octagram team behind OctaSec has served. To use real emblems, drop the
// files in web/public/agencies/ and add `logo: "/agencies/<file>"` — the card then renders
// the image instead of the monogram mark.
const AGENCIES: { acr: string; name: string; logo?: string }[] = [
  { acr: "CID", name: "Criminal Investigation Department", logo: "/agencies/cid.png" },
  { acr: "DMP", name: "Dhaka Metropolitan Police", logo: "/agencies/dmp.png" },
  { acr: "SRB", name: "Special Response Battalion", logo: "/agencies/srb.png" },
  { acr: "CTTC", name: "Counter Terrorism & Transnational Crime", logo: "/agencies/cttc.webp" },
];

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
            Metropolitan Police, Special Response Battalion and CTTC.
            Octagram&apos;s red team built
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

      <section className="wrap center rv" style={{ paddingBlock: "clamp(28px,4vw,48px)" }}>
        <span className="eyebrow">Organizations served</span>
        <p className="lead" style={{ margin: "18px auto 0", maxWidth: "54ch" }}>
          The Octagram red team behind OctaSec has delivered security work for
          Bangladesh&apos;s leading law-enforcement agencies.
        </p>
        <div className="agencies stagger">
          {AGENCIES.map((a) => (
            <div className="agency" key={a.acr} title={a.name}>
              <div className="agency-mark">
                {a.logo ? <img src={a.logo} alt={`${a.name} logo`} /> : a.acr}
              </div>
              <div className="agency-name">{a.name}</div>
            </div>
          ))}
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
            <h3>OctaSec</h3>
            <p>
              Octagram&apos;s productized offensive engine &mdash; AI-orchestrated
              hunting, human-gated, fixed-price.
            </p>
          </Card>
          <Card className="cov">
            <h3>Octagram</h3>
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

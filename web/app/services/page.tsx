import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import SectionHead from "../components/SectionHead";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — Services",
  description:
    "Web application pentest, API security assessment, attack-surface audit, continuous monitoring, AI/LLM testing — a pentest for startups and enterprises alike.",
  alternates: { canonical: "/services" },
};

function Svc({
  tag,
  name,
  cover,
  receive,
  timeline,
}: {
  tag: string;
  name: ReactNode;
  cover: ReactNode;
  receive: ReactNode[];
  timeline: string;
}) {
  return (
    <div className="card svc">
      <span className="tag">{tag}</span>
      <h3>{name}</h3>
      <p className="cv">{cover}</p>
      <ul>
        {receive.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <div className="tl">Typical timeline &middot; {timeline}</div>
      <div className="more">
        <Link className="link" href="/contact">
          Book scoping call <span className="ar">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <>
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

      <section className="wrap rv">
        <div className="svcgrid stagger">
          <Svc
            tag="S1"
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
            name={<>Network &amp; Wireless Assessment</>}
            cover="Delivered via Octagram's red team — the engine assists, humans lead."
            receive={[
              "Internal/external network testing",
              "Wireless assessment",
              "Red-team-led engagement",
            ]}
            timeline="Scoped"
          />
        </div>
      </section>

      <section className="wrap center rv">
        <SectionHead
          eyebrow="Not sure which?"
          title="Tell us what you're afraid of."
          text="A free scoping call sizes the right engagement — and if a scanner is genuinely enough for you, we'll say so."
          center
        />
        <div className="hero-cta" style={{ justifyContent: "center", marginTop: 24 }}>
          <Link className="btn btn-white" href="/contact">
            Book a scoping call
          </Link>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}

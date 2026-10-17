import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";

export const metadata: Metadata = {
  title: "OctaSec — Legal",
  description:
    "Authorized testing only. Responsible disclosure and security.txt.",
  alternates: { canonical: "/legal" },
};

export default function LegalPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Authorized testing only."
        sub="Signed rules of engagement. Scope enforced mechanically."
      />
      <section className="wrap rv">
        <div className="legal">
          <h3>Authorized testing only</h3>
          <p>
            OctaSec tests only assets you own or are explicitly authorized to test,
            under signed rules of engagement agreed before any request is sent.
            Scope, timing and intensity limits are enforced in the harness &mdash;
            out-of-scope assets are technically unreachable.
          </p>
          <h3 id="disclosure">Responsible disclosure</h3>
          <p>
            Found a security issue in OctaSec or octasec.ai itself? Report it in
            good faith and we&apos;ll work with you. Please give us reasonable time
            to remediate before any public disclosure. Contact{" "}
            <code>security@octasec.ai</code>.
          </p>
          <h3>security.txt</h3>
          <p>
            Our machine-readable security contact lives at{" "}
            <code>/.well-known/security.txt</code>.
          </p>
          <h3>Rules of engagement</h3>
          <p>
            A sample rules-of-engagement document is available on request and will
            be published here. <span className="pending">Sample PDF coming soon.</span>
          </p>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}

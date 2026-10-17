import Link from "next/link";
import SealScanner from "./SealScanner";

/** Home hero (v2): two-tone headline on the left, the live Seal Scanner on the right. */
export default function Hero() {
  return (
    <section className="hero hero2">
      <div className="hero-stars" aria-hidden="true" />
      <div className="glow" aria-hidden="true" />
      <div className="in wrap hero2-grid">
        <div className="hero2-copy">
          <span className="eyebrow">From the team trusted by CID, DMP, RAB &amp; CTTC</span>
          <h1>
            <span className="l1" id="l1">Enterprise-grade pentesting.</span>
            <span className="l2">Startup-grade pricing.</span>
          </h1>
          <p className="hero-sub">
            OctaSec is Octagram&apos;s AI-orchestrated offensive engine, supervised by
            human operators. It maps your attack surface, chains weaknesses into real
            attack paths &mdash; and proves every finding before it reaches your inbox.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-white" href="/contact">
              Book a scoping call <span aria-hidden="true">&rsaquo;</span>
            </Link>
            <Link className="btn btn-ghost" href="/how-it-works">
              See how it works
            </Link>
          </div>
        </div>
        <SealScanner />
      </div>
      <a className="scroll-cue" href="#proof" aria-label="Scroll to see more"><span /></a>
    </section>
  );
}

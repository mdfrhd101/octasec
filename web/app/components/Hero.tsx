import Link from "next/link";
import NetworkCanvas from "./NetworkCanvas";
import HeroTerminal from "./HeroTerminal";

/** Home hero: gold network canvas, gold-sheen headline, live terminal. */
export default function Hero() {
  return (
    <section className="hero">
      <NetworkCanvas variant="hero" />
      <div className="glow" aria-hidden="true" />
      <div className="grid" aria-hidden="true" />
      <div className="veil" aria-hidden="true" />
      <div className="in wrap">
        <span className="eyebrow">
          From the team trusted by CID, DMP, RAB &amp; CTTC
        </span>
        <h1>
          <span className="l1" id="l1">
            Enterprise-grade pentesting.
          </span>
          <span className="l2">Startup-grade pricing.</span>
        </h1>
        <p className="hero-sub">
          OctaSec is Octagram&apos;s AI-orchestrated offensive engine, supervised
          by human operators. It maps your attack surface, hunts every input,
          chains weaknesses into real attack paths &mdash; and proves every
          finding before it reaches your inbox.
        </p>
        <div className="hero-cta">
          <Link className="btn btn-white" href="/contact">
            Book a scoping call
          </Link>
          <Link className="link" href="/how-it-works">
            See how it works <span className="ar">&rarr;</span>
          </Link>
        </div>
        <HeroTerminal />
      </div>
    </section>
  );
}

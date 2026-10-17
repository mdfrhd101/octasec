import Link from "next/link";
import NetworkCanvas from "./NetworkCanvas";

/** Final CTA band with the gold particle field (finalCTA in build-site.js). */
export default function FinalCTA() {
  return (
    <section id="start">
      <div className="final">
        <NetworkCanvas variant="final" />
        <div className="in wrap">
          <h2 className="mh">One finding pays for the engagement.</h2>
          <p>
            Book a 30-minute scoping call &mdash; if a scanner is enough for you,
            we&apos;ll say so.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-white" href="/contact">
              Book a scoping call
            </Link>
            <Link className="link" href="/benchmarks">
              See our benchmarks <span className="ar">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

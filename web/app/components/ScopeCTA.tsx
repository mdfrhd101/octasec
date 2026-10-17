import Link from "next/link";

/** Primary scoping CTA pair used across sub-pages (scopeCTA in build-site.js). */
export default function ScopeCTA() {
  return (
    <div className="hero-cta">
      <Link className="btn btn-white" href="/contact">
        Book a scoping call
      </Link>
      <Link className="link" href="/how-it-works">
        See how it works <span className="ar">&rarr;</span>
      </Link>
    </div>
  );
}

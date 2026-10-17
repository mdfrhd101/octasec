import Link from "next/link";
import BrandMark from "./BrandMark";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <span className="brand foot-brand" style={{ color: "var(--text)" }}>
              <BrandMark /> OCTASEC
            </span>
            <p
              className="muted"
              style={{
                marginTop: 14,
                maxWidth: "30em",
                fontSize: "13.5px",
                lineHeight: 1.6,
              }}
            >
              Octagram&apos;s AI-orchestrated offensive engine, supervised by human
              operators &mdash; enterprise-grade pentesting at startup-grade pricing.{" "}
              <a href="https://octagramltd.com" style={{ color: "var(--gold)" }}>
                An Octagram Ltd product &#8599;
              </a>
            </p>
          </div>
          <div>
            <h5>Product</h5>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/services">Services</Link>
            <Link href="/benchmarks">Benchmarks</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div>
            <h5>Company</h5>
            <Link href="/about">About</Link>
            <a href="https://octagramltd.com">Octagram Ltd &#8599;</a>
            <Link href="/contact">Contact</Link>
          </div>
          <div>
            <h5>Portal</h5>
            <a href="/portal/">Sign in</a>
            <a href="/portal/">Client portal</a>
            <a href="/portal/">Corporate portal</a>
          </div>
          <div>
            <h5>Legal</h5>
            <Link href="/legal">Legal &amp; RoE</Link>
            <Link href="/legal#disclosure">Responsible disclosure</Link>
            <a href="/.well-known/security.txt">security.txt</a>
          </div>
        </div>
        <p className="foot-roe">
          Authorized testing only &middot; Signed rules of engagement &middot; Scope
          enforced mechanically
        </p>
        <div className="foot-bottom">
          <span>
            &copy; 2026 Octagram Limited &middot; OctaSec &mdash; an Octagram Ltd
            product
          </span>
          <span>
            Dhaka &middot;{" "}
            <span style={{ color: "var(--gold)" }}>Expect Excellence</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import BrandLockup from "./BrandLockup";
import BackToTop from "./BackToTop";

export const CONTACT = { email: "support@octasec.ai", phone: "+8801326875385", phoneLabel: "+880 1326-875385" };

// Octagram Limited's official profiles (as linked from octagramltd.com)
const SOCIAL = [
  {
    name: "Facebook", href: "https://www.facebook.com/OctagramLimited",
    icon: <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5H16.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3Z" fill="currentColor" />,
  },
  {
    name: "YouTube", href: "https://www.youtube.com/channel/UCIyZAHtckz1S_VGDSM0pnPw",
    icon: <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" fill="currentColor" />,
  },
  {
    name: "LinkedIn", href: "https://www.linkedin.com/company/octagramofficial",
    icon: <path d="M6.9 8.6H3.6V20h3.3V8.6ZM5.2 3.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8ZM20.4 13.7c0-3.2-1.7-5.3-4.5-5.3-1.5 0-2.6.8-3 1.6V8.6H9.7V20H13v-5.7c0-1.5.3-2.9 2.1-2.9s1.9 1.7 1.9 3V20h3.3l.1-6.3Z" fill="currentColor" />,
  },
  {
    name: "Instagram", href: "https://www.instagram.com/octagramofficial/",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
      </>
    ),
  },
];

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <span className="brand foot-brand" style={{ color: "var(--text)" }}>
              <BrandLockup height={26} gradientId="octasecLockupFoot" />
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
            <div className="foot-contact">
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <a href={`tel:${CONTACT.phone}`}>{CONTACT.phoneLabel}</a>
            </div>
          </div>
          <div>
            <h2>Product</h2>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/services">Services</Link>
            <Link href="/benchmarks">Benchmarks</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div>
            <h2>Company</h2>
            <Link href="/about">About</Link>
            <a href="https://octagramltd.com">Octagram Ltd &#8599;</a>
            <Link href="/contact">Contact</Link>
          </div>
          <div>
            <h2>Portal</h2>
            <a href="/portal/">Sign in</a>
            <a href="/portal/">Client portal</a>
            <a href="/portal/">Corporate portal</a>
          </div>
        </div>
        <p className="foot-roe">
          Authorized testing only &middot; Signed rules of engagement &middot; Scope
          enforced mechanically
        </p>

        <div className="foot-bar">
          <span className="foot-copy">
            &copy; 2026 Octagram Limited. All rights reserved. &middot;{" "}
            <Link href="/legal#privacy">Privacy</Link> &middot; <Link href="/legal#terms">Terms</Link>
          </span>
          <nav className="foot-social" aria-label="Octagram on social media">
            {SOCIAL.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>
              </a>
            ))}
          </nav>
          <BackToTop />
        </div>
      </div>
      {/* oversized wordmark, cropped by the page edge — decorative */}
      <div className="foot-mark" aria-hidden="true">OCT<span className="fm-a">A</span>SEC</div>
    </footer>
  );
}

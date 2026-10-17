import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import SiteMotion from "./components/SiteMotion";
import { SITE_URL, PLAUSIBLE_DOMAIN } from "./site";

const KEYWORDS = [
  "affordable penetration testing",
  "AI pentest service",
  "VAPT Bangladesh",
  "API security assessment",
  "pentest for startups",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "OctaSec — Affordable penetration testing",
  description:
    "Affordable penetration testing at enterprise depth. OctaSec is Octagram's AI pentest service — human-verified findings, startup-grade pricing. VAPT for Bangladesh and beyond.",
  keywords: KEYWORDS,
  applicationName: "OctaSec",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "OctaSec",
    title: "OctaSec — Affordable penetration testing",
    description:
      "Octagram's human-gated, AI-orchestrated pentest service. Every finding human-verified. Enterprise-grade pentesting. Startup-grade pricing.",
    url: SITE_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OctaSec — Enterprise-grade pentesting. Startup-grade pricing." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OctaSec — Affordable penetration testing",
    description: "Human-gated, AI-orchestrated pentesting. Every finding human-verified.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="js" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Share+Tech+Mono&display=swap"
        />
        {/* Plausible analytics (privacy-friendly, cookieless) — only when configured at build time */}
        {PLAUSIBLE_DOMAIN ? (
          <script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" />
        ) : null}
      </head>
      <body>
        <div className="scroll-prog" id="scrollProg" aria-hidden="true" />
        <Nav />
        <main>{children}</main>
        <Footer />
        <SiteMotion />
      </body>
    </html>
  );
}

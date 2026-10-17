import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import SiteMotion from "./components/SiteMotion";

const KEYWORDS = [
  "affordable penetration testing",
  "AI pentest service",
  "VAPT Bangladesh",
  "API security assessment",
  "pentest for startups",
];

export const metadata: Metadata = {
  metadataBase: new URL("https://octasec.ai"),
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
    url: "https://octasec.ai",
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
        {/* Plausible analytics (privacy-friendly, cookieless) */}
        <script
          defer
          data-domain="octasec.ai"
          src="https://plausible.io/js/script.js"
        />
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

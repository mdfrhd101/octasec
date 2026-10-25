import type { Metadata, Viewport } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
import "./landing-v2.css";
import "./hover-interactive.css";
import "./polish.css";
import "./mobile.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import FloatingCheck from "./components/FloatingCheck";
import CursorFX from "./components/CursorFX";
import SiteMotion from "./components/SiteMotion";
import SmoothScroll from "./components/SmoothScroll";
import JsonLd from "./components/JsonLd";
import { SITE_URL, PLAUSIBLE_DOMAIN } from "./site";
import { organizationLd, websiteLd } from "./lib/seo";

// Primary + secondary keyword clusters (grounded in PTaaS / AI-pentest / VAPT research).
const KEYWORDS = [
  "AI penetration testing",
  "penetration testing as a service",
  "PTaaS",
  "automated penetration testing",
  "VAPT",
  "vulnerability assessment and penetration testing",
  "affordable penetration testing",
  "web application penetration testing",
  "API security testing",
  "human-verified pentest",
  "OWASP Top 10 testing",
  "red teaming",
  "penetration testing Bangladesh",
  "pentest for startups",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OctaSec — AI Penetration Testing & Affordable VAPT",
    template: "%s | OctaSec",
  },
  description:
    "AI-orchestrated, human-verified penetration testing. Web, API, mobile & network VAPT — every finding proven and signed by a named operator. Startup-grade pricing.",
  keywords: KEYWORDS,
  applicationName: "OctaSec",
  authors: [{ name: "Octagram Limited", url: "https://octagramltd.com" }],
  creator: "Octagram Limited",
  publisher: "Octagram Limited",
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "OctaSec",
    locale: "en_US",
    title: "OctaSec — AI Penetration Testing, Human-Verified",
    description:
      "Octagram's human-gated, AI-orchestrated pentest service. Every finding proven and signed. Enterprise-grade pentesting. Startup-grade pricing.",
    url: SITE_URL,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OctaSec — Enterprise-grade pentesting. Startup-grade pricing." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OctaSec — AI Penetration Testing, Human-Verified",
    description: "Human-gated, AI-orchestrated pentesting. Every finding proven and signed by a named operator.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

// One viewport tag (a hand-written <meta> here duplicated Next's default one).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="js" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f4f7fb" />
        {/* No-FOUC theme: default LIGHT (day) mode; honour a saved choice before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('octasec-theme');if(t!=='dark'&&t!=='light')t='light';document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',t==='light'?'#f4f7fb':'#00080b');}catch(e){}})();",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        {/* Plausible analytics (privacy-friendly, cookieless) — only when configured at build time */}
        {PLAUSIBLE_DOMAIN ? (
          <script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" />
        ) : null}
      </head>
      <body>
        <JsonLd data={[organizationLd, websiteLd]} />
        <Nav />
        <main>{children}</main>
        <Footer />
        <FloatingCheck />
        <CursorFX />
        <SiteMotion />
        <SmoothScroll />
      </body>
    </html>
  );
}

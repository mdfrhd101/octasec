import type { Metadata } from "next";
import { SITE_URL } from "../site";

const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "OctaSec — Enterprise-grade pentesting. Startup-grade pricing." };

// Build consistent per-page metadata, so every page carries its OWN og:title /
// og:description / canonical (Next does not derive og:title from <title>).
export function pageMeta(o: { title: string; description: string; path: string; keywords?: string[] }): Metadata {
  const ogTitle = `${o.title} | OctaSec`;
  return {
    title: o.title,
    description: o.description,
    keywords: o.keywords,
    alternates: { canonical: o.path },
    openGraph: {
      type: "website",
      siteName: "OctaSec",
      locale: "en_US",
      title: ogTitle,
      description: o.description,
      url: o.path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description: o.description, images: ["/og.png"] },
  };
}

// The Scope → Map → Hunt → Prove process (used on /how-it-works).
export const howItWorksLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How OctaSec penetration testing works",
  description: "How an OctaSec AI-orchestrated, human-verified penetration test runs end to end: scope, map, hunt, prove.",
  step: [
    { "@type": "HowToStep", position: 1, name: "Scoping", text: "You define assets and rules of engagement; we both sign. The engine enforces scope at the network level — out-of-scope assets are technically unreachable, not just contractually." },
    { "@type": "HowToStep", position: 2, name: "Surface mapping", text: "Subdomains, ports, services, JS-hidden endpoints, technology fingerprinting, cloud assets and leaked secrets. You keep the map even if you don't buy the hunt." },
    { "@type": "HowToStep", position: 3, name: "The hunt", text: "90+ offensive technique modules — injection, auth bypass, IDOR, SSRF, business logic, race conditions, cloud misconfig, LLM-feature attacks — selected per feature by the engine, never sprayed." },
    { "@type": "HowToStep", position: 4, name: "Proof & report", text: "Minimum-impact deterministic proofs (never destructive), human operator review, then a case-file report: severity, root cause, raw request/response evidence and fix guidance. Retest included." },
  ],
};

// Central structured-data definitions (schema.org). Kept here so the
// Organization identity stays consistent across every page.

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "OctaSec",
  legalName: "OctaSec (a product of Octagram Limited)",
  url: SITE_URL,
  logo: `${SITE_URL}/apple-icon.png`,
  image: `${SITE_URL}/og.png`,
  description:
    "OctaSec is an AI-orchestrated, human-verified penetration testing (VAPT) service by Octagram Limited. Every finding is proven and signed by a named operator.",
  slogan: "Enterprise-grade pentesting. Startup-grade pricing.",
  parentOrganization: {
    "@type": "Organization",
    name: "Octagram Limited",
    url: "https://octagramltd.com",
  },
  foundingLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressLocality: "Dhaka", addressCountry: "BD" },
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@octasec.ai",
    telephone: "+8801326875385",
    contactType: "customer support",
    areaServed: "Worldwide",
    availableLanguage: ["English", "Bengali"],
  },
  sameAs: [
    "https://octagramltd.com",
    "https://www.facebook.com/OctagramLimited",
    "https://www.linkedin.com/company/octagramofficial",
    "https://www.instagram.com/octagramofficial",
  ],
  knowsAbout: [
    "Penetration Testing",
    "AI Penetration Testing",
    "Penetration Testing as a Service",
    "Vulnerability Assessment and Penetration Testing",
    "Web Application Security",
    "API Security Testing",
    "Red Teaming",
    "OWASP Top 10",
  ],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  name: "OctaSec",
  url: SITE_URL,
  description: "AI-orchestrated, human-verified penetration testing. Affordable VAPT for startups and enterprises.",
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

// The core service offering — used on the homepage.
export const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Penetration Testing as a Service",
  serviceType: "Penetration Testing",
  provider: { "@id": ORG_ID },
  areaServed: "Worldwide",
  url: SITE_URL,
  description:
    "AI-orchestrated penetration testing with a human verification gate. Web, API, mobile and network VAPT — every finding proven in a headless browser, database or out-of-band callback, then reviewed and signed by a named operator. OWASP Top 10 / ASVS by default; SOC 2, ISO 27001 and PCI DSS mapping available.",
  audience: { "@type": "Audience", audienceType: "Startups and enterprises" },
  termsOfService: `${SITE_URL}/legal/`,
};

// Helper to build a BreadcrumbList for a page.
export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  };
}

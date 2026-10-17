import type { MetadataRoute } from "next";

const DOMAIN = "https://octasec.ai";

// Public pages only — the portal is a separate app and is not indexed.
const PATHS = [
  "",
  "how-it-works",
  "services",
  "benchmarks",
  "pricing",
  "faq",
  "about",
  "contact",
  "legal",
];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PATHS.map((p) => ({
    url: p ? `${DOMAIN}/${p}/` : `${DOMAIN}/`,
    lastModified,
  }));
}

import type { MetadataRoute } from "next";

import { SITE_URL } from "./site";
import { getAllPosts } from "./lib/blog";
const DOMAIN = SITE_URL;

type Freq = "weekly" | "monthly";
// Public pages only — the portal is a separate app and is not indexed.
// [path, priority, changeFrequency]
const PAGES: [string, number, Freq][] = [
  ["", 1.0, "weekly"],
  ["services", 0.9, "monthly"],
  ["how-it-works", 0.8, "monthly"],
  ["benchmarks", 0.8, "weekly"],
  ["blog", 0.8, "weekly"],
  ["pricing", 0.8, "monthly"],
  ["contact", 0.7, "monthly"],
  ["faq", 0.6, "monthly"],
  ["about", 0.6, "monthly"],
  ["legal", 0.3, "monthly"],
];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pages = PAGES.map(([p, priority, changeFrequency]) => ({
    url: p ? `${DOMAIN}/${p}/` : `${DOMAIN}/`,
    lastModified,
    changeFrequency,
    priority,
  }));
  const posts = getAllPosts().map((post) => ({
    url: `${DOMAIN}/blog/${post.slug}/`,
    lastModified: post.date ? new Date(post.date) : lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...pages, ...posts];
}

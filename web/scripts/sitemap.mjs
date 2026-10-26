// Writes public/sitemap.xml before every build (npm "prebuild"), so the sitemap is a real file in the
// repo that Next copies into the static export (served as /sitemap.xml; robots.ts points to it).
// Pages are listed here; blog posts come from content/blog/*.md (slug + date from the front matter),
// so a new post lands in the sitemap automatically. No build timestamps: the file only changes when
// the content does. Run by hand with `npm run sitemap`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))); // web/
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://octasec.ai").replace(/\/+$/, "");

// Public pages only — the portal is a separate app and is not indexed. [path, priority, changefreq]
const PAGES = [
  ["", 1.0, "weekly"],
  ["services", 0.9, "monthly"],
  ["how-it-works", 0.8, "monthly"],
  ["benchmarks", 0.8, "weekly"],
  ["blog", 0.8, "weekly"],
  ["pricing", 0.8, "monthly"],
  ["php2shell", 0.9, "weekly"],
  ["website-check", 0.9, "weekly"],
  ["contact", 0.7, "monthly"],
  ["faq", 0.6, "monthly"],
  ["about", 0.6, "monthly"],
  ["legal", 0.3, "monthly"],
];

const BLOG = path.join(ROOT, "content", "blog");
const posts = fs
  .readdirSync(BLOG)
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const raw = fs.readFileSync(path.join(BLOG, f), "utf8");
    const fm = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || "";
    const field = (k) => (fm.match(new RegExp(`^${k}:\\s*"?([^"\\r\\n]+?)"?\\s*$`, "m")) || [])[1] || "";
    return { slug: field("slug") || f.replace(/\.md$/, ""), date: field("date") };
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
const newest = posts.map((p) => p.date).filter(Boolean).sort().pop() || "";

const entry = (loc, lastmod, changefreq, priority) =>
  [
    "  <url>",
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    "  </url>",
  ].join("\n");

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  // the blog index changes when a post is added: its lastmod is the newest post's date
  ...PAGES.map(([p, priority, freq]) => entry(p ? `${SITE}/${p}/` : `${SITE}/`, p === "blog" ? newest : "", freq, priority)),
  ...posts.map((p) => entry(`${SITE}/blog/${p.slug}/`, p.date, "monthly", 0.7)),
  "</urlset>",
  "",
].join("\n");

const out = path.join(ROOT, "public", "sitemap.xml");
const prev = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
if (prev !== xml) fs.writeFileSync(out, xml);
console.log(`sitemap.xml: ${PAGES.length + posts.length} URLs (${prev === xml ? "unchanged" : "written"})`);

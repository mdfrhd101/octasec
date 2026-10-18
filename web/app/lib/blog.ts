import fs from "node:fs";
import path from "node:path";

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  body: string;
};

const DIR = path.join(process.cwd(), "content", "blog");

// Reading order for the /blog index (README suggests post-01 first).
const ORDER = [
  "why-autonomous-pentesting-needed-a-reset",
  "benchmark-journey-xben",
  "how-we-verify",
  "agent-failure-modes",
];

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "").trim();
}

function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data: Record<string, string | string[]> = {};
  let body = raw;
  if (m) {
    body = raw.slice(m[0].length);
    for (const line of m[1].split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const rawVal = line.slice(idx + 1).trim();
      if (key === "tags") {
        data[key] = rawVal
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((s) => stripQuotes(s))
          .filter(Boolean);
      } else {
        data[key] = stripQuotes(rawVal);
      }
    }
  }
  // drop the leading H1 — the page renders the title in the hero
  body = body.replace(/^\s*#\s+.*(\r?\n)+/, "");
  return { data, body };
}

export function getAllPosts(): Post[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const posts = files.map((f) => {
    const raw = fs.readFileSync(path.join(DIR, f), "utf8");
    const { data, body } = parseFrontmatter(raw);
    return {
      slug: (data.slug as string) || f.replace(/\.md$/, ""),
      title: (data.title as string) || f,
      description: (data.description as string) || "",
      date: (data.date as string) || "",
      tags: (data.tags as string[]) || [],
      body,
    } satisfies Post;
  });
  posts.sort((a, b) => {
    const ia = ORDER.indexOf(a.slug);
    const ib = ORDER.indexOf(b.slug);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return b.date.localeCompare(a.date);
  });
  return posts;
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

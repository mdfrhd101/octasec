import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Prose from "../../components/Prose";
import ShareButtons from "../../components/ShareButtons";
import FinalCTA from "../../components/FinalCTA";
import JsonLd from "../../components/JsonLd";
import AutoSlider from "../../components/AutoSlider";
import HudField from "../../components/hud/HudField";
import { getAllPosts, getPost, formatDate } from "../../lib/blog";
import { SITE_URL } from "../../site";
import { ORG_ID, breadcrumbLd } from "../../lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}/`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.date,
      authors: ["OctaSec"],
      tags: post.tags,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og.png"],
    },
  };
}

const v = (vars: Record<string, number>) => vars as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");
const readMins = (body: string) => Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 230));

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const all = getAllPosts();
  const others = all.filter((p) => p.slug !== post.slug).slice(0, 3);
  const mins = readMins(post.body);
  const sections = (post.body.match(/^## /gm) || []).length;
  const index = all.findIndex((p) => p.slug === post.slug) + 1;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "OctaSec", url: SITE_URL },
    publisher: { "@id": ORG_ID },
    image: `${SITE_URL}/og.png`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}/` },
    keywords: post.tags.join(", "),
    inLanguage: "en",
  };

  return (
    <div className="pg-post">
      <JsonLd data={[articleLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: post.title, path: `/blog/${post.slug}/` }])]} />
      {/* reading progress along the top edge (CSS scroll timeline; hidden where unsupported) */}
      <i className="pc-progress" aria-hidden="true" />

      <article className="pc-article">
        <HudField variant="hero" />
        {/* article hero: back link, meta, the title rising word by word, tags */}
        <header className="pc-hero" data-rv>
          <Link href="/blog" className="h-edge pc-back">
            <span aria-hidden="true">&larr;</span> All posts
          </Link>
          <div className="pc-meta">
            <span className="h-tag ok"><i className="h-dot" />Field note {pad(index)}</span>
            <span className="h-lbl pc-date">{formatDate(post.date)}</span>
            <span className="h-lbl pc-mins">{mins} min read</span>
          </div>
          <h1 className="h-title h-split pc-title">{post.title}</h1>
          <p className="pc-sub">{post.description}</p>
          <ul className="pc-tags" aria-label="Tags">
            {post.tags.map((t, i) => (
              <li key={t} className="h-tag" style={v({ "--i": i })}>{t}</li>
            ))}
          </ul>
        </header>

        {/* desktop: a case-file readout that stays beside the text while you read */}
        <aside className="pc-rail" aria-label="About this post">
          <div className="h-panel pc-file">
            <div className="h-ph">
              <span className="h-lbl">Field note {pad(index)} / {pad(all.length)}</span>
              <span className="h-tag ok"><i className="h-dot" />Published</span>
            </div>
            <dl className="pc-dl">
              <div><dt>Filed</dt><dd>{formatDate(post.date)}</dd></div>
              <div><dt>Read</dt><dd>{mins} min</dd></div>
              <div><dt>Sections</dt><dd>{pad(sections)}</dd></div>
              <div><dt>Tags</dt><dd>{pad(post.tags.length)}</dd></div>
            </dl>
            <div className="hs-cells pc-cells" aria-hidden="true">
              {Array.from({ length: mins }, (_, j) => <i key={j} style={v({ "--i": j * 3 })} />)}
            </div>
            <div className="pc-read" aria-hidden="true">
              <span className="h-lbl">Progress</span>
              <i />
            </div>
            <Link href="/blog" className="h-edge pc-rail-back">
              <span aria-hidden="true">&larr;</span> All posts
            </Link>
          </div>
        </aside>

        <div className="pc-body">
          <Prose body={post.body} />
          <ShareButtons />
        </div>
      </article>

      <section className="h-sec pc-more" aria-labelledby="pc-more-t">
        <div className="h-head" data-rv>
          <span className="h-lbl">Keep reading</span>
          <h2 id="pc-more-t" className="h-h2 h-split">More field notes</h2>
        </div>
        <div className="pc-more-wrap" data-rv>
          <AutoSlider className="pc-more-grid">
            {others.map((p, i) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="h-panel h-tilt pc-card" style={v({ "--sd": i })}>
                <div className="h-ph">
                  <span className="h-lbl">{formatDate(p.date)}</span>
                  <span className="h-lbl">{readMins(p.body)} min</span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <span className="bl-go">Read <span className="ar" aria-hidden="true">&rarr;</span></span>
              </Link>
            ))}
          </AutoSlider>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}

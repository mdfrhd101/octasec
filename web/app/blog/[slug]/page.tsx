import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Prose from "../../components/Prose";
import FinalCTA from "../../components/FinalCTA";
import JsonLd from "../../components/JsonLd";
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
  const url = `/blog/${post.slug}`;
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

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const others = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

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
    <>
      <JsonLd data={[articleLd, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog/" }, { name: post.title, path: `/blog/${post.slug}/` }])]} />
      <article className="wrap article rv">
        <Link href="/blog" className="ilink backlink">&larr; All posts</Link>
        <div className="postmeta" style={{ marginTop: 16 }}>
          <span className="postdate">{formatDate(post.date)}</span>
          {post.tags.map((t) => (
            <span key={t} className="badge">{t}</span>
          ))}
        </div>
        <h1 className="article-title">{post.title}</h1>
        <p className="article-sub">{post.description}</p>
        <Prose body={post.body} />
      </article>

      <section className="wrap rv">
        <h3 className="related-h">More field notes</h3>
        <div className="postlist c3">
          {others.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card postcard">
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="ilink">Read &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      <FinalCTA />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";
import { getAllPosts, formatDate } from "../lib/blog";

export const metadata: Metadata = {
  title: "Blog — Autonomous Pentesting Field Notes",
  description:
    "Field notes on autonomous pentesting: the verification doctrine, the benchmark journey, and the agent failure modes we engineered out of our own system.",
  keywords: ["autonomous pentesting", "AI penetration testing blog", "verification-first security testing", "agent failure modes", "pentest benchmark"],
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "OctaSec Blog — Autonomous Pentesting Field Notes",
    description: "The verification doctrine, the benchmark journey, and the agent failure modes we engineered out.",
    url: "/blog",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OctaSec Blog" }],
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <>
      <PageHero
        eyebrow={<>Resources &middot; field notes</>}
        title={
          <>
            Proof, not marketing.
            <br />
            The engineering record.
          </>
        }
        sub="How we think about autonomous security testing — the verification system, the benchmark journey with its caveats intact, and the failure autopsies that made the product honest."
      />

      <section className="wrap rv">
        <div className="postlist">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card postcard">
              <div className="postmeta">
                <span className="postdate">{formatDate(p.date)}</span>
                {p.tags.slice(0, 2).map((t) => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </div>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="ilink">Read the post &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      <FinalCTA />
    </>
  );
}

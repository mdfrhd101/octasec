import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";
import HudCursor from "../components/hud/HudCursor";
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
  twitter: {
    card: "summary_large_image",
    title: "OctaSec Blog — Autonomous Pentesting Field Notes",
    description: "The verification doctrine, the benchmark journey, and the agent failure modes we engineered out.",
    images: ["/og.png"],
  },
};

const v = (vars: Record<string, number>) => vars as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");
// reading time, one dot-matrix square per minute (the homepage's "one square, one unit")
const readMins = (body: string) => Math.max(1, Math.ceil(body.split(/\s+/).filter(Boolean).length / 230));

// HUD index: the newest field report leads (a red cursor card), the rest are tilt panels;
// every card reveals on scroll (HudMotion) and its minute squares fill in
export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <div className="pg-blog">
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

      <section className="h-sec bl-sec" aria-labelledby="bl-all">
        <div className="bl-bar" data-rv>
          <h2 id="bl-all" className="bl-bar-t">All posts</h2>
          <span className="bl-bar-line" aria-hidden="true" />
          <span className="h-lbl">{pad(posts.length)} field notes</span>
        </div>
        <div className="bl-grid">
          {posts.map((p, i) => {
            const mins = readMins(p.body);
            const card = (
              <Link
                href={`/blog/${p.slug}`}
                className={"h-panel bl-card" + (i === 0 ? " is-lead" : " h-tilt")}
                data-rv
                style={v({ "--sd": i === 0 ? 0 : (i - 1) % 2 })}
              >
                {/* the lead's outlined watermark: its first tag, like the homepage's chapter words */}
                {i === 0 && p.tags[0] ? <span className="bl-mark" aria-hidden="true">{p.tags[0]}</span> : null}
                <div className="bl-head">
                  <span className="h-lbl bl-date">
                    <b>{pad(i + 1)}</b>
                    <span aria-hidden="true">/</span>
                    {formatDate(p.date)}
                  </span>
                  <span className="bl-tags">
                    {p.tags.slice(0, 2).map((t) => (
                      <span key={t} className="h-tag">{t}</span>
                    ))}
                  </span>
                </div>
                <h3>{p.title}</h3>
                <p>{p.description}</p>
                <div className="bl-foot">
                  <span className="bl-time">
                    <span className="hs-cells" aria-hidden="true">
                      {Array.from({ length: mins }, (_, j) => <i key={j} style={v({ "--i": j * 3 })} />)}
                    </span>
                    <span className="h-lbl">{mins} min read</span>
                  </span>
                  <span className="bl-go">Read the post <span className="ar" aria-hidden="true">&rarr;</span></span>
                </div>
              </Link>
            );
            return i === 0 ? (
              <div key={p.slug} className="bl-lead">
                <HudCursor>{card}</HudCursor>
              </div>
            ) : (
              <div key={p.slug} className="bl-cell">{card}</div>
            );
          })}
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}

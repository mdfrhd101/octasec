import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "./components/PageHero";

export const metadata: Metadata = {
  title: "Page not found",
  description: "Page not found.",
  // Next adds <meta name="robots" content="noindex"> to the 404 itself (a second tag duplicated it),
  // and the 404 must not inherit the homepage canonical / social url
  robots: null, // drops the layout's "index, follow": only Next's own noindex remains
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
};

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title="This page went dark."
        sub="The link may be broken or the page moved. Head back to safety."
      />
      <section className="wrap rv" style={{ textAlign: "center" }}>
        <div className="hero-cta" style={{ justifyContent: "center" }}>
          <Link className="btn btn-white" href="/">
            Back to home
          </Link>
          <Link className="link" href="/contact">
            Contact us <span className="ar">&rarr;</span>
          </Link>
        </div>
      </section>
    </>
  );
}

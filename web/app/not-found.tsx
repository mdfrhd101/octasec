import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "./components/PageHero";

export const metadata: Metadata = {
  title: "OctaSec — Not found",
  description: "Page not found.",
  robots: { index: false, follow: false },
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

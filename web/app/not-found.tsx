import type { Metadata } from "next";
import Link from "next/link";
import HudField from "./components/hud/HudField";

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

// "Signal lost": a HUD monitor whose trace flatlines, a glitching 404, the way home.
// Styles + motion in hud-pages-c.css (reduced motion: a still, flat trace).
export default function NotFound() {
  return (
    <div className="pg-404">
      <section className="n4" data-rv aria-labelledby="n4-t">
        <HudField variant="hero" />
        <div className="n4-grid">
          <div className="n4-copy">
            <span className="h-tag crit"><i className="h-dot" />404 · Signal lost</span>
            <h1 id="n4-t" className="h-title h-split">This page went dark.</h1>
            <p className="h-sub">The link may be broken or the page moved. Head back to safety.</p>
            <div className="h-cta">
              <Link className="h-btn h-btn-red" href="/">
                Back to home
              </Link>
              <Link className="h-btn h-btn-line" href="/contact">
                Contact us <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          <div className="h-panel n4-mon" aria-hidden="true">
            <div className="h-ph">
              <span className="h-lbl">Telemetry</span>
              <span className="h-tag crit"><i className="h-dot" />No carrier</span>
            </div>
            <div className="n4-scope">
              <b className="n4-code" data-t="404">404</b>
              <svg className="n4-trace" viewBox="0 0 400 120" preserveAspectRatio="none">
                <path className="n4-wave" pathLength={1} d="M0 60 H70 L82 60 L90 28 L100 96 L110 14 L120 104 L130 40 L138 60 H170 L178 52 L186 68 L194 60 H226 L231 56 L236 64 L241 60 H400" />
                <path className="n4-flat" d="M0 60 H400" />
              </svg>
              <i className="n4-sweep" />
            </div>
            <div className="n4-read">
              <span className="h-edge"><em>Route</em>Unknown</span>
              <span className="h-edge"><em>Status</em>404</span>
              <span className="h-edge"><em>Link</em>Down</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

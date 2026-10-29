import type { CSSProperties } from "react";
import { pageMeta } from "../lib/seo";
import PageHero from "../components/PageHero";
import ScopeCTA from "../components/ScopeCTA";
import FinalCTA from "../components/FinalCTA";

export const metadata = pageMeta({
  title: "About — An Octagram Company",
  description:
    "OctaSec is the offensive-security product of Octagram Limited, a Dhaka-based cybersecurity firm trusted by CID, DMP, SRB & CTTC. Human-gated AI penetration testing.",
  keywords: ["about OctaSec", "Octagram Limited", "cybersecurity company Bangladesh", "Dhaka penetration testing company"],
  path: "/about",
});

// HUD page (styles: hud-pages-b.css, scoped to .pg-about). [data-rv] blocks are revealed on
// scroll by HudMotion; the agency cards wipe in and their emblem brackets lock on.
const v = (vars: Record<string, number>) => vars as CSSProperties;

// Agencies the Octagram team behind OctaSec has served. To use real emblems, drop the
// files in web/public/agencies/ and add `logo: "/agencies/<file>"` — the card then renders
// the image instead of the monogram mark.
const AGENCIES: { acr: string; name: string; logo?: string }[] = [
  { acr: "CID", name: "Criminal Investigation Department", logo: "/agencies/cid.png" },
  { acr: "DMP", name: "Dhaka Metropolitan Police", logo: "/agencies/dmp.png" },
  { acr: "SRB", name: "Special Response Battalion", logo: "/agencies/srb.png" },
  { acr: "CTTC", name: "Counter Terrorism & Transnational Crime", logo: "/agencies/cttc.webp" },
];

export default function AboutPage() {
  return (
    <div className="pgb pg-about">
      <PageHero
        eyebrow="About"
        title={
          <>
            OctaSec is Octagram&apos;s
            <br />
            offensive engine.
          </>
        }
        ctas={<ScopeCTA />}
      />

      <section className="h-sec ab-intro-sec">
        <div className="ab-intro" data-rv>
          <p className="ab-lead">
            OctaSec is the autonomous offensive-security engine of Octagram Ltd
            &mdash; the Dhaka-based security firm trusted by CID, Dhaka
            Metropolitan Police, Special Response Battalion and CTTC.
            Octagram&apos;s red team built
            OctaSec to answer one question: why should deep security testing be a
            luxury?
          </p>
          <p className="ab-copy">
            The engine pairs AI-orchestrated hunting with a skill library distilled
            from thousands of disclosed real-world vulnerability reports. Every
            engagement is human-led, human-verified, and human-signed &mdash; the
            same operators Octagram&apos;s government clients already trust.
          </p>
        </div>
      </section>

      <section className="h-sec ab-org" aria-labelledby="ab-org-t">
        <div className="h-head" data-rv>
          <h2 id="ab-org-t" className="h-lbl">Organizations served</h2>
          <p className="ab-org-lead">
            The Octagram red team behind OctaSec has delivered security work for
            Bangladesh&apos;s leading law-enforcement agencies.
          </p>
        </div>
        <ul className="ab-agencies pgb-wipe" data-rv>
          {AGENCIES.map((a, i) => (
            <li className="h-panel h-tilt ab-agency" key={a.acr} title={a.name} style={v({ "--d": i })}>
              <div className="ab-mark">
                {a.logo ? <img src={a.logo} alt={`${a.name} logo`} width={96} height={96} loading="lazy" decoding="async" /> : a.acr}
              </div>
              <span className="ab-acr" aria-hidden="true">{a.acr}</span>
              <div className="ab-name">{a.name}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="h-sec ab-two" aria-labelledby="ab-two-t">
        <div className="h-head" data-rv>
          <span className="h-lbl">One firm, two faces</span>
          <h2 id="ab-two-t" className="h-h2 h-split">The engine, and the full-service team behind it.</h2>
          <p className="h-sub">OctaSec is a product of Octagram Limited — built, run and signed off by Octagram&apos;s own security team.</p>
        </div>
        {/* the two faces, wired together: OctaSec (product) ── Octagram (parent firm) */}
        <div className="ab-faces pgb-wipe" data-rv>
          <article className="h-panel h-tilt ab-face ok" style={v({ "--d": 0 })}>
            <div className="h-ph">
              <h3>OctaSec</h3>
              <span className="h-tag ok"><i className="h-dot" />Product</span>
            </div>
            <p>
              Octagram&apos;s productized offensive engine &mdash; AI-orchestrated
              hunting, human-gated, fixed-price.
            </p>
          </article>
          <div className="ab-wire" aria-hidden="true"><i /></div>
          <article className="h-panel h-tilt ab-face" style={v({ "--d": 1 })}>
            <div className="h-ph">
              <h3>Octagram</h3>
              <span className="h-tag">Parent firm</span>
            </div>
            <p>
              The parent firm behind OctaSec &mdash; full-service security, red
              team, and six service lines.
            </p>
            <a className="ab-ext" href="https://octagramltd.com">
              Visit Octagram <span aria-hidden="true">&#8599;</span>
            </a>
          </article>
        </div>
        <div className="ab-team" data-rv>
          <a className="h-btn h-btn-line" href="https://octagramltd.com">
            Meet the team <span aria-hidden="true">&rarr;</span>
          </a>
          <span className="h-tag ab-soon"><i className="h-dot" />Careers &mdash; coming soon</span>
        </div>
      </section>

      <FinalCTA />
    </div>
  );
}

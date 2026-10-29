import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import AutoSlider from "../AutoSlider";
import HeroTerminal from "../HeroTerminal";
import HudCursor from "./HudCursor";
import HudField from "./HudField";
import HudWorld from "./HudWorld";
import MissionPath from "./MissionPath";

// the homepage sections below the hero; [data-rv] blocks are revealed on scroll by HudMotion
const v = (vars: Record<string, number>) => vars as CSSProperties;

/** a title split into words, so they can rise in one by one (the old .mh word split) */
function Words({ text }: { text: string }) {
  const w = text.split(" ");
  return (
    <>
      {w.map((x, i) => (
        <Fragment key={i}>
          <span className="hw" style={v({ "--w": i })}><span>{x}</span></span>
          {i < w.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

const NUMS = [
  { k: "Benchmarks", n: 104, suf: "", d: "public benchmark apps, tested end to end", cells: 104 },
  { k: "Arsenal", n: 90, suf: "+", d: "offensive technique modules, chosen per feature", cells: 90 },
  { k: "Sign-off", n: 100, suf: "%", d: "of findings verified by a human operator", cells: 50, tone: "ok" },
  { k: "Auto-submit", n: 0, suf: "", d: "findings sent without a human check. Ever.", cells: 50, tone: "off" },
];

export function HudNumbers() {
  return (
    <section className="h-sec hs-num" aria-labelledby="hs-num-t">
      <div className="h-head h-head-row" data-rv>
        <div>
          <span className="h-lbl">In numbers</span>
          <h2 id="hs-num-t" className="h-h2"><Words text="Proof you can count." /></h2>
        </div>
        <p className="h-sub">One square, one unit: every benchmark app, every technique module, and the share of findings a human signs.</p>
      </div>
      <div className="hs-num-grid">
        {NUMS.map((x, i) => (
          <div key={x.k} className={"h-panel hs-num-card h-tilt" + (x.tone ? " " + x.tone : "")} data-rv style={v({ "--sd": i })}>
            <span className="h-lbl">{x.k}</span>
            <b className="hs-n"><span data-to={x.n}>{x.n}</span>{x.suf}</b>
            <p>{x.d}</p>
            <div className="hs-cells" aria-hidden="true">
              {Array.from({ length: x.cells }, (_, j) => <i key={j} style={v({ "--i": j })} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const SCAN: [string, string][] = [
  ["Missing security header", "Info"],
  ["Outdated library version", "Medium"],
  ["Cookie without SameSite", "Low"],
  ["TLS 1.0 enabled", "Low"],
  ["And many more, unranked", ""],
];

export function HudProblem() {
  return (
    <section className="h-sec hs-prob" aria-labelledby="hs-prob-t">
      <div className="h-head h-head-row" data-rv>
        <div>
          <span className="h-lbl">The problem</span>
          <h2 id="hs-prob-t" className="h-h2"><Words text="Your last “pentest” was a scanner PDF with a logo on top." /></h2>
        </div>
        <p className="h-sub">
          Affordable pentests find what&apos;s known and miss what&apos;s specific to your app. Real breaches
          chain three boring bugs into one critical incident. Scanners don&apos;t chain anything. OctaSec
          does, and proves it.
        </p>
      </div>
      <div className="hs-vs" data-rv>
        <div className="h-panel hs-scan h-tilt">
          <div className="h-ph"><span className="h-lbl">Typical scanner report</span><span className="h-tag">Auto-generated</span></div>
          <ul>
            {SCAN.map(([t, s], i) => (
              <li key={t} style={v({ "--i": i })}><span>{t}</span><em>{s}</em></li>
            ))}
          </ul>
          <div className="hs-foot"><span>No proof</span><span>No chain</span><span>No sign-off</span></div>
        </div>
        <div className="h-panel hs-term h-tilt">
          <div className="h-ph"><span className="h-lbl">OctaSec engagement log</span><span className="h-tag ok">Sample</span></div>
          <HeroTerminal className="h-term" />
          <div className="hs-foot ok"><span>Reproduced</span><span>Fix guidance</span><span>Signed by operator</span></div>
        </div>
      </div>
    </section>
  );
}

const RULES = [
  { k: "Coverage", tag: "Beyond scanners", t: "The attacks others miss", d: "Business logic, auth flows, race conditions, multi-step chains: the classes scanners are blind to. Every parameter, state change and trust boundary.", c: ["Logic flaws", "Auth & roles", "Chains"] },
  { k: "Evidence", tag: "Case file", t: "Proof, not noise", d: "Every finding is a case file: the attack path, a working reproduction, the decision log and a fix your developers can apply. If we can't prove it, we don't report it.", c: ["Reproduction", "Evidence", "Fix guidance"] },
  { k: "Sign-off", tag: "Verified", t: "Human-gated, always", d: "AI does the grinding. A named human operator verifies, writes and signs every report. Nothing is auto-submitted. Ever.", c: ["Named operator", "Signed report", "Audit log"], ok: true },
];

export function HudRules() {
  return (
    <section className="h-sec hs-rules" aria-labelledby="hs-rules-t">
      <div className="h-head" data-rv>
        <span className="h-lbl">The difference</span>
        <h2 id="hs-rules-t" className="h-h2"><Words text="Depth of a red team. Discipline of an audit." /></h2>
        <p className="h-sub">Three rules every OctaSec engagement runs on.</p>
      </div>
      {/* desktop: three columns; phones/tablets: the old auto-sliding row (AutoSlider) */}
      <div className="hs-rules-wrap" data-rv>
        <AutoSlider className="hs-rules-grid">
          {RULES.map((r, i) => (
            <article key={r.k} className={"h-panel hs-rule h-tilt" + (r.ok ? " ok" : "")} style={v({ "--sd": i })}>
              <div className="h-ph">
                <span className="h-lbl">{r.k}</span>
                <span className={"h-tag" + (r.ok ? " ok" : "")}>{r.ok ? <i className="h-dot" /> : null}{r.tag}</span>
              </div>
              <h3>{r.t}</h3>
              <p>{r.d}</p>
              <div className="hs-chips">{r.c.map((c) => <span key={c}>{c}</span>)}</div>
            </article>
          ))}
        </AutoSlider>
      </div>
    </section>
  );
}

/** the robotic world map, as the background of the gap between the rules and the method */
export function HudWorldBand() {
  return (
    <div className="hs-worldbg" aria-hidden="true">
      <HudWorld />
    </div>
  );
}

export function HudPath() {
  return (
    <MissionPath
      head={
        <div className="h-head h-head-row" data-rv>
          <div>
            <span className="h-lbl">How every engagement runs</span>
            <h2 id="hs-path-t" className="h-h2"><Words text="Scope. Map. Hunt. Prove." /></h2>
          </div>
          <p className="h-sub">
            Scanners stay flat on known issues. OctaSec climbs from scope to proven impact, and a human
            signs off at the top.{" "}
            <Link className="h-link" href="/how-it-works">See the full method <span aria-hidden="true">&rsaquo;</span></Link>
          </p>
        </div>
      }
    />
  );
}

const ROWS: { ft: string; scanner: [string, string]; trad: [string, string]; oc: string }[] = [
  { ft: "Depth", scanner: ["Low", "no"], trad: ["High", "yes"], oc: "High" },
  { ft: "Business logic", scanner: ["No", "no"], trad: ["Sometimes", "mid"], oc: "Yes, systematic" },
  { ft: "Price", scanner: ["Low", "yes"], trad: ["$$$$", "no"], oc: "$" },
  { ft: "Turnaround", scanner: ["Hours", "yes"], trad: ["Weeks", "no"], oc: "Days" },
  { ft: "Proof of exploit", scanner: ["No", "no"], trad: ["Yes", "yes"], oc: "Yes, case file" },
  { ft: "Retest", scanner: ["Paid", "no"], trad: ["Paid", "no"], oc: "Included" },
  { ft: "Audit trail", scanner: ["No", "no"], trad: ["Partial", "mid"], oc: "Full action log" },
];

export function HudCompare() {
  return (
    <section className="h-sec hs-cmp" aria-labelledby="hs-cmp-t">
      <div className="h-head" data-rv>
        <span className="h-lbl">How it compares</span>
        <h2 id="hs-cmp-t" className="h-h2"><Words text="Not a scanner. Not a once-a-year pentest." /></h2>
      </div>
      {/* the red shadow + glow follow the mouse (the old CursorCard) */}
      <HudCursor>
        <div className="h-panel hs-tbl" data-rv role="table" aria-labelledby="hs-cmp-t">
          <div className="hs-tr hs-th" role="row">
            <span role="columnheader"><span className="sr-only">Feature</span></span>
            <span role="columnheader">Scanner</span>
            <span role="columnheader">Traditional</span>
            <span role="columnheader" className="oc">OctaSec</span>
          </div>
          {ROWS.map((r, i) => (
            <div className="hs-tr" role="row" key={r.ft} style={v({ "--i": i })}>
              <span role="rowheader" className="ft">{r.ft}</span>
              <span role="cell" className={r.scanner[1]} data-label="Scanner">{r.scanner[0]}</span>
              <span role="cell" className={r.trad[1]} data-label="Traditional">{r.trad[0]}</span>
              <span role="cell" className="oc" data-label="OctaSec">{r.oc}</span>
            </div>
          ))}
        </div>
      </HudCursor>
    </section>
  );
}

export function HudPricing() {
  return (
    <section className="h-sec hs-price" aria-labelledby="hs-price-t">
      <HudCursor>
        <div className="h-panel hs-price-card" data-rv>
          <div className="hs-price-copy">
            <span className="h-lbl">Pricing</span>
            <h2 id="hs-price-t" className="h-h2"><Words text="Priced for the companies attackers actually target." /></h2>
            <p className="h-sub">
              A traditional deep pentest costs $15&ndash;40k and takes weeks. OctaSec engagements start at a
              fraction of that, finish in days, and include a free retest. Fixed price for the agreed scope,
              no surprises.
            </p>
            <div className="h-cta">
              <Link className="h-btn h-btn-red" href="/pricing">See engagement models</Link>
              <Link className="h-btn h-btn-line" href="/contact">Get a scoped quote</Link>
            </div>
          </div>
          <div className="hs-tl" aria-hidden="true">
            <div className="hs-tl-scale"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
            <div className="hs-tl-row trad"><span className="h-lbl">Traditional deep pentest</span><div className="hs-tl-bar"><i /></div><b>Weeks</b></div>
            <div className="hs-tl-row oc"><span className="h-lbl">OctaSec engagement</span><div className="hs-tl-bar"><i /><em className="h-tag ok">Retest included</em></div><b>Days</b></div>
          </div>
        </div>
      </HudCursor>
    </section>
  );
}

export function HudFinal() {
  return (
    <section className="h-sec hs-final" aria-labelledby="hs-final-t">
      <div className="h-panel hs-final-card" data-rv>
        {/* the old final-band particle field, in the HUD colours */}
        <HudField variant="final" />
        <span className="hs-sweep" aria-hidden="true" />
        <span className="h-lbl">Start here</span>
        <h2 id="hs-final-t" className="h-h2"><Words text="One finding pays for the engagement." /></h2>
        <p className="h-sub">Book a 30-minute scoping call. If a scanner is enough for you, we&apos;ll say so.</p>
        <div className="h-cta">
          <Link className="h-btn h-btn-red" href="/contact">Book a scoping call <span aria-hidden="true">&rsaquo;</span></Link>
          <Link className="h-btn h-btn-line" href="/benchmarks">See our benchmarks</Link>
        </div>
      </div>
    </section>
  );
}

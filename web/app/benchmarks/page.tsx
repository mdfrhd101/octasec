import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { pageMeta } from "../lib/seo";
import PageHero from "../components/PageHero";
import FinalCTA from "../components/FinalCTA";
import MobileCollapse from "../components/MobileCollapse";
import HudCursor from "../components/hud/HudCursor";

export const metadata = pageMeta({
  title: "AI Pentest Benchmarks — Wins & Misses",
  description:
    "OctaSec penetration-testing benchmark results — published with their conditions, per-engine breakdowns and failure autopsies. 97.1% airlocked on XBEN-104. Wins and misses, dated.",
  keywords: ["AI penetration testing benchmark", "autonomous agent benchmark", "XBEN-104", "pentest benchmark results", "AI hacking benchmark"],
  path: "/benchmarks",
});

// HUD page (styles: hud-pages-b.css, scoped to .pg-benchmarks). [data-rv] blocks are revealed
// on scroll by HudMotion: .h-split titles rise word by word, [data-to] numbers count up,
// table rows slide in, rate bars and the ladder's cells fill.
const v = (vars: Record<string, number>) => vars as CSSProperties;

/** one benchmark row: n solved (counts up) + the rest of the "solved" text; pct = [whole part (counts up), the rest] */
type RateRow = { cfg: string; n: number; of: string; pct?: [number, string]; bar: number; from?: number; hl?: boolean; aux?: boolean };

const CONDITIONS: [string, ReactNode][] = [
  ["Black-box", "HTTP interaction only. No source access, no container inspection."],
  ["Airlocked", "Web search and external fetches disabled at the harness level. No writeups, no CVE lookups — solved from target behavior alone."],
  ["No hints", "Agents are told the flag format, not the vulnerability class."],
  ["Verified", <>Every flag recomputed byte-identical from ground truth, independently of agent output. &ldquo;The agent said so&rdquo; is never the evidence.</>],
  ["Self-reported & dated", "These numbers are produced by us, like every result on every public leaderboard in this space. Raw result files and per-target evidence kept for every solve."],
];

const XBEN: RateRow[] = [
  { cfg: "Frontier orchestrator engine, first pass", n: 92, of: " / 103", pct: [89, ".3%"], bar: 0.893 },
  { cfg: "Worker engine, first pass", n: 78, of: " / 103", pct: [75, ".7%"], bar: 0.757 },
  { cfg: "Worker engine, final (fresh-context retries + scope-corrected briefs)", n: 90, of: " / 103", pct: [87, ".4%"], bar: 0.874 },
  { cfg: "Frontier orchestrator engine, final", n: 94, of: " / 103", pct: [91, ".3%"], bar: 0.913 },
  { cfg: "Combined system — airlocked capability score", n: 100, of: " / 103", pct: [97, ".1%"], bar: 0.971, hl: true },
  { cfg: "Combined system — full research pipeline (hints + web research)", n: 103, of: " / 103", pct: [100, "%*"], bar: 1, aux: true },
];

// the escalation row has no rate of its own: its bar fills the part of the suite the worker left
const APEX: RateRow[] = [
  { cfg: "Worker engine, solo, airlocked, no hints", n: 48, of: " / 69", pct: [69, ".6%"], bar: 0.696 },
  { cfg: "+ Orchestrator escalation swarm (fresh context, failure journals, surface hints)", n: 21, of: " / 21 remaining", bar: 0.304, from: 0.696, aux: true },
  { cfg: "Combined system", n: 69, of: " / 69", pct: [100, "%"], bar: 1, hl: true },
];

// lost = solves the stuffed digest cost against the clean context one rung up (12 → 7)
const LADDER: { cfg: string; n: number; hl?: boolean; lost?: number }[] = [
  { cfg: "Local fine-tuned workhorse (35B-class, our own training)", n: 1 },
  { cfg: "Raw 80B-class base model (pre-training attribution anchor)", n: 2 },
  { cfg: "Large reasoning model, quantized", n: 8 },
  { cfg: "Large reasoning model, full precision", n: 12, hl: true },
  { cfg: "Same model + static skills digest stuffed in context", n: 7, lost: 5 },
  { cfg: "Frontier worker engine (reference ceiling)", n: 20 },
];

const POSTS = [
  {
    href: "/blog/benchmark-journey-xben",
    t: "The benchmark journey",
    d: <>Expectations vs. reality on XBEN-104 — the broken challenge we proved unwinnable, and the two &ldquo;unsolvable&rdquo; targets that were scope bugs in our own briefs.</>,
  },
  {
    href: "/blog/agent-failure-modes",
    t: "The failure-mode taxonomy",
    d: "Transcript-level autopsy of eight applications that defeated every local model: decision-point failures, decoy fields, primitive-inventory amnesia, and the repetition-loop disease.",
  },
  {
    href: "/blog/how-we-verify",
    t: "The verification doctrine",
    d: "Why none of it matters unless a deterministic oracle and a human gate stand between the engine and your report.",
  },
];

const LIMITS: [string, ReactNode][] = [
  ["Self-reported", "Independent replication is welcome; methodology and per-target evidence available on request."],
  ["Benchmarks are not your application", <>Public suites are saturated and contamination-prone; private suites are harder but still synthetic. The honest claim is narrower and stronger: the operating model — enumerate everything, retry fresh with history, verify deterministically, gate with humans — is what transfers, and it&rsquo;s the same model we run on your scope.</>],
  ["We never round up", "Where a figure includes assisted runs, it is labeled. Where a number is pass@k rather than pass@1, it is labeled. Where a challenge shipped broken, we say so."],
  ["Dated and versioned", "Numbers are updated as new runs complete; old entries are kept, not overwritten."],
];

const nn = (i: number) => String(i + 1).padStart(2, "0");

/** section head in the homepage format: label, a title that rises word by word, the sub */
function Head({ id, label, title, sub }: { id: string; label: ReactNode; title: string; sub?: ReactNode }) {
  return (
    <div className="h-head" data-rv>
      <span className="h-lbl">{label}</span>
      <h2 id={id} className="h-h2 h-split">{title}</h2>
      {sub ? <p className="h-sub">{sub}</p> : null}
    </div>
  );
}

/** a results table: rows slide in, solved counts and rates count up, the rate bars fill */
function RateTable({ labelledBy, rows }: { labelledBy: string; rows: RateRow[] }) {
  return (
    <HudCursor>
      <div className="h-panel bm-tbl" data-rv role="table" aria-labelledby={labelledBy}>
        <div className="bm-tr bm-th" role="row">
          <span role="columnheader">Configuration</span>
          <span role="columnheader">Solved</span>
          <span role="columnheader">Rate</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.cfg} className={"bm-tr" + (r.hl ? " hl" : "") + (r.aux ? " aux" : "")} role="row" style={v({ "--i": i + 1 })}>
            <span role="rowheader" className="bm-ft">{r.cfg}</span>
            <span role="cell" className="bm-n" data-label="Solved"><b data-to={r.n}>{r.n}</b>{r.of}</span>
            <span role="cell" className="bm-rate" data-label="Rate">
              <b className="bm-pct">{r.pct ? <><span data-to={r.pct[0]}>{r.pct[0]}</span>{r.pct[1]}</> : <>&mdash;</>}</b>
              <span className="bm-bar" aria-hidden="true"><i style={v({ "--v": r.bar, "--o": r.from ?? 0 })} /></span>
            </span>
          </div>
        ))}
      </div>
    </HudCursor>
  );
}

export default function BenchmarksPage() {
  return (
    <div className="pgb pg-benchmarks">
      <PageHero
        eyebrow={<>Proof &middot; public &amp; private suites</>}
        title={
          <>
            We benchmark in the open
            <br />
            &mdash; wins and misses.
          </>
        }
        sub="OctaSec is evaluated continuously on public benchmark suites used in published autonomous-agent research, and on private suites we build ourselves to eliminate contamination. We publish per-engine results, the conditions of every run, and our failure autopsies — not just the union score."
      />

      <section className="h-sec bm-say-sec">
        <div className="bm-say" data-rv>
          <p className="pgb-say h-split">A vendor that only shows you wins is hiding the distribution.</p>
        </div>
      </section>

      {/* How to read */}
      <section className="h-sec" aria-labelledby="bm-read-t">
        <Head
          id="bm-read-t"
          label="How to read these results"
          title="Every score carries its conditions."
          sub="The conditions matter more than the numbers. These are the ones that change what a score means."
        />
        <MobileCollapse more="Show all 5 conditions">
          <div className="bm-conds pgb-wipe" data-rv>
            {CONDITIONS.map(([t, d], i) => (
              <article key={t} className="h-panel h-tilt pgb-card bm-cond" style={v({ "--d": i })}>
                <div className="h-ph">
                  <span className="h-lbl" aria-hidden="true">{nn(i)}</span>
                  <span className="pgb-ic" aria-hidden="true">&#10003;</span>
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </MobileCollapse>
      </section>

      {/* Suite 1 — XBEN-104 */}
      <section className="h-sec" aria-labelledby="bm-s1-t">
        <Head
          id="bm-s1-t"
          label={<>Suite 1 &middot; XBEN-104</>}
          title="Public validation suite — a regression benchmark."
          sub={<>104 deliberately vulnerable web applications. Public, saturated, and contamination-prone — we treat it as a regression suite (&ldquo;does the harness still work&rdquo;), never as a capability proof. One challenge ships broken (the flag is never injected into the container) and is excluded; scorable denominator is 103.</>}
        />
        <RateTable labelledBy="bm-s1-t" rows={XBEN} />
        <div className="bm-tags" data-rv>
          {["Black-box", "Airlocked", "No hints", "Independently verified"].map((b, i) => (
            <span key={b} className="h-tag ok" style={v({ "--d": i })}><i className="h-dot" />{b}</span>
          ))}
        </div>
        <div className="h-panel bm-call warn" data-rv>
          <span className="pgb-ic crit" aria-hidden="true">!</span>
          <p>
            <b>Cite the 97.1%.</b> The 100% figure includes hint-conditioned integration tests and one research-enabled run, and is labeled with the asterisk. The sole airlocked miss requires public knowledge of a specific CVE proof-of-concept; both engines solved it within minutes once research was enabled — the condition every real engagement runs under. For calibration, the strongest independently reproducible public baseline under comparable black-box, no-hint conditions was roughly 80% going in.
          </p>
        </div>
        <p className="bm-foot" data-rv>
          Full narrative: <Link href="/blog/benchmark-journey-xben" className="ilink">The benchmark journey &rarr;</Link>
        </p>
      </section>

      {/* Suite 2 — APEX/ARGUS */}
      <section className="h-sec" aria-labelledby="bm-s2-t">
        <Head
          id="bm-s2-t"
          label={<>Suite 2 &middot; APEX / ARGUS</>}
          title="Private adversarial suite — capability measurement."
          sub="69 applications we built ourselves — harder than the public suite: multi-service apps, non-HTTP ingress, bot-driven exploitation chains, deliberately hardened cases. Neither engine had ever seen them. Zero contamination by construction; every flag verified byte-identical against ground truth."
        />
        <RateTable labelledBy="bm-s2-t" rows={APEX} />
        <div className="h-panel bm-call" data-rv>
          <span className="pgb-ic" aria-hidden="true">&#10003;</span>
          <p>
            Every miss in the worker&rsquo;s solo pass was autopsied before escalation. The recurring failure classes — POST-only routes missed by GET-only fuzzing, dictionary sweeps without app-themed mutations, fire-and-forget exfil beacons, briefs that omitted published ports — are now codified as harness checks.
          </p>
        </div>
        <p className="bm-foot" data-rv>
          The autopsy work is public: <Link href="/blog/agent-failure-modes" className="ilink">How AI agents actually fail at pentesting &rarr;</Link>
        </p>
      </section>

      {/* Suite 3 — APEX recall-20 ladder */}
      <section className="h-sec" aria-labelledby="bm-s3-t">
        <Head
          id="bm-s3-t"
          label={<>Suite 3 &middot; APEX recall-20</>}
          title="The model ladder — what actually improves an agent."
          sub="A controlled experiment on 20 applications from the private suite, all previously solved by the worker engine solo. Identical conditions for every rung: airlocked, solo, no hints, 35-step budget, same harness. This ladder is the evidence behind our architecture decisions."
        />
        {/* one square per application: lit = solved */}
        <HudCursor>
          <div className="h-panel bm-tbl bm-lad" data-rv role="table" aria-labelledby="bm-s3-t">
            <div className="bm-tr bm-th" role="row">
              <span role="columnheader">Model configuration</span>
              <span role="columnheader">Solved</span>
            </div>
            {LADDER.map((r, i) => (
              <div key={r.cfg} className={"bm-tr" + (r.hl ? " hl" : "") + (r.lost ? " cost" : "")} role="row" style={v({ "--i": i + 1 })}>
                <span role="rowheader" className="bm-ft">{r.cfg}</span>
                <span role="cell" className="bm-n" data-label="Solved">
                  <b className="bm-pct"><span data-to={r.n}>{r.n}</span> / 20</b>
                  <span className="bm-cells" aria-hidden="true">
                    {Array.from({ length: 20 }, (_, j) => (
                      <i key={j} className={j < r.n ? "on" : r.lost && j < r.n + r.lost ? "lost" : undefined} style={v({ "--j": j })} />
                    ))}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </HudCursor>
        <p className="bm-legend" aria-hidden="true">
          <span className="on">Solved</span>
          <span className="lost">Cost by the stuffed digest</span>
        </p>
        <div className="bm-find pgb-wipe" data-rv>
          <article className="h-panel h-tilt pgb-card ok" style={v({ "--d": 0 })}>
            <div className="h-ph">
              <span className="h-lbl" aria-hidden="true">01</span>
              <span className="h-tag ok"><i className="h-dot" />+4 solves</span>
            </div>
            <h3>The quantization tax is real</h3>
            <p>Full precision over quantized weights: +4 solves (+50%) and materially better efficiency on shared solves. Infrastructure quality is capability.</p>
          </article>
          <article className="h-panel h-tilt pgb-card crit" style={v({ "--d": 1 })}>
            <div className="h-ph">
              <span className="h-lbl" aria-hidden="true">02</span>
              <span className="h-tag crit"><i className="h-dot" />&minus;5 solves</span>
            </div>
            <h3>In-context teaching is a net negative</h3>
            <p>Stuffing a ~2,900-token digest of our technique library into context <b>cost five solves</b> versus a clean context — it displaced working memory and pushed the model into checklist behavior. Expertise belongs in weights, in deterministic machinery, or retrieved just-in-time. Never stuffed.</p>
          </article>
        </div>
        <p className="bm-fine" data-rv>
          Results dated 2026-10-15 through 2026-10-17. We deliberately do not name the models in this ladder — the point is the method, not the vendor. Full per-app verdicts are available to customers and researchers under NDA.
        </p>
      </section>

      {/* What our misses taught */}
      <section className="h-sec" aria-labelledby="bm-miss-t">
        <Head
          id="bm-miss-t"
          label="What our misses taught"
          title="We publish failure autopsies."
          sub="That is where the engineering truth lives — and the trust-killer feature nobody else ships."
        />
        <div className="bm-posts pgb-wipe" data-rv>
          {POSTS.map((p, i) => (
            <Link key={p.href} href={p.href} className="h-panel h-tilt pgb-card bm-post" style={v({ "--d": i })}>
              <div className="h-ph">
                <span className="h-lbl" aria-hidden="true">{nn(i)}</span>
                <span className="h-tag">Blog</span>
              </div>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
              <span className="ilink">Read &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="h-sec" aria-labelledby="bm-lim-t">
        <Head id="bm-lim-t" label="The disclaimer block" title="We mean it." />
        <MobileCollapse more="Show all 4 points">
          <div className="bm-lim pgb-wipe" data-rv>
            {LIMITS.map(([t, d], i) => (
              <article key={t} className="h-panel h-tilt pgb-card" style={v({ "--d": i })}>
                <div className="h-ph">
                  <span className="h-lbl" aria-hidden="true">{nn(i)}</span>
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </MobileCollapse>
        <p className="bm-dated" data-rv><i className="h-dot" aria-hidden="true" />Last updated: 2026-10-18.</p>
      </section>

      <FinalCTA />
    </div>
  );
}

// The signed report document — shared by tenants (/reports/:id) and the super
// admin (/admin/reports/:id). Print-ready: "Download PDF" uses the browser's
// Save-as-PDF with the print stylesheet in index.css (@media print).
import { useMemo, useState } from "react";
import { engagements } from "../services/index.js";
import { useUI } from "../ui.jsx";
import { SEV_CLASS } from "./Engagement.jsx";
import { TEST_TYPES, ENVIRONMENTS } from "../profileOptions.js";

const SEV_ORDER = ["critical", "high", "medium", "low"];
const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const STATE_LABEL = { open: "Open", fixed: "Fixed", accepted_risk: "Risk accepted" };
const STATE_CLS = { open: "warn", fixed: "green", accepted_risk: "dim" };
const OPEN_ENG = ["requested", "assigned", "in_progress"];
const day = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

export function StateChip({ state }) {
  return <span className={"chip " + (STATE_CLS[state] || "warn")}>{STATE_LABEL[state] || "Open"}</span>;
}

/**
 * @param e        engagement (tenant view, or the admin view)
 * @param editable tenant may change finding state / request a retest
 * @param onChange reload callback after a change
 */
export default function ReportDocument({ e, editable, onChange }) {
  const ui = useUI();
  const [openIds, setOpenIds] = useState(() => new Set());
  const [pick, setPick] = useState(() => new Set());
  const [busy, setBusy] = useState("");

  // the admin view carries review data; only verified findings are part of the report
  const findings = useMemo(() => (e.findings || [])
    .filter((f) => f.review !== "rejected")
    .map((f) => ({ ...f, state: f.state || "open" }))
    .sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity) || (b.cvss || 0) - (a.cvss || 0)), [e]);

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, open: 0, fixed: 0, accepted_risk: 0 };
    for (const f of findings) { c[f.severity] = (c[f.severity] || 0) + 1; c[f.state]++; }
    return c;
  }, [findings]);

  // findings already in an open retest
  const inRetest = useMemo(() => {
    const s = new Set();
    for (const r of e.retests || []) if (OPEN_ENG.includes(r.status)) (r.retestOf || []).forEach((id) => s.add(String(id)));
    return s;
  }, [e]);

  const worst = SEV_ORDER.find((s) => findings.some((f) => f.severity === s && f.state === "open"));
  const toggle = (id) => setOpenIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const togglePick = (id) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const setState = async (f, state) => {
    let note = "";
    if (state === "accepted_risk") {
      note = await ui.prompt({ title: "Accept the risk", body: `“${f.title}” will no longer count against your security score. Record why.`, label: "Reason", required: true, multiline: true, confirmLabel: "Accept risk" });
      if (note === null) return;
    } else if (state === "fixed") {
      note = await ui.prompt({ title: "Mark as fixed", body: "Optional: what was changed? You can then request a retest to have OctaSec confirm the fix.", label: "Fix note", multiline: true, confirmLabel: "Mark fixed" });
      if (note === null) return;
    }
    setBusy(f._id);
    const ok = await ui.run(() => engagements.setFindingState(e.id || e._id, f._id, state, note),
      state === "fixed" ? "Marked as fixed" : state === "accepted_risk" ? "Risk accepted" : "Finding reopened");
    setBusy("");
    if (ok) { if (state !== "fixed") setPick((s) => { const n = new Set(s); n.delete(f._id); return n; }); onChange && onChange(); }
  };

  const retest = async () => {
    const ids = [...pick];
    const yes = await ui.confirm({
      title: "Request a retest",
      body: `OctaSec will re-check ${ids.length} fixed finding${ids.length > 1 ? "s" : ""} on ${e.domainName}. A retest goes through the same operator queue as a scan; you'll see it under Scans.`,
      confirmLabel: "Request retest",
    });
    if (!yes) return;
    setBusy("retest");
    const ok = await ui.run(() => engagements.requestRetest(e.id || e._id, ids), "Retest requested — it is now in the operator queue");
    setBusy("");
    if (ok) { setPick(new Set()); onChange && onChange(); }
  };

  const fixedPickable = findings.filter((f) => f.state === "fixed" && !inRetest.has(String(f._id)));
  const sc = e.scoping || {};

  return (
    <article className="report-doc">
      {/* cover */}
      <header className="rep-cover card">
        <div className="rep-kicker">OctaSec · {e.kind === "retest" ? "Retest report" : "Penetration test report"}</div>
        <h2>{e.domainName}</h2>
        <div className="kvgrid rep-meta">
          {e.tenant && <div className="kv"><span>Customer</span><b>{e.tenant}</b></div>}
          <div className="kv"><span>Delivered</span><b>{day(e.signedAt)}</b></div>
          <div className="kv"><span>Signed by</span><b>{e.signedByName || "—"}</b></div>
          <div className="kv"><span>Requested</span><b>{day(e.createdAt)}</b></div>
          {sc.testType && <div className="kv"><span>Test type</span><b>{(TEST_TYPES[sc.testType] || "").split(" — ")[0]}</b></div>}
          {sc.environment && <div className="kv"><span>Environment</span><b>{ENVIRONMENTS[sc.environment]}</b></div>}
          <div className="kv"><span>Intensity</span><b style={{ textTransform: "capitalize" }}>{e.roe?.intensity || "standard"}</b></div>
          <div className="kv"><span>Report ID</span><b className="mono">{String(e.id || e._id).slice(-10).toUpperCase()}</b></div>
        </div>
        <p className="rep-conf">Confidential — prepared for the customer named above. Every finding was reproduced and verified by an OctaSec operator before sign-off.</p>
      </header>

      {/* executive summary */}
      <section className="card panel rep-sec">
        <h3>Executive summary</h3>
        <p className="rep-p">
          OctaSec tested <b>{(e.targets || []).length || 1}</b> in-scope host{(e.targets || []).length === 1 ? "" : "s"} on <b>{e.domainName}</b> and
          verified <b>{findings.length}</b> finding{findings.length === 1 ? "" : "s"}
          {e.rejectedCount ? <> ({e.rejectedCount} false positive{e.rejectedCount > 1 ? "s" : ""} removed during review)</> : null}.
          {" "}{findings.length === 0 ? "No exploitable issues were confirmed in scope." : worst
            ? <>The most severe open issue is rated <b className={"sevtxt " + SEV_CLASS[worst]}>{SEV_LABEL[worst]}</b> — address critical and high findings first.</>
            : <>All findings have been fixed or formally accepted.</>}
        </p>
        <div className="rep-sevs">
          {SEV_ORDER.map((s) => (
            <div key={s} className={"rep-sev " + SEV_CLASS[s]}><b>{counts[s]}</b><span>{SEV_LABEL[s]}</span></div>
          ))}
        </div>
        <div className="rep-status">
          <span><StateChip state="open" /> {counts.open}</span>
          <span><StateChip state="fixed" /> {counts.fixed}</span>
          <span><StateChip state="accepted_risk" /> {counts.accepted_risk}</span>
        </div>
      </section>

      {/* scope */}
      <section className="card panel rep-sec">
        <h3>Scope &amp; rules of engagement</h3>
        <div className="rep-targets">{(e.targets || []).map((t) => <span key={t} className="chip mono">{t}</span>)}</div>
        <div className="kvgrid" style={{ marginTop: 12 }}>
          <div className="kv"><span>Authorised by</span><b>{e.roe?.authorizerName || "—"}{e.roe?.authorizerTitle ? ` · ${e.roe.authorizerTitle}` : ""}</b></div>
          <div className="kv"><span>Testing window</span><b>{e.roe?.window || "Any time"}</b></div>
          {e.roe?.excludes && <div className="kv"><span>Excluded</span><b>{e.roe.excludes}</b></div>}
          <div className="kv"><span>Method</span><b>OWASP-aligned; automated discovery, human-verified exploitation</b></div>
        </div>
      </section>

      {/* findings */}
      <section className="card panel rep-sec">
        <h3>
          Findings
          {editable && findings.length > 0 && (
            <span className="sp no-print">
              <span className="dimtxt" style={{ fontSize: 12 }}>{pick.size ? `${pick.size} selected` : fixedPickable.length ? "Tick fixed findings to retest" : ""}</span>
              <button className="btn gold sm" disabled={!pick.size || busy === "retest"} onClick={retest}>Request retest</button>
            </span>
          )}
        </h3>
        {findings.length === 0 ? <div className="empty">No verified findings in this report.</div> : (
          <div className="rep-list">
            {findings.map((f, i) => {
              const id = String(f._id);
              const open = openIds.has(id);
              const pending = inRetest.has(id);
              return (
                <div key={id} className={"rf" + (open ? " open" : "")}>
                  <div className="rf-head" onClick={() => toggle(id)} role="button" tabIndex={0} aria-expanded={open}
                    onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), toggle(id))}>
                    {editable && (
                      <input type="checkbox" className="no-print" aria-label="Select for retest" title={f.state !== "fixed" ? "Mark as fixed to retest" : pending ? "Retest already requested" : "Select for retest"}
                        disabled={f.state !== "fixed" || pending} checked={pick.has(id)}
                        onClick={(ev) => ev.stopPropagation()} onChange={() => togglePick(id)} />
                    )}
                    <span className={"cvss " + (SEV_CLASS[f.severity] || "l")}>{f.cvss ? Number(f.cvss).toFixed(1) : "—"}</span>
                    <div className="rf-title">
                      <div className="ti"><span className="rf-no">F-{String(i + 1).padStart(2, "0")}</span>{f.title}</div>
                      <div className="rf-sub"><span className="mono">{f.host}</span>{f.owasp ? ` · ${f.owasp}` : ""}{f.cwe ? ` · ${f.cwe}` : ""}</div>
                    </div>
                    <div className="rf-chips">
                      <span className={"sev " + (SEV_CLASS[f.severity] || "l")}>{SEV_LABEL[f.severity] || f.severity}</span>
                      <StateChip state={f.state} />
                      {pending && <span className="chip gold">Retest pending</span>}
                    </div>
                    <svg className="rf-caret no-print" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                  </div>
                  <div className="rf-body">
                    <h4>Description</h4>
                    <p>{f.detail || "—"}</p>
                    {f.evidence ? (<><h4>Evidence</h4><pre className="poc">{f.evidence}</pre></>) : null}
                    <h4>Remediation</h4>
                    <p>{f.fix || "—"}</p>
                    {(f.state !== "open" || f.stateNote) && (
                      <div className="rf-state">
                        <StateChip state={f.state} /> {f.stateNote ? <>“{f.stateNote}”</> : null}
                        {f.stateAt ? <span className="dimtxt"> — {f.stateByEmail || "customer"}, {day(f.stateAt)}</span> : null}
                      </div>
                    )}
                    {editable && (
                      <div className="acts no-print" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                        {f.state !== "fixed" && <button className="btn sm" disabled={busy === id} onClick={() => setState(f, "fixed")}>Mark fixed</button>}
                        {f.state !== "accepted_risk" && <button className="btn ghost sm" disabled={busy === id} onClick={() => setState(f, "accepted_risk")}>Accept risk</button>}
                        {f.state !== "open" && <button className="btn ghost sm" disabled={busy === id || pending} onClick={() => setState(f, "open")}>Reopen</button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(e.retests || []).length > 0 && (
        <section className="card panel rep-sec no-print">
          <h3>Retests</h3>
          {(e.retests || []).map((r) => (
            <div key={r.id} className="alertrow">
              <span>{(r.retestOf || []).length} finding{(r.retestOf || []).length > 1 ? "s" : ""} · requested {day(r.createdAt)}</span>
              <span className={"chip " + (r.status === "delivered" ? "green" : OPEN_ENG.includes(r.status) ? "gold" : "dim")}>{r.status === "in_progress" ? "Running" : r.status}</span>
            </div>
          ))}
        </section>
      )}
      <footer className="rep-foot">OctaSec by Octagram Limited · support@octasec.ai · Generated {day(new Date())}</footer>
    </article>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { admin } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, TableWrap, useUI } from "../ui.jsx";
import { EngStatus, FindingsTable, ScopingView, SEV_CLASS } from "../components/Engagement.jsx";

const FILTERS = ["open", "requested", "assigned", "in_progress", "delivered", "all"];

export default function AdminEngagements() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("open");
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await admin.engagements.list(filter === "all" ? "" : filter)).engagements); } catch (e) { setErr(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Engagements">
      <div className="card panel">
        <h3>Scan operations<span className="sp">
          <select className="minisel" value={filter} onChange={(e) => { setList(null); setFilter(e.target.value); }} aria-label="Status">
            {FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All" : f.replace("_", " ")}</option>)}
          </select>
        </span></h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Tenant scan and retest requests. Assign, run, verify and sign each one.</p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No engagements.</Empty> : (
          <TableWrap><table className="tbl">
            <thead><tr><th>Domain</th><th>Tenant</th><th>Type</th><th>Intensity</th><th>Status</th><th>Operator</th><th>Requested</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="frow" onClick={() => setViewId(e.id)}>
                  <td className="mono">{e.domainName}</td>
                  <td className="dim">{e.tenant}</td>
                  <td>{e.kind === "retest" ? <span className="chip gold">Retest</span> : <span className="chip">Scan</span>}</td>
                  <td><span className="chip">{e.intensity}</span></td>
                  <td><EngStatus status={e.status} /></td>
                  <td className="dim">{e.operator || "—"}</td>
                  <td className="mono dim">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></TableWrap>
        )}
      </div>
      {viewId && <OpsView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

const REVIEW_CHIP = { pending: ["warn", "Pending review"], verified: ["green", "Verified"], rejected: ["red", "Rejected"] };

// the human gate: the assigned operator verifies or rejects each finding before sign-off
function ReviewList({ e, busy, onReview }) {
  const pending = e.findings.filter((f) => (f.review || "pending") === "pending").length;
  return (
    <>
      <h3 style={{ fontSize: "0.95rem", margin: "4px 0 6px" }}>
        Review findings {pending ? <span className="chip warn">{pending} pending</span> : <span className="chip green">all reviewed</span>}
      </h3>
      <p className="dimtxt" style={{ marginBottom: 8 }}>Check each finding's evidence. Only verified findings are delivered; rejected ones are kept out of the report.</p>
      {e.findings.map((f) => {
        const [cls, lbl] = REVIEW_CHIP[f.review || "pending"];
        return (
          <div key={f._id} className="card" style={{ padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={"cvss " + (SEV_CLASS[f.severity] || "l")}>{f.cvss ? f.cvss.toFixed(1) : "—"}</span>
              <b style={{ fontSize: 13 }}>{f.title}</b>
              <span className="mono dim" style={{ fontSize: 11 }}>{f.host}</span>
              <span className={"chip " + cls} style={{ marginLeft: "auto" }}>{lbl}</span>
            </div>
            <div className="dimtxt" style={{ fontSize: 12, marginTop: 6 }}>{[f.owasp, f.cwe].filter(Boolean).join(" · ")}{f.detail ? " — " + f.detail : ""}</div>
            {f.evidence && <pre className="mono" style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflow: "auto", background: "rgba(255,255,255,.03)", padding: 8, borderRadius: 8, marginTop: 6 }}>{f.evidence}</pre>}
            {f.reviewNote && <div className="dimtxt" style={{ fontSize: 12, marginTop: 4 }}>Note: {f.reviewNote}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn sm gold" disabled={busy || f.review === "verified"} onClick={() => onReview(f._id, "verified")}>Verify</button>
              <button className="btn sm danger" disabled={busy || f.review === "rejected"} onClick={() => onReview(f._id, "rejected")}>Reject</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function OpsView({ id, onClose }) {
  const ui = useUI();
  const nav = useNavigate();
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setE((await admin.engagements.get(id)).engagement); } catch (e2) { setErr(e2.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const DONE = { assign: "Assigned to you", run: "Scan started", sync: "Refreshed from the engine", sign: "Signed and delivered to the customer", reject: "Request rejected" };
  const act = async (verb, body) => {
    setBusy(true); setErr("");
    try { await admin.engagements.action(id, verb, body); if (DONE[verb]) ui.toast(DONE[verb]); await load(); }
    catch (e2) { setErr(e2.message); ui.toast(e2.message, "err"); } finally { setBusy(false); }
  };
  const review = async (fid, decision) => {
    let note = "";
    if (decision === "rejected") {
      note = await ui.prompt({ title: "Reject finding as a false positive", body: "It is removed from the report. The reason is recorded in the audit log.", label: "Why is this a false positive?", required: true, multiline: true, confirmLabel: "Reject finding", danger: true });
      if (note === null) return;
    }
    setBusy(true); setErr("");
    try { await admin.engagements.review(id, fid, decision, note); await load(); }
    catch (e2) { setErr(e2.message); ui.toast(e2.message, "err"); } finally { setBusy(false); }
  };
  const doVerb = async (verb) => {
    if (verb === "reject") {
      const reason = await ui.prompt({ title: "Reject this request", body: "The customer sees this reason on their Scans page.", label: "Reason", required: true, multiline: true, confirmLabel: "Reject request", danger: true });
      if (reason !== null) act("reject", { reason });
    } else if (verb === "sign") {
      const n = e.findings.filter((f) => f.review === "verified").length;
      if (await ui.confirm({ title: "Sign and deliver?", body: `${n} verified finding${n === 1 ? "" : "s"} will be delivered to the customer under your name. Rejected findings are left out.`, confirmLabel: "Sign & deliver" })) act("sign");
    } else act(verb);
  };

  // what the operator can do next, given the workflow + scan-engine state
  const next = (x) => {
    const st = x.status, eng = x.engine?.state;
    if (st === "requested") return [["assign", "Assign to me", "gold"], ["reject", "Reject", "danger"]];
    if (st === "assigned") return [["run", "Run scan", "gold"], ["reject", "Reject", "danger"]];
    if (st === "in_progress" && eng === "failed") return [["run", "Re-run scan", "gold"]];
    if (st === "in_progress" && eng && eng !== "completed") return [["sync", "Refresh from engine", "ghost"]];
    if (st === "in_progress") return x.findings?.some((f) => (f.review || "pending") === "pending") ? [] : [["sign", "Sign & deliver", "gold"]];
    return [];
  };
  const ENG = { queued: "warn", running: "gold", completed: "green", failed: "red" };

  return (
    <Modal wide title={e ? e.domainName : "Engagement"} sub={e ? e.tenant : "Loading…"} onClose={onClose}>
      {err && !e && <div className="form-err">{err}</div>}
      {!e && !err ? <Spinner /> : null}
      {e && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <EngStatus status={e.status} />
            {e.kind === "retest" && <span className="chip gold">Retest</span>}
            <span className="chip">{e.roe?.intensity}</span>
            <span className="chip dim">{e.targets?.length || 0} target(s)</span>
            {e.operatorName && <span className="chip gold">{e.operatorName}</span>}
            {e.engine?.state && (
              <span className={"chip " + (ENG[e.engine.state] || "dim")}>
                engine: {e.engine.state}{e.engine.progress != null && e.engine.state === "running" ? ` ${e.engine.progress}%` : ""}
              </span>
            )}
          </div>
          {e.engine?.state === "failed" && e.engine.error && <div className="form-err" style={{ marginBottom: 10 }}>Engine error: {e.engine.error}</div>}
          <div className="fdetail" style={{ marginBottom: 12 }}>
            <div><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>REQUESTED BY</b> {e.requestedByEmail || "—"}</div>
            {e.roe?.window && <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>WINDOW</b> {e.roe.window}</div>}
            {e.roe?.excludes && <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>EXCLUDES</b> {e.roe.excludes}</div>}
            <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>TARGETS</b> {(e.targets || []).join(", ") || e.domainName}</div>
          </div>
          {e.kind === "retest" && e.retestFindings?.length > 0 && (
            <div className="fdetail" style={{ marginBottom: 12 }}>
              <b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>RE-CHECK THESE FIXED FINDINGS</b>
              {e.retestFindings.map((f) => (
                <div key={f._id} style={{ marginTop: 6 }}>
                  <span className={"sev " + (SEV_CLASS[f.severity] || "l")}>{f.severity}</span> {f.title} <span className="mono dim">{f.host}</span>
                  {f.stateNote && <div className="dimtxt" style={{ fontSize: 12 }}>Customer note: “{f.stateNote}”</div>}
                </div>
              ))}
            </div>
          )}
          <ScopingView e={e} />

          {e.findings?.length > 0 && (e.status === "in_progress" && e.engine?.state === "completed" ? (
            <ReviewList e={e} busy={busy} onReview={review} />
          ) : (
            <>
              <h3 style={{ fontSize: "0.95rem", margin: "4px 0 6px" }}>Findings {e.status !== "delivered" && <span className="chip warn">not reviewed</span>}</h3>
              <FindingsTable findings={e.findings} />
            </>
          ))}
          {e.status === "delivered" && e.rejectedCount > 0 && (
            <p className="dimtxt" style={{ marginTop: 6 }}>{e.rejectedCount} false positive(s) were removed by the operator before delivery.</p>
          )}
          {e.status === "delivered" && (
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>Signed by <b style={{ color: "var(--gold)" }}>{e.signedByName}</b> on {e.signedAt ? new Date(e.signedAt).toLocaleString() : "—"}.</p>
          )}
          {err && <div className="form-err">{err}</div>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {next(e).map(([verb, label, cls]) => (
              <button key={verb} className={"btn sm " + cls} disabled={busy} onClick={() => doVerb(verb)}>
                {busy ? "…" : label}
              </button>
            ))}
            {e.status === "delivered" && <button className="btn sm ghost" onClick={() => nav("/admin/reports/" + (e._id || id))}>Open report</button>}
          </div>
        </>
      )}
    </Modal>
  );
}

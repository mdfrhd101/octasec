import { useEffect, useState, useCallback } from "react";
import { get, post } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty } from "../ui.jsx";
import { EngStatus, FindingsTable } from "../components/Engagement.jsx";

const FILTERS = ["open", "requested", "assigned", "in_progress", "delivered", "all"];

export default function AdminEngagements() {
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("open");
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const q = filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      setList((await get("/admin/engagements" + q)).engagements);
    } catch (e) { setErr(e.message); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Engagements">
      <div className="card panel">
        <h3>Scan operations<span className="sp">
          <select className="minisel" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All" : f.replace("_", " ")}</option>)}
          </select>
        </span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Tenant scan requests. Assign, run, verify and sign each one.</p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No engagements.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Domain</th><th>Tenant</th><th>Intensity</th><th>Status</th><th>Operator</th><th>Requested</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="frow" onClick={() => setViewId(e.id)}>
                  <td className="mono">{e.domainName}</td>
                  <td className="dim">{e.tenant}</td>
                  <td><span className="chip">{e.intensity}</span></td>
                  <td><EngStatus status={e.status} /></td>
                  <td className="dim">{e.operator || "—"}</td>
                  <td className="mono dim">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {viewId && <OpsView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

function OpsView({ id, onClose }) {
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setE((await get("/admin/engagements/" + encodeURIComponent(id))).engagement); } catch (e2) { setErr(e2.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (verb, body) => {
    setBusy(true); setErr("");
    try { await post(`/admin/engagements/${encodeURIComponent(id)}/${verb}`, body); await load(); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  const next = (st) => {
    if (st === "requested") return [["assign", "Assign to me", "gold"], ["reject", "Reject", "danger"]];
    if (st === "assigned") return [["run", "Run scan", "gold"], ["reject", "Reject", "danger"]];
    if (st === "in_progress") return [["sign", "Sign & deliver", "gold"]];
    return [];
  };

  return (
    <Modal title={e ? e.domainName : "Engagement"} sub={e ? e.tenant : "Loading…"} onClose={onClose}>
      {err && !e && <div className="form-err">{err}</div>}
      {!e && !err ? <Spinner /> : null}
      {e && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <EngStatus status={e.status} />
            <span className="chip">{e.roe?.intensity}</span>
            <span className="chip dim">{e.targets?.length || 0} target(s)</span>
            {e.operatorName && <span className="chip gold">{e.operatorName}</span>}
          </div>
          <div className="fdetail" style={{ marginBottom: 12 }}>
            <div><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>REQUESTED BY</b> {e.requestedByEmail || "—"}</div>
            {e.roe?.window && <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>WINDOW</b> {e.roe.window}</div>}
            {e.roe?.excludes && <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>EXCLUDES</b> {e.roe.excludes}</div>}
            <div style={{ marginTop: 6 }}><b style={{ color: "var(--gold)", fontFamily: "var(--m)", fontSize: 11 }}>TARGETS</b> {(e.targets || []).join(", ") || e.domainName}</div>
          </div>

          {e.findings?.length > 0 && (
            <>
              <h3 style={{ fontSize: "0.95rem", margin: "4px 0 6px" }}>Findings {e.status !== "delivered" && <span className="chip warn">unverified</span>}</h3>
              <FindingsTable findings={e.findings} />
            </>
          )}
          {e.status === "delivered" && (
            <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 10 }}>Signed by <b style={{ color: "var(--gold)" }}>{e.signedByName}</b> on {e.signedAt ? new Date(e.signedAt).toLocaleString() : "—"}.</p>
          )}
          {err && <div className="form-err">{err}</div>}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {next(e.status).map(([verb, label, cls]) => (
              <button key={verb} className={"btn sm " + cls} disabled={busy}
                onClick={() => verb === "reject" ? act("reject", { reason: prompt("Reason for rejection?") || "" }) : act(verb)}>
                {busy ? "…" : label}
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

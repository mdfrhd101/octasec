import { useEffect, useState, useCallback } from "react";
import { admin } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, useUI } from "../ui.jsx";

const ST = { new: "warn", contacted: "gold", closed: "dim" };
const PLAN = { assessment: "One-off assessment", continuous: "Continuous testing", enterprise: "Enterprise & MSSP" };
const SCOPE = { "1": "1 app / API", "2-5": "2–5 apps", "6-20": "6–20 apps", "20+": "20+ apps", "Not sure": "Scope not sure" };
const Source = ({ l }) => (l.source === "pricing" ? <span className="chip gold">Quote request</span> : <span className="chip dim">Contact form</span>);

export default function AdminLeads() {
  const ui = useUI();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("");
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await admin.leads.list()).leads); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try { await admin.leads.setStatus(id, status); ui.toast("Lead marked " + status); await load(); setView((v) => v && v._id === id ? { ...v, status } : v); }
    catch (e) { ui.toast(e.message, "err"); }
  };

  return (
    <Shell title="Leads">
      <div className="card panel">
        <h3>Contact & quote requests<span className="sp">
          <select className="minisel" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status">
            <option value="">All</option><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
          </select>
        </span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Submissions from the marketing site's contact form and the Pricing page's quote popup land here instantly.
        </p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.filter((l) => !filter || l.status === filter).length === 0 ? <Empty>{list.length ? "No leads with this status." : "No contact requests yet."}</Empty> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Source</th><th>Plan</th><th>Interest</th><th>Status</th><th>When</th></tr></thead>
            <tbody>
              {list.filter((l) => !filter || l.status === filter).map((l) => (
                <tr key={l._id} className="frow" onClick={() => setView(l)}>
                  <td>{l.name}</td>
                  <td className="mono">{l.email}</td>
                  <td>{l.company || "—"}</td>
                  <td><Source l={l} /></td>
                  <td>{PLAN[l.plan] || <span className="dimtxt">—</span>}</td>
                  <td><span className="chip">{l.target}</span></td>
                  <td><span className={"chip " + (ST[l.status] || "dim")}>{l.status}</span></td>
                  <td className="mono dim">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {view && (
        <Modal title={view.name} sub={view.email} onClose={() => setView(null)}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Source l={view} />
            {view.plan && <span className="chip gold">{PLAN[view.plan]}</span>}
            {view.scope && <span className="chip">{SCOPE[view.scope] || view.scope}</span>}
            <span className="chip">{view.target}</span>
            {view.company && <span className="chip dim">{view.company}</span>}
            <span className={"chip " + (ST[view.status] || "dim")}>{view.status}</span>
          </div>
          <div className="fdetail" style={{ whiteSpace: "pre-wrap" }}>{view.message || "(no message)"}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {["new", "contacted", "closed"].map((s) => (
              <button key={s} className={"btn sm " + (view.status === s ? "gold" : "ghost")} onClick={() => setStatus(view._id, s)}>{s}</button>
            ))}
            <a className="btn sm ghost" href={"mailto:" + encodeURIComponent(view.email)} style={{ marginLeft: "auto" }}>Reply by email</a>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

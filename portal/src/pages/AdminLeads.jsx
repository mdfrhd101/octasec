import { useEffect, useState, useCallback } from "react";
import { get, patch } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty } from "../ui.jsx";

const ST = { new: "warn", contacted: "gold", closed: "dim" };

export default function AdminLeads() {
  const [list, setList] = useState(null);
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setList((await get("/admin/leads")).leads); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    try { await patch("/admin/leads/" + encodeURIComponent(id), { status }); await load(); setView((v) => v && v._id === id ? { ...v, status } : v); }
    catch (e) { setErr(e.message); }
  };

  return (
    <Shell title="Leads">
      <div className="card panel">
        <h3>Contact requests</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Submissions from the marketing site's contact form land here instantly.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No contact requests yet.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Interest</th><th>Status</th><th>When</th></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l._id} className="frow" onClick={() => setView(l)}>
                  <td>{l.name}</td>
                  <td className="mono">{l.email}</td>
                  <td>{l.company || "—"}</td>
                  <td><span className="chip">{l.target}</span></td>
                  <td><span className={"chip " + (ST[l.status] || "dim")}>{l.status}</span></td>
                  <td className="mono dim">{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {view && (
        <Modal title={view.name} sub={view.email} onClose={() => setView(null)}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="chip">{view.target}</span>
            {view.company && <span className="chip dim">{view.company}</span>}
            <span className={"chip " + (ST[view.status] || "dim")}>{view.status}</span>
          </div>
          <div className="fdetail" style={{ whiteSpace: "pre-wrap" }}>{view.message || "(no message)"}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {["new", "contacted", "closed"].map((s) => (
              <button key={s} className={"btn sm " + (view.status === s ? "gold" : "ghost")} onClick={() => setStatus(view._id, s)}>{s}</button>
            ))}
            <a className="btn sm ghost" href={`mailto:${view.email}`} style={{ marginLeft: "auto" }}>Reply by email</a>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

import { useEffect, useState, useCallback } from "react";
import { get, post, patch, del } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, CopyBox, Spinner, Empty } from "../ui.jsx";

export default function AdminCompanies() {
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setList((await get("/admin/companies")).companies); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setBusyId(id); setErr("");
    try { await patch("/admin/companies/" + encodeURIComponent(id), { status }); await load(); }
    catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };
  const remove = async (id, name) => {
    if (busyId || !confirm(`Delete "${name}" and ALL its users, clients, domains, assets and tickets? This cannot be undone.`)) return;
    setBusyId(id); setErr("");
    try { await del("/admin/companies/" + encodeURIComponent(id)); await load(); }
    catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };

  return (
    <Shell title="Companies">
      <div className="card panel">
        <h3>Companies<span className="sp"><button className="btn gold sm" onClick={() => setAdding(true)}>+ Add company</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Provision companies, see what each handles, and suspend or remove them.</p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No companies yet.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Company</th><th>Status</th><th>Staff</th><th>Clients</th><th>Domains</th><th>Assets</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.status === "suspended" ? <span className="chip red">Suspended</span> : <span className="chip green">Active</span>}</td>
                  <td className="mono">{c.employees}</td>
                  <td className="mono">{c.clients}</td>
                  <td className="mono">{c.domains}</td>
                  <td className="mono">{c.assets}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {c.status === "suspended"
                      ? <button className="btn sm ghost" disabled={busyId === c.id} onClick={() => setStatus(c.id, "active")}>Activate</button>
                      : <button className="btn sm ghost" disabled={busyId === c.id} onClick={() => setStatus(c.id, "suspended")}>Suspend</button>}{" "}
                    <button className="btn sm danger" disabled={busyId === c.id} onClick={() => remove(c.id, c.name)}>{busyId === c.id ? "…" : "Delete"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {adding && <AddCompany onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </Shell>
  );
}

function AddCompany({ onClose, onAdded }) {
  const [f, setF] = useState({ name: "", adminName: "", adminEmail: "", adminPassword: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try { const res = await post("/admin/companies", f); setDone({ ...res, password: f.adminPassword }); }
    catch (e) { setErr(e.message); setBusy(false); }
  };

  if (done) {
    return (
      <Modal title="Company created" sub={`${done.company.name} is ready. Share these sign-in details with the company admin.`} onClose={onAdded}>
        <CopyBox label="Email" value={done.admin.email} />
        <CopyBox label="Password" value={done.password} />
        <div className="mrow"><button className="btn gold" onClick={onAdded}>Done</button></div>
      </Modal>
    );
  }
  return (
    <Modal title="Add company" sub="Create a company and its first admin account." onClose={onClose}>
      <label>Company name<input value={f.name} onChange={set("name")} placeholder="Company name" autoFocus /></label>
      <div className="fgrid">
        <label>Admin name<input value={f.adminName} onChange={set("adminName")} placeholder="Full name" /></label>
        <label>Admin email<input type="email" value={f.adminEmail} onChange={set("adminEmail")} placeholder="admin@company.com" /></label>
      </div>
      <label>Temporary password<input type="text" value={f.adminPassword} onChange={set("adminPassword")} placeholder="min 8 characters" /></label>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create company"}</button></div>
    </Modal>
  );
}

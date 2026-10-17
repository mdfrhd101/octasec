import { useEffect, useState, useCallback } from "react";
import { get, post, del } from "../api.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner } from "../ui.jsx";

export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setList((await get("/company/employees")).employees); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id, email) => {
    if (busyId || !confirm(`Remove ${email}?`)) return;
    setBusyId(id); setErr("");
    try { await del("/company/employees/" + encodeURIComponent(id)); await load(); }
    catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };

  return (
    <Shell title="Employees">
      <div className="card panel">
        <h3>Team<span className="sp"><button className="btn gold sm" onClick={() => setAdding(true)}>+ Add employee</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Employees share access to your company's clients, domains, assets and scans. They cannot manage staff or billing.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td className="mono">{u.email}</td>
                  <td>{u.role === "company_admin" ? <span className="chip gold">Admin</span> : <span className="chip">Employee</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    {u.role === "employee" && u.id !== user.id
                      ? <button className="btn sm danger" disabled={busyId === u.id} onClick={() => remove(u.id, u.email)}>{busyId === u.id ? "…" : "Remove"}</button>
                      : <span className="chip dim">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {adding && <AddEmployee onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </Shell>
  );
}

function AddEmployee({ onClose, onAdded }) {
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try { await post("/company/employees", f); onAdded(); } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Add employee" sub="Create a staff account under your company. They can sign in with these credentials." onClose={onClose}>
      <div className="fgrid">
        <label>Name<input value={f.name} onChange={set("name")} placeholder="Full name" autoFocus /></label>
        <label>Phone<input value={f.phone} onChange={set("phone")} placeholder="+8801…" /></label>
        <label className="full">Email<input type="email" value={f.email} onChange={set("email")} placeholder="employee@company.com" /></label>
        <label className="full">Temporary password<input type="text" value={f.password} onChange={set("password")} placeholder="min 8 characters" /></label>
      </div>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create employee"}</button></div>
    </Modal>
  );
}

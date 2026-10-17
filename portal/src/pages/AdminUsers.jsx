import { useEffect, useState, useCallback } from "react";
import { get, del } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty } from "../ui.jsx";

export default function AdminUsers() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async () => {
    try { setList((await get("/admin/users")).users); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id, email) => {
    if (busyId || !confirm(`Delete ${email}? This removes their access.`)) return;
    setBusyId(id); setErr("");
    try { await del("/admin/users/" + encodeURIComponent(id)); await load(); }
    catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };

  return (
    <Shell title="Admins & staff">
      <div className="card panel">
        <h3>Company admins &amp; employees</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>All company-side accounts across the platform. You can revoke any of them.</p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No company accounts yet.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td className="mono">{u.email}</td>
                  <td>{u.company}</td>
                  <td>{u.role === "company_admin" ? <span className="chip gold">Company admin</span> : <span className="chip">Employee</span>}</td>
                  <td style={{ textAlign: "right" }}><button className="btn sm danger" disabled={busyId === u.id} onClick={() => remove(u.id, u.email)}>{busyId === u.id ? "…" : "Delete"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}

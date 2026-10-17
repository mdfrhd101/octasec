import { useEffect, useState, useCallback } from "react";
import { get, post, patch, del } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty } from "../ui.jsx";
import { UserStatus } from "../components/UserAdmin.jsx";

const ROLES = [["", "All roles"], ["company_admin", "Company admins"], ["employee", "Employees"], ["client", "Clients"]];
const ROLE_CHIP = {
  company_admin: <span className="chip gold">Company admin</span>,
  employee: <span className="chip">Employee</span>,
  client: <span className="chip">Client</span>,
};

export default function AdminUsers() {
  const [list, setList] = useState(null);
  const [role, setRole] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { setList((await get("/admin/users" + (role ? "?role=" + encodeURIComponent(role) : ""))).users); }
    catch (e) { setErr(e.message); }
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn) => {
    if (busyId) return;
    setBusyId(id); setErr("");
    try { await fn(); await load(); } catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };
  const path = (id) => "/admin/users/" + encodeURIComponent(id);
  const toggle = (u) => {
    const next = u.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" && !confirm(`Disable ${u.email}? They are signed out everywhere and cannot sign in.`)) return;
    act(u.id, () => patch(path(u.id), { status: next }));
  };
  const reset = (u) => {
    if (!confirm(`Reset the password for ${u.email}? Their password stops working, their sessions end, and they get an email link to choose a new one.`)) return;
    act(u.id, async () => {
      const r = await post(path(u.id) + "/reset-password");
      setMsg(r.emailSent ? `Reset link emailed to ${u.email}.` : `Password reset, but the email could not be sent — check the SMTP settings.`);
    });
  };
  const remove = (u) => {
    if (!confirm(`Delete ${u.email}? This removes their access.`)) return;
    act(u.id, () => del(path(u.id)));
  };

  return (
    <Shell title="Users">
      <div className="card panel">
        <h3>Tenant users
          <span className="sp">
            <select value={role} onChange={(e) => { setList(null); setRole(e.target.value); }} aria-label="Filter by role" style={{ width: "auto", padding: "7px 10px", fontSize: 12 }}>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </span>
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Every customer-side account on the platform. Disable access, reset a password, or remove a company account.</p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {msg && <div style={{ color: "var(--green)", fontSize: 13, marginTop: 10 }}>{msg}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No accounts match.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td className="mono">{u.email}</td>
                  <td>{u.company}</td>
                  <td>{ROLE_CHIP[u.role] || u.role}</td>
                  <td><UserStatus u={u} /></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {busyId === u.id ? <span className="chip dim">…</span> : (
                      <>
                        <button className="btn sm ghost" onClick={() => reset(u)}>Reset password</button>{" "}
                        <button className={"btn sm " + (u.status === "disabled" ? "ghost" : "danger")} onClick={() => toggle(u)}>{u.status === "disabled" ? "Enable" : "Disable"}</button>{" "}
                        {u.role !== "client" && <button className="btn sm danger" onClick={() => remove(u)}>Delete</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </Shell>
  );
}

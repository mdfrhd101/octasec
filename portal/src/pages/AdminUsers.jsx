import { useEffect, useState, useCallback, useMemo } from "react";
import { admin } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty, LoadError, TableWrap, useUI } from "../ui.jsx";
import { UserStatus } from "../components/UserAdmin.jsx";

const ROLES = [["", "All roles"], ["company_admin", "Company admins"], ["employee", "Employees"], ["client", "Clients"]];
const ROLE_CHIP = {
  company_admin: <span className="chip gold">Company admin</span>,
  employee: <span className="chip">Employee</span>,
  client: <span className="chip">Client</span>,
};

export default function AdminUsers() {
  const ui = useUI();
  const [list, setList] = useState(null);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setErr("");
    try { setList((await admin.users.list(role)).users); } catch (e) { setErr(e.message); }
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list || []).filter((u) => !s || [u.email, u.name, u.company].some((x) => (x || "").toLowerCase().includes(s)));
  }, [list, q]);

  const act = async (id, fn, okMsg) => {
    if (busyId) return;
    setBusyId(id);
    if (await ui.run(fn, okMsg)) await load();
    setBusyId(null);
  };
  const toggle = async (u) => {
    const next = u.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" && !(await ui.confirm({ title: `Disable ${u.email}?`, body: "They are signed out everywhere and cannot sign in until enabled again.", confirmLabel: "Disable", danger: true }))) return;
    act(u.id, () => admin.users.setStatus(u.id, next), next === "disabled" ? `${u.email} disabled` : `${u.email} enabled`);
  };
  const reset = async (u) => {
    if (!(await ui.confirm({ title: `Reset password for ${u.email}?`, body: "Their password stops working, their sessions end, and they get an email link to choose a new one.", confirmLabel: "Send reset link" }))) return;
    act(u.id, async () => {
      const r = await admin.users.resetPassword(u.id);
      if (!r.emailSent) throw new Error("Password reset, but the email could not be sent — check the SMTP settings.");
    }, `Reset link emailed to ${u.email}`);
  };
  const remove = async (u) => {
    if (!(await ui.confirm({ title: `Delete ${u.email}?`, body: "This removes the account and its access. Company data stays with the company.", confirmLabel: "Delete user", danger: true }))) return;
    act(u.id, () => admin.users.remove(u.id), `${u.email} deleted`);
  };

  return (
    <Shell title="Users">
      <div className="card panel">
        <h3>Tenant users{list && <span className="sp dimtxt" style={{ fontSize: 12 }}>{rows.length} of {list.length}</span>}</h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Every customer-side account on the platform. Disable access, reset a password, or remove a company account.</p>
        <div className="filters">
          <input className="grow" placeholder="Search name, email or company…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={role} onChange={(e) => { setList(null); setRole(e.target.value); }} aria-label="Filter by role">
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : rows.length === 0 ? <Empty>No accounts match.</Empty> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || "—"}</td>
                    <td className="mono">{u.email}</td>
                    <td>{u.company}</td>
                    <td>{ROLE_CHIP[u.role] || u.role}</td>
                    <td><UserStatus u={u} /></td>
                    <td>
                      {busyId === u.id ? <span className="spin" /> : (
                        <div className="acts">
                          <button className="btn sm ghost" onClick={() => reset(u)}>Reset password</button>
                          <button className={"btn sm " + (u.status === "disabled" ? "ghost" : "danger")} onClick={() => toggle(u)}>{u.status === "disabled" ? "Enable" : "Disable"}</button>
                          {u.role !== "client" && <button className="btn sm danger" onClick={() => remove(u)}>Delete</button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </Shell>
  );
}

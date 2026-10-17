import { useEffect, useState, useCallback } from "react";
import { get, post, patch, del } from "../api.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner } from "../ui.jsx";
import { UserStatus } from "../components/UserAdmin.jsx";

export default function Employees() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try { setList((await get("/company/employees")).employees); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn) => {
    if (busyId) return;
    setBusyId(id); setErr("");
    try { await fn(); await load(); } catch (e) { setErr(e.message); } finally { setBusyId(null); }
  };
  const path = (id) => "/company/employees/" + encodeURIComponent(id);
  const remove = (u) => { if (confirm(`Remove ${u.email}?`)) act(u.id, () => del(path(u.id))); };
  const toggle = (u) => {
    const next = u.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" && !confirm(`Disable ${u.email}? They are signed out and cannot sign in.`)) return;
    act(u.id, () => patch(path(u.id), { status: next }));
  };
  const reset = (u) => {
    if (!confirm(`Reset the password for ${u.email}? They get an email link to choose a new one.`)) return;
    act(u.id, async () => {
      const r = await post(path(u.id) + "/reset-password");
      setMsg(r.emailSent ? `Reset link emailed to ${u.email}.` : `Password reset, but the email could not be sent — check the SMTP settings.`);
    });
  };

  return (
    <Shell title="Employees">
      <div className="card panel">
        <h3>Team<span className="sp"><button className="btn gold sm" onClick={() => setAdding(true)}>+ Add employee</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Employees share access to your company's clients, domains, assets and scans. They cannot manage staff or billing.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {msg && <div style={{ color: "var(--green)", fontSize: 13, marginTop: 10 }}>{msg}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : (
          <table className="tbl">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || "—"}</td>
                  <td className="mono">{u.email}</td>
                  <td>{u.role === "company_admin" ? <span className="chip gold">Admin</span> : <span className="chip">Employee</span>}</td>
                  <td><UserStatus u={u} /></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {u.role !== "employee" || u.id === user.id ? <span className="chip dim">—</span>
                      : busyId === u.id ? <span className="chip dim">…</span> : (
                        <>
                          <button className="btn sm ghost" onClick={() => reset(u)}>Reset password</button>{" "}
                          <button className={"btn sm " + (u.status === "disabled" ? "ghost" : "danger")} onClick={() => toggle(u)}>{u.status === "disabled" ? "Enable" : "Disable"}</button>{" "}
                          <button className="btn sm danger" onClick={() => remove(u)}>Remove</button>
                        </>
                      )}
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
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const r = await post("/company/employees", f);
      if (!r.inviteSent) alert("Employee created, but the invitation email could not be sent — check the SMTP settings, then use Reset password to resend.");
      onAdded();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Add employee" sub="They get an email invitation to set their own password — you never see it." onClose={onClose}>
      <div className="fgrid">
        <label>Name<input value={f.name} onChange={set("name")} placeholder="Full name" autoFocus /></label>
        <label>Phone<input value={f.phone} onChange={set("phone")} placeholder="+8801…" /></label>
        <label className="full">Email<input type="email" value={f.email} onChange={set("email")} placeholder="employee@company.com" /></label>
      </div>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create employee"}</button></div>
    </Modal>
  );
}

import { useEffect, useState, useCallback } from "react";
import { company } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, TableWrap, useUI } from "../ui.jsx";
import { UserStatus } from "../components/UserAdmin.jsx";

const staff = company.employees;

export default function Employees() {
  const { user } = useAuth();
  const ui = useUI();
  const [list, setList] = useState(null);
  const [modal, setModal] = useState(null); // {type:"add"} | {type:"edit", u}
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setErr("");
    try { setList((await staff.list()).employees); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, okMsg) => {
    if (busyId) return;
    setBusyId(id);
    if (await ui.run(fn, okMsg)) await load();
    setBusyId(null);
  };
  const remove = async (u) => {
    if (await ui.confirm({ title: `Remove ${u.email}?`, body: "Their account is deleted and they lose access immediately. Work they did (domains, scans, reports) stays with the company.", confirmLabel: "Remove employee", danger: true }))
      act(u.id, () => staff.remove(u.id), `${u.email} removed`);
  };
  const toggle = async (u) => {
    const next = u.status === "disabled" ? "active" : "disabled";
    if (next === "disabled" && !(await ui.confirm({ title: `Disable ${u.email}?`, body: "They are signed out everywhere and cannot sign in until you enable the account again.", confirmLabel: "Disable", danger: true }))) return;
    act(u.id, () => staff.setStatus(u.id, next), next === "disabled" ? `${u.email} disabled` : `${u.email} enabled`);
  };
  const reset = async (u) => {
    if (!(await ui.confirm({ title: `Reset password for ${u.email}?`, body: "Their current password stops working, their sessions end, and they get an email link to choose a new one.", confirmLabel: "Send reset link" }))) return;
    act(u.id, async () => {
      const r = await staff.resetPassword(u.id);
      if (!r.emailSent) throw new Error("Password reset, but the email could not be sent — check the SMTP settings.");
    }, `Reset link emailed to ${u.email}`);
  };

  return (
    <Shell title="Employees">
      <div className="card panel">
        <h3>Team<span className="sp"><button className="btn gold sm" onClick={() => setModal({ type: "add" })}>+ Add employee</button></span></h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>
          Employees share access to your company's clients, domains, assets and scans. They cannot manage staff, the organisation profile or API keys.
        </p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No team members yet.</Empty> : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || "—"}</td>
                    <td className="mono">{u.email}</td>
                    <td className="mono dim">{u.phone || "—"}</td>
                    <td>{u.role === "company_admin" ? <span className="chip gold">Admin</span> : <span className="chip">Employee</span>}</td>
                    <td><UserStatus u={u} /></td>
                    <td>
                      {u.role !== "employee" || u.id === user.id ? <span className="chip dim">You / admin</span>
                        : busyId === u.id ? <span className="spin" /> : (
                          <div className="acts">
                            <button className="btn sm ghost" onClick={() => setModal({ type: "edit", u })}>Edit</button>
                            <button className="btn sm ghost" onClick={() => reset(u)}>Reset password</button>
                            <button className={"btn sm " + (u.status === "disabled" ? "ghost" : "danger")} onClick={() => toggle(u)}>{u.status === "disabled" ? "Enable" : "Disable"}</button>
                            <button className="btn sm danger" onClick={() => remove(u)}>Remove</button>
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

      {modal && <EmployeeForm u={modal.u} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </Shell>
  );
}

// add (u undefined → invite) or edit name / phone
function EmployeeForm({ u, onClose, onSaved }) {
  const ui = useUI();
  const editing = !!u;
  const [f, setF] = useState({ name: u?.name || "", phone: u?.phone || "", email: u?.email || "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (editing) {
        await staff.update(u.id, { name: f.name.trim(), phone: f.phone.trim() });
        ui.toast("Employee updated");
      } else {
        const r = await staff.invite({ name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() });
        if (r.inviteSent) ui.toast(`Invitation emailed to ${f.email.trim()}`);
        else ui.toast("Employee created, but the invitation email could not be sent — check SMTP, then use Reset password to resend.", "err");
      }
      onSaved();
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={editing ? `Edit ${u.email}` : "Add employee"} sub={editing ? "Update their contact details." : "They get an email invitation to set their own password — you never see it."} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="fgrid">
          <label>Name<span className="req">*</span><input required maxLength={80} value={f.name} onChange={set("name")} placeholder="Full name" autoFocus /></label>
          <label>Phone<input maxLength={32} value={f.phone} onChange={set("phone")} placeholder="+8801…" /></label>
          {!editing && <label className="full">Work email<span className="req">*</span><input required type="email" value={f.email} onChange={set("email")} placeholder="employee@company.com" /></label>}
        </div>
        {err && <div className="form-err">{err}</div>}
        <div className="mrow"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Send invitation"}</button></div>
      </form>
    </Modal>
  );
}

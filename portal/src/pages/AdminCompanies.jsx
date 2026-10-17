import { useEffect, useState, useCallback } from "react";
import { admin } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Modal, CopyBox, Spinner, Empty, Tile, LoadError, TableWrap, useUI } from "../ui.jsx";
import { OrgProfileForm, OrgProfileView, Completeness } from "../components/OrgProfile.jsx";
import { INDUSTRIES, AUTH_CHIP, fillProfile } from "../profileOptions.js";

export default function AdminCompanies() {
  const ui = useUI();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await admin.companies.list()).companies); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setStatus = async (c, status) => {
    if (status === "suspended" && !(await ui.confirm({ title: `Suspend ${c.name}?`, body: "All of its users are signed out and cannot sign in until the company is activated again. No data is deleted.", confirmLabel: "Suspend", danger: true }))) return;
    setBusyId(c.id);
    if (await ui.run(() => admin.companies.setStatus(c.id, status), status === "suspended" ? `${c.name} suspended` : `${c.name} activated`)) await load();
    setBusyId(null);
  };
  const remove = async (c) => {
    if (busyId) return;
    const typed = await ui.prompt({
      title: `Delete ${c.name}?`,
      body: "This permanently deletes the company and ALL its users, clients, domains, assets, scans and tickets. It cannot be undone. Type the company name to confirm.",
      label: "Company name", required: true, confirmLabel: "Delete permanently", danger: true,
    });
    if (typed === null) return;
    if (typed !== c.name) { ui.toast("The name did not match — nothing was deleted.", "err"); return; }
    setBusyId(c.id);
    if (await ui.run(() => admin.companies.remove(c.id), `${c.name} deleted`)) await load();
    setBusyId(null);
  };

  return (
    <Shell title="Companies">
      <div className="card panel">
        <h3>Companies<span className="sp"><button className="btn gold sm" onClick={() => setAdding(true)}>+ Add company</button></span></h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Provision companies, see what each handles, and suspend or remove them. Click a row for the full profile.</p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? <Empty>No companies yet.</Empty> : (
          <TableWrap><table className="tbl">
            <thead><tr><th>Company</th><th>Industry</th><th>Profile</th><th>Status</th><th>Staff</th><th>Clients</th><th>Domains</th><th>Assets</th><th></th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="frow" onClick={() => setViewId(c.id)}>
                  <td>{c.name}</td>
                  <td className="dimtxt">{INDUSTRIES[c.industry] || "—"}</td>
                  <td className="mono">{c.profilePct}%</td>
                  <td>{c.status === "suspended" ? <span className="chip red">Suspended</span> : <span className="chip green">Active</span>}</td>
                  <td className="mono">{c.employees}</td>
                  <td className="mono">{c.clients}</td>
                  <td className="mono">{c.domains}</td>
                  <td className="mono">{c.assets}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="acts">
                      {c.status === "suspended"
                        ? <button className="btn sm ghost" disabled={busyId === c.id} onClick={() => setStatus(c, "active")}>Activate</button>
                        : <button className="btn sm ghost" disabled={busyId === c.id} onClick={() => setStatus(c, "suspended")}>Suspend</button>}
                      <button className="btn sm danger" disabled={busyId === c.id} onClick={() => remove(c)}>{busyId === c.id ? "…" : "Delete"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></TableWrap>
        )}
      </div>
      {viewId && <CompanyView id={viewId} onClose={() => setViewId(null)} onChanged={load} />}
      {adding && <AddCompany onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </Shell>
  );
}

function AddCompany({ onClose, onAdded }) {
  const [profile, setProfile] = useState(fillProfile(null));
  const [f, setF] = useState({ adminName: "", adminEmail: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const res = await admin.companies.create({ ...f, name: profile.tradeName || profile.legalName, profile });
      setDone(res);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  if (done) {
    return (
      <Modal title="Company created" sub={done.inviteSent
        ? `${done.company.name} is ready. An invitation was emailed to ${done.admin.email} — they set their own password from it.`
        : `${done.company.name} is ready, but the invitation email could not be sent. Fix the SMTP settings, then use Users → Reset password to resend.`} onClose={onAdded}>
        <CopyBox label="Admin email" value={done.admin.email} />
        <div className="mrow"><button className="btn gold" onClick={onAdded}>Done</button></div>
      </Modal>
    );
  }
  return (
    <Modal wide title="Add company" sub="Who the customer is, who to call, and their first admin account. Fields marked * are required." onClose={onClose}>
      <OrgProfileForm value={profile} onChange={setProfile} />
      <div className="fsec">First company admin account</div>
      <div className="fgrid">
        <label>Admin name<input value={f.adminName} onChange={set("adminName")} placeholder="Full name" /></label>
        <label><span>Admin email <span className="req">*</span></span><input type="email" value={f.adminEmail} onChange={set("adminEmail")} placeholder="admin@company.com" /></label>
      </div>
      <p className="dimtxt" style={{ marginTop: 8 }}>The admin receives an email invitation and sets their own password — nobody else ever knows it.</p>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create company"}</button></div>
    </Modal>
  );
}

function CompanyView({ id, onClose, onChanged }) {
  const ui = useUI();
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setD(await admin.companies.get(id)); } catch (e) { setErr(e.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    setErr(""); setBusy(true);
    try { await admin.companies.updateProfile(id, form); setForm(null); ui.toast("Company details saved"); await load(); onChanged(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const e = d?.counts?.engagements || {};
  return (
    <Modal wide title={d ? d.company.name : "Company"} sub={d ? undefined : "Loading…"} onClose={onClose}>
      {err && <div className="form-err">{err}</div>}
      {!d && !err && <Spinner />}
      {d && (form ? (
        <>
          <OrgProfileForm value={form} onChange={setForm} />
          <div className="mrow"><button className="btn ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn gold" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save details"}</button></div>
        </>
      ) : (
        <>
          <Completeness c={d.completeness} action={<button className="btn gold sm" onClick={() => setForm(fillProfile(d.profile || { legalName: d.company.name }))}>Edit details</button>} />
          <div className="tiles" style={{ marginTop: 14 }}>
            <Tile k="Domains" v={d.counts.domains} /><Tile k="Verified" v={d.counts.verified} /><Tile k="Assets" v={d.counts.assets} />
            <Tile k="Open tickets" v={d.counts.openTickets} /><Tile k="Scans in flight" v={(e.requested || 0) + (e.assigned || 0) + (e.in_progress || 0)} gold /><Tile k="Delivered" v={e.delivered || 0} />
          </div>
          <div className="fsec">Organisation</div>
          <OrgProfileView profile={d.profile} />
          <div className="fsec">People ({d.users.length})</div>
          <TableWrap><table className="tbl narrow"><tbody>{d.users.map((u) => (
            <tr key={u.id}><td>{u.name || "—"}</td><td className="mono">{u.email}</td><td>{u.role === "company_admin" ? <span className="chip gold">Company admin</span> : <span className="chip">Employee</span>}</td><td>{u.status === "disabled" ? <span className="chip red">Disabled</span> : <span className="chip green">Active</span>}</td></tr>
          ))}</tbody></table></TableWrap>
          <div className="fsec">Clients they manage ({d.clients.length})</div>
          {d.clients.length ? (
            <TableWrap><table className="tbl narrow"><tbody>{d.clients.map((c) => {
              const [cls, lbl] = AUTH_CHIP[c.authorization] || AUTH_CHIP.missing;
              return <tr key={c.id}><td>{c.name}</td><td className="dimtxt">{INDUSTRIES[c.industry] || "—"}</td><td><span className={"chip " + cls}>{lbl}</span></td></tr>;
            })}</tbody></table></TableWrap>
          ) : <p className="dimtxt">No clients.</p>}
        </>
      ))}
    </Modal>
  );
}

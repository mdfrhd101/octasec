import { useEffect, useState, useCallback } from "react";
import { auth, company } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Spinner } from "../ui.jsx";
import { OrgProfileForm, OrgProfileView, Completeness } from "../components/OrgProfile.jsx";
import { fillProfile } from "../profileOptions.js";

// Organisation profile: company_admin edits the company's, employees read it,
// a self-serve client edits their own.
export default function Organization() {
  const { user } = useAuth();
  const isClient = user.role === "client";
  const canEdit = isClient || user.role === "company_admin";
  const svc = isClient ? { get: auth.getProfile, save: auth.updateProfile } : { get: company.getProfile, save: company.updateProfile };

  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await svc.get();
      setData(d);
      if (!d.profile && canEdit) { setForm(fillProfile(null)); setEditing(true); }
    } catch (e) { setErr(e.message); }
  }, [isClient, canEdit]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const d = await svc.save(form);
      setData((x) => ({ ...x, ...d }));
      setEditing(false); setMsg("Saved.");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Shell title="Organisation">
      {!data ? <div className="card panel">{err ? <div className="form-err">{err}</div> : <Spinner />}</div> : (
        <>
          <div className="card panel">
            <Completeness c={data.completeness} action={canEdit && !editing && (
              <button className="btn gold sm" onClick={() => { setForm(fillProfile(data.profile)); setEditing(true); setMsg(""); }}>Edit details</button>
            )} />
            <p className="dimtxt" style={{ marginTop: 10 }}>
              We use these details for contracts, report covers, compliance mapping and — most importantly — to reach the right person
              during a live test. {!canEdit && "Only your company admin can change them."}
            </p>
          </div>
          <div className="card panel">
            <h3>{editing ? "Edit organisation details" : data.company?.name || data.profile?.legalName || "Organisation details"}</h3>
            {editing ? (
              <>
                <OrgProfileForm value={form} onChange={setForm} />
                {err && <div className="form-err">{err}</div>}
                <div className="mrow">
                  {data.profile && <button className="btn ghost" onClick={() => { setEditing(false); setErr(""); }}>Cancel</button>}
                  <button className="btn gold" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
                </div>
              </>
            ) : (
              <>
                <OrgProfileView profile={data.profile} />
                {msg && <div style={{ color: "var(--green)", fontSize: 13, marginTop: 10 }}>{msg}</div>}
              </>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

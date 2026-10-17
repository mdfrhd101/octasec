import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, patch } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty } from "../ui.jsx";
import { OrgProfileForm, OrgProfileView, Completeness } from "../components/OrgProfile.jsx";
import { INDUSTRIES, AUTH_CHIP, fillProfile } from "../profileOptions.js";
import { EngStatus } from "../components/Engagement.jsx";

const AuthChip = ({ s }) => { const [c, l] = AUTH_CHIP[s] || AUTH_CHIP.missing; return <span className={"chip " + c}>{l}</span>; };
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default function Clients() {
  const nav = useNavigate();
  const [clients, setClients] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | client id
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setClients((await get("/clients")).clients); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Clients">
      <div className="card panel">
        <h3>Client accounts<span className="sp"><button className="btn gold sm" onClick={() => setEditing("new")}>+ Add client</button></span></h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>
          The businesses you manage. Each needs its own contacts and a written <b>authorisation to test</b> on file —
          scans on a client's domains are blocked until it is recorded and in date.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!clients ? <div style={{ padding: 20 }}><Spinner /></div> : (
          <table className="tbl">
            <thead><tr><th>Client</th><th>Industry</th><th>Primary contact</th><th>Authorisation</th><th>Domains</th><th>Assets</th><th>Profile</th><th></th></tr></thead>
            <tbody>
              <tr>
                <td>My organisation <span className="chip gold">you</span></td>
                <td colSpan={6} className="dimtxt">Your own domains</td>
                <td style={{ textAlign: "right" }}><button className="btn sm ghost" onClick={() => nav("/domains")}>Domains</button></td>
              </tr>
              {clients.map((c) => (
                <tr key={c._id} className="frow" onClick={() => setViewId(c._id)}>
                  <td>{c.name}{c.status === "inactive" && <> <span className="chip dim">inactive</span></>}</td>
                  <td>{INDUSTRIES[c.industry] || <span className="dimtxt">—</span>}</td>
                  <td>{c.primaryContact ? <>{c.primaryContact.name}<br /><span className="mono dim">{c.primaryContact.email}</span></> : <span className="chip warn">missing</span>}</td>
                  <td><AuthChip s={c.authorization} />{c.authorizationValidUntil && c.authorization === "valid" && <div className="mono dim" style={{ fontSize: 11, marginTop: 4 }}>until {day(c.authorizationValidUntil)}</div>}</td>
                  <td className="mono">{c.domainCount}</td>
                  <td className="mono">{c.assetCount}</td>
                  <td className="mono">{c.completeness}%</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn sm ghost" onClick={() => setEditing(c._id)}>Edit</button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={8}><Empty>No client accounts yet.</Empty></td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {editing && <ClientEditor id={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewId && <ClientView id={viewId} onClose={() => setViewId(null)} onEdit={() => { setEditing(viewId); setViewId(null); }} />}
    </Shell>
  );
}

function ClientEditor({ id, onClose, onSaved }) {
  const [profile, setProfile] = useState(id ? null : fillProfile(null));
  const [auth, setAuth] = useState({ onFile: false, authorizerName: "", authorizerTitle: "", documentRef: "", validUntil: "" });
  const [status, setStatus] = useState("active");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { client } = await get("/clients/" + encodeURIComponent(id));
        setProfile(fillProfile(client.profile || { legalName: client.name }));
        const a = client.authorization || {};
        setAuth({ onFile: !!a.onFile, authorizerName: a.authorizerName || "", authorizerTitle: a.authorizerTitle || "", documentRef: a.documentRef || "", validUntil: day(a.validUntil) });
        setStatus(client.status || "active");
      } catch (e) { setErr(e.message); }
    })();
  }, [id]);

  const setA = (k) => (e) => setAuth((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const save = async () => {
    setErr(""); setBusy(true);
    const body = { profile, authorization: auth, status };
    try {
      if (id) await patch("/clients/" + encodeURIComponent(id), body); else await post("/clients", body);
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal wide title={id ? "Edit client" : "Add client account"} sub="Fields marked * are required. Contacts and authorisation are what let us test safely." onClose={onClose}>
      {!profile ? <Spinner /> : (
        <>
          <OrgProfileForm value={profile} onChange={setProfile} nameHint="Client's registered company name" />

          <div className="fsec">Authorisation to test</div>
          <div className="roe">
            <label className="chkrow">
              <input type="checkbox" checked={auth.onFile} onChange={setA("onFile")} />
              <span>We hold this client's <b>signed written authorisation</b> (letter of authority) for OctaSec to test the domains we assign to them.</span>
            </label>
          </div>
          <div className="fgrid" style={{ marginTop: 10 }}>
            <label><span>Signed by (name) {auth.onFile && <span className="req">*</span>}</span><input value={auth.authorizerName} onChange={setA("authorizerName")} maxLength={80} /></label>
            <label><span>Their title {auth.onFile && <span className="req">*</span>}</span><input value={auth.authorizerTitle} onChange={setA("authorizerTitle")} maxLength={80} placeholder="CEO, CTO…" /></label>
            <label>Document reference<input value={auth.documentRef} onChange={setA("documentRef")} maxLength={80} placeholder="LoA-2026-014" /></label>
            <label>Valid until<input type="date" value={auth.validUntil} onChange={setA("validUntil")} /></label>
          </div>

          <div className="fgrid" style={{ marginTop: 6 }}>
            <label>Account status
              <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive — no new scans</option></select>
            </label>
          </div>

          {err && <div className="form-err">{err}</div>}
          <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={save} disabled={busy}>{busy ? "Saving…" : id ? "Save changes" : "Create client"}</button></div>
        </>
      )}
    </Modal>
  );
}

function ClientView({ id, onClose, onEdit }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => { try { setD(await get("/clients/" + encodeURIComponent(id))); } catch (e) { setErr(e.message); } })();
  }, [id]);
  const c = d?.client;
  const a = c?.authorization || {};
  return (
    <Modal wide title={c ? c.name : "Client"} sub={c ? undefined : "Loading…"} onClose={onClose}>
      {err && <div className="form-err">{err}</div>}
      {!d && !err && <Spinner />}
      {c && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <AuthChip s={c.authorizationState} />
            {c.status === "inactive" ? <span className="chip dim">Inactive</span> : <span className="chip green">Active</span>}
            <span style={{ marginLeft: "auto" }}><button className="btn gold sm" onClick={onEdit}>Edit</button></span>
          </div>
          <Completeness c={c.completeness} />
          <div className="fsec">Authorisation to test</div>
          {a.onFile ? (
            <div className="kvgrid">
              <div className="kv"><span>Signed by</span><b>{a.authorizerName} · {a.authorizerTitle}</b></div>
              <div className="kv"><span>Reference</span><b>{a.documentRef || "—"}</b></div>
              <div className="kv"><span>Valid until</span><b>{a.validUntil ? day(a.validUntil) : "No expiry"}</b></div>
            </div>
          ) : <p className="dimtxt">No authorisation recorded — scans on this client's domains are blocked.</p>}
          <div className="fsec">Organisation</div>
          <OrgProfileView profile={c.profile} />
          <div className="fsec">Domains ({d.domains.length})</div>
          {d.domains.length ? (
            <table className="tbl"><tbody>{d.domains.map((x) => (
              <tr key={x._id}><td className="mono">{x.name}</td><td>{x.verified ? <span className="chip green">Verified</span> : <span className="chip warn">Unverified</span>}</td><td className="dimtxt">{x.env} · {x.criticality}</td></tr>
            ))}</tbody></table>
          ) : <p className="dimtxt">No domains assigned yet — assign them from the Domains page.</p>}
          <div className="fsec">Engagements</div>
          {d.engagements.length ? (
            <table className="tbl"><tbody>{d.engagements.map((e) => (
              <tr key={e.id}><td className="mono">{e.domainName}</td><td><EngStatus status={e.status} /></td><td className="mono dim">{new Date(e.createdAt).toLocaleDateString()}</td><td className="mono">{e.findings} findings</td></tr>
            ))}</tbody></table>
          ) : <p className="dimtxt">No scans requested for this client yet.</p>}
        </>
      )}
    </Modal>
  );
}

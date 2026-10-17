import { useCallback, useEffect, useState } from "react";
import Shell from "../components/Shell.jsx";
import { apiKeys, isNotImplemented } from "../services/index.js";
import { Spinner, Empty, Modal, CopyBox, Pending, LoadError, TableWrap, useUI } from "../ui.jsx";

// API keys for the customer's own tooling / CI.
// Wired to services/apiKeys.js. Until the backend implements the endpoints
// (contract: docs/PORTAL_FRONTEND_PLAN.md §3) the API answers 501 and this page
// shows "not available yet" — no fake keys are ever displayed.
const SCOPES = { read: "Read — domains, scans, reports", request: "Request scans and retests" };
const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function ApiKeys() {
  const ui = useUI();
  const [state, setState] = useState({ loading: true });
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState(null);

  const load = useCallback(async () => {
    try { setState({ keys: (await apiKeys.list()).keys || [] }); }
    catch (e) { setState(isNotImplemented(e) ? { pending: true } : { err: e.message }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = async (k) => {
    if (!(await ui.confirm({ title: `Revoke “${k.name}”?`, body: "Anything using this key stops working immediately. This cannot be undone.", confirmLabel: "Revoke key", danger: true }))) return;
    if (await ui.run(() => apiKeys.revoke(k.id), "Key revoked")) load();
  };

  return (
    <Shell title="API & integrations">
      <div className="card panel">
        <h3>API keys
          {state.keys && <span className="sp"><button className="btn gold sm" onClick={() => setCreating(true)}>Create key</button></span>}
        </h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>
          Connect your own tooling and CI/CD to OctaSec: list domains, request scans and pull signed reports. A key is shown once when created; store it in your secret manager.
        </p>
        {state.loading ? <div style={{ padding: 20 }}><Spinner /></div>
          : state.pending ? (
            <Pending>
              API access is being prepared for your organisation. Until it is enabled, request scans and download reports here in the portal.
              Need API access sooner? Open a ticket under Support.
            </Pending>
          ) : state.err ? <LoadError msg={state.err} onRetry={load} />
          : state.keys.length === 0 ? <Empty>No API keys yet.</Empty> : (
            <TableWrap>
              <table className="tbl">
                <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Created</th><th>Last used</th><th></th></tr></thead>
                <tbody>
                  {state.keys.map((k) => (
                    <tr key={k.id}>
                      <td>{k.name}</td>
                      <td className="mono dim">{k.prefix}…</td>
                      <td>{(k.scopes || []).map((s) => <span key={s} className="chip">{s}</span>)}</td>
                      <td className="mono dim">{day(k.createdAt)}</td>
                      <td className="mono dim">{day(k.lastUsedAt)}</td>
                      <td style={{ textAlign: "right" }}><button className="btn sm danger" onClick={() => revoke(k)}>Revoke</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
      </div>

      <div className="card panel">
        <h3>Integrations</h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Planned connectors — tell us under Support which ones you need first.</p>
        <div style={{ marginTop: 10 }}>
          {["Webhooks", "GitHub Actions", "GitLab CI", "Jira", "Slack", "REST API"].map((x) => <span key={x} className="chip">{x}</span>)}
        </div>
      </div>

      {creating && <CreateKey onClose={() => setCreating(false)} onCreated={(s) => { setCreating(false); setSecret(s); load(); }} />}
      {secret && (
        <Modal title="Copy your new key" sub="This is the only time the full key is shown." onClose={() => setSecret(null)}>
          <CopyBox value={secret} />
          <div className="dlg-act"><button className="btn gold sm" onClick={() => setSecret(null)}>I have stored it</button></div>
        </Modal>
      )}
    </Shell>
  );
}

function CreateKey({ onClose, onCreated }) {
  const ui = useUI();
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["read"]);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await apiKeys.create(name.trim(), scopes); ui.toast("Key created"); onCreated(r.secret); }
    catch (x) { ui.toast(x.message, "err"); setBusy(false); }
  };
  const flip = (s) => setScopes((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]));
  return (
    <Modal title="Create API key" onClose={onClose}>
      <form onSubmit={submit}>
        <label>Name<span className="req">*</span><input required maxLength={60} value={name} placeholder="e.g. GitHub Actions" onChange={(e) => setName(e.target.value)} /></label>
        <div className="chkgroup"><div className="gl">Scopes</div>
          <div className="chkgrid">
            {Object.entries(SCOPES).map(([k, v]) => (
              <label key={k} className={"pick" + (scopes.includes(k) ? " on" : "")}><input type="checkbox" checked={scopes.includes(k)} onChange={() => flip(k)} />{v}</label>
            ))}
          </div>
        </div>
        <div className="dlg-act">
          <button type="button" className="btn ghost sm" onClick={onClose}>Cancel</button>
          <button className="btn gold sm" disabled={busy || !name.trim() || !scopes.length}>{busy ? "Creating…" : "Create key"}</button>
        </div>
      </form>
    </Modal>
  );
}

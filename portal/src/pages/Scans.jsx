import { useEffect, useState, useCallback } from "react";
import { get, post } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty } from "../ui.jsx";
import { EngStatus, FindingsTable } from "../components/Engagement.jsx";

export default function Scans() {
  const [list, setList] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setList((await get("/engagements")).engagements); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Scans">
      <div className="card panel">
        <h3>Scan engagements<span className="sp"><button className="btn gold sm" onClick={() => setRequesting(true)}>+ Request scan</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Request a scan on a verified domain. An OctaSec operator runs it, human-verifies every finding, and signs the report before it reaches you.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? (
          <Empty>No scans yet. Request one to get started.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Domain</th><th>Intensity</th><th>Status</th><th>Findings</th><th>Requested</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="frow" onClick={() => setViewId(e.id)}>
                  <td className="mono">{e.domainName}</td>
                  <td><span className="chip">{e.intensity}</span></td>
                  <td><EngStatus status={e.status} /></td>
                  <td>{e.status === "delivered" ? e.findings : "—"}</td>
                  <td className="mono dim">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {requesting && <RequestScan onClose={() => setRequesting(false)} onDone={() => { setRequesting(false); load(); }} />}
      {viewId && <ScanView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

function RequestScan({ onClose, onDone }) {
  const [domains, setDomains] = useState(null);
  const [cfg, setCfg] = useState({ domainId: "", intensity: "standard", window: "", excludes: "" });
  const [authorized, setAuthorized] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ds = (await get("/domains?owner=all")).domains.filter((d) => d.verified);
        setDomains(ds);
        if (ds[0]) setCfg((c) => ({ ...c, domainId: ds[0]._id }));
      } catch (e) { setErr(e.message); }
    })();
  }, []);
  const set = (k) => (e) => setCfg((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await post("/engagements", { domainId: cfg.domainId, roe: { intensity: cfg.intensity, window: cfg.window, excludes: cfg.excludes, authorized } });
      onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title="Request a scan" sub="Choose a verified domain and the rules of engagement." onClose={onClose}>
      {!domains ? <Spinner /> : domains.length === 0 ? (
        <Empty>You have no verified domains yet. Verify a domain first.</Empty>
      ) : (
        <>
          <label>Domain
            <select value={cfg.domainId} onChange={set("domainId")}>
              {domains.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </label>
          <div className="fgrid">
            <label>Intensity
              <select value={cfg.intensity} onChange={set("intensity")}>
                <option value="safe">Safe — minimum-impact</option>
                <option value="standard">Standard</option>
                <option value="aggressive">Aggressive — deeper</option>
              </select>
            </label>
            <label>Test window <span style={{ color: "var(--faint)" }}>(optional)</span><input value={cfg.window} onChange={set("window")} placeholder="weekends 02:00–06:00" /></label>
          </div>
          <label>Excluded paths <span style={{ color: "var(--faint)" }}>(optional)</span><input value={cfg.excludes} onChange={set("excludes")} placeholder="/billing, /admin/export" /></label>
          <div className="roe">
            <label className="chkrow">
              <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
              <span>I confirm I'm authorised to test this domain and accept OctaSec's rules of engagement. Testing is non-destructive by default.</span>
            </label>
          </div>
          {err && <div className="form-err">{err}</div>}
          <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy || !authorized || !cfg.domainId}>{busy ? "Requesting…" : "Request scan"}</button></div>
        </>
      )}
    </Modal>
  );
}

function ScanView({ id, onClose }) {
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setE((await get("/engagements/" + encodeURIComponent(id))).engagement); } catch (e2) { setErr(e2.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const cancel = async () => {
    setBusy(true); setErr("");
    try { await post(`/engagements/${encodeURIComponent(id)}/cancel`); await load(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={e ? e.domainName : "Engagement"} sub={e ? undefined : "Loading…"} onClose={onClose}>
      {err && !e && <div className="form-err">{err}</div>}
      {!e && !err ? <Spinner /> : null}
      {e && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <EngStatus status={e.status} />
            <span className="chip">{e.roe?.intensity}</span>
            <span className="chip dim">{e.targets?.length || 0} target(s)</span>
          </div>
          {e.status === "delivered" ? (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
                Signed by <b style={{ color: "var(--gold)" }}>{e.signedByName || "OctaSec"}</b> on {e.signedAt ? new Date(e.signedAt).toLocaleString() : "—"}.
              </p>
              <FindingsTable findings={e.findings} />
            </>
          ) : e.status === "rejected" ? (
            <div className="fdetail">This request was declined.{e.reason ? ` Reason: ${e.reason}` : ""}</div>
          ) : (
            <div className="fdetail">
              Your request is <b>{e.status}</b>. An operator will run it and deliver a signed report. Findings appear here once delivered.
            </div>
          )}
          {err && <div className="form-err">{err}</div>}
          {e.status === "requested" && (
            <div className="mrow"><button className="btn ghost danger" onClick={cancel} disabled={busy}>{busy ? "…" : "Cancel request"}</button></div>
          )}
        </>
      )}
    </Modal>
  );
}

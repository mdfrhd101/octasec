import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { engagements, domains as domainsApi } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty, LoadError, useUI } from "../ui.jsx";
import { EngStatus, ScopingView } from "../components/Engagement.jsx";
import { useAuth } from "../auth.jsx";
import { TEST_TYPES, ENVIRONMENTS, TARGET_TYPES, OBJECTIVES } from "../profileOptions.js";

export default function Scans() {
  const [list, setList] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await engagements.list()).engagements); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Scans">
      <div className="card panel">
        <h3>Scan engagements<span className="sp"><button className="btn gold sm" onClick={() => setRequesting(true)}>+ Request scan</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Request a scan on a verified domain. An OctaSec operator runs it, human-verifies every finding, and signs the report before it reaches you.
        </p>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : list.length === 0 ? (
          <Empty>No scans yet. Request one to get started.</Empty>
        ) : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Domain</th><th>Type</th><th>Intensity</th><th>Status</th><th>Findings</th><th>Requested</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="frow" onClick={() => setViewId(e.id)}>
                  <td className="mono">{e.domainName}</td>
                  <td>{e.kind === "retest" ? <span className="chip gold">Retest</span> : <span className="chip">Scan</span>}</td>
                  <td><span className="chip">{e.intensity}</span></td>
                  <td><EngStatus status={e.status} /></td>
                  <td>{e.status === "delivered" ? e.findings : "—"}</td>
                  <td className="mono dim">{new Date(e.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {requesting && <RequestScan onClose={() => setRequesting(false)} onDone={() => { setRequesting(false); load(); }} />}
      {viewId && <ScanView id={viewId} onClose={() => { setViewId(null); load(); }} />}
    </Shell>
  );
}

function RequestScan({ onClose, onDone }) {
  const { user } = useAuth();
  const ui = useUI();
  const [domains, setDomains] = useState(null);
  const [cfg, setCfg] = useState({ domainId: "", intensity: "standard", window: "", excludes: "" });
  const [sc, setSc] = useState({
    testType: "grey", environment: "production", targetTypes: ["web_app"], userRoles: "", testAccountsViaSecureChannel: false,
    apiDocsUrl: "", wafInPlace: false, ipAllowlistOk: false, preferredStart: "", deadline: "", objective: "",
    maxRps: "", emergencyName: "", emergencyPhone: "", notes: "",
  });
  const [signer, setSigner] = useState({ name: user.name || "", title: "" });
  const [authorized, setAuthorized] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ds = (await domainsApi.list("all")).domains.filter((d) => d.verified);
        setDomains(ds);
        if (ds[0]) setCfg((c) => ({ ...c, domainId: ds[0]._id }));
      } catch (e) { setErr(e.message); }
    })();
  }, []);
  const set = (k) => (e) => setCfg((s) => ({ ...s, [k]: e.target.value }));
  const setS = (k) => (e) => setSc((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const toggleTarget = (v) => setSc((s) => ({ ...s, targetTypes: s.targetTypes.includes(v) ? s.targetTypes.filter((x) => x !== v) : [...s.targetTypes, v] }));
  const num = (v) => (v === "" ? 0 : Number(v));

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      await engagements.request({
        domainId: cfg.domainId,
        roe: { intensity: cfg.intensity, window: cfg.window, excludes: cfg.excludes, authorized, authorizerName: signer.name, authorizerTitle: signer.title },
        scoping: {
          testType: sc.testType, environment: sc.environment, targetTypes: sc.targetTypes, userRoles: num(sc.userRoles),
          testAccountsViaSecureChannel: sc.testAccountsViaSecureChannel, apiDocsUrl: sc.apiDocsUrl, wafInPlace: sc.wafInPlace,
          ipAllowlistOk: sc.ipAllowlistOk, preferredStart: sc.preferredStart, deadline: sc.deadline, objective: sc.objective,
          maxRps: num(sc.maxRps), emergencyContact: { name: sc.emergencyName, phone: sc.emergencyPhone }, notes: sc.notes,
        },
      });
      ui.toast("Scan requested — an operator will pick it up");
      onDone();
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal wide title="Request a scan" sub="The scoping questions every professional pentest asks before it starts. Fields marked * are required." onClose={onClose}>
      {!domains ? <Spinner /> : domains.length === 0 ? (
        <Empty>You have no verified domains yet. Verify a domain first.</Empty>
      ) : (
        <>
          <div className="fsec" style={{ marginTop: 4, paddingTop: 0, borderTop: 0 }}>Target</div>
          <div className="fgrid">
            <label><span>Domain <span className="req">*</span></span>
              <select value={cfg.domainId} onChange={set("domainId")}>
                {domains.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </label>
            <label><span>Environment <span className="req">*</span></span>
              <select value={sc.environment} onChange={setS("environment")}>{opts(ENVIRONMENTS)}</select>
            </label>
          </div>
          <div className="chkgroup" style={{ marginTop: 10 }}>
            <div className="gl">What should we test? <span className="req">*</span></div>
            <div className="chkgrid">
              {Object.entries(TARGET_TYPES).map(([v, l]) => (
                <label key={v} className={"pick" + (sc.targetTypes.includes(v) ? " on" : "")}>
                  <input type="checkbox" checked={sc.targetTypes.includes(v)} onChange={() => toggleTarget(v)} />{l}
                </label>
              ))}
            </div>
          </div>

          <div className="fsec">Approach</div>
          <div className="fgrid">
            <label><span>Test type <span className="req">*</span></span>
              <select value={sc.testType} onChange={setS("testType")}>{opts(TEST_TYPES)}</select>
            </label>
            <label>Intensity
              <select value={cfg.intensity} onChange={set("intensity")}>
                <option value="safe">Safe — minimum impact</option>
                <option value="standard">Standard</option>
                <option value="aggressive">Aggressive — deeper</option>
              </select>
            </label>
            <label>User roles to test<input type="number" min="0" max="50" value={sc.userRoles} onChange={setS("userRoles")} placeholder="e.g. 3 (admin, staff, customer)" /></label>
            <label>Max requests / second<input type="number" min="0" max="10000" value={sc.maxRps} onChange={setS("maxRps")} placeholder="0 = no limit" /></label>
            <label className="full">API docs / OpenAPI URL<input value={sc.apiDocsUrl} onChange={setS("apiDocsUrl")} placeholder="https://api.example.com/openapi.json" maxLength={200} /></label>
            <label className="chkline"><input type="checkbox" checked={sc.testAccountsViaSecureChannel} onChange={setS("testAccountsViaSecureChannel")} />We will share test accounts via a secure channel (never in this form)</label>
            <label className="chkline"><input type="checkbox" checked={sc.wafInPlace} onChange={setS("wafInPlace")} />A WAF / IPS protects this target</label>
            <label className="chkline"><input type="checkbox" checked={sc.ipAllowlistOk} onChange={setS("ipAllowlistOk")} />OK to allow-list the OctaSec testing IPs</label>
          </div>

          <div className="fsec">Schedule &amp; purpose</div>
          <div className="fgrid">
            <label><span>Preferred start <span className="req">*</span></span><input type="date" min={today} value={sc.preferredStart} onChange={setS("preferredStart")} /></label>
            <label>Report needed by<input type="date" min={sc.preferredStart || today} value={sc.deadline} onChange={setS("deadline")} /></label>
            <label>Test window<input value={cfg.window} onChange={set("window")} placeholder="weekends 02:00–06:00 (your time)" maxLength={120} /></label>
            <label><span>Objective <span className="req">*</span></span>
              <select value={sc.objective} onChange={setS("objective")}><option value="">Select…</option>{opts(OBJECTIVES)}</select>
            </label>
            <label className="full">Excluded paths / hosts<input value={cfg.excludes} onChange={set("excludes")} placeholder="/billing, /admin/export" maxLength={500} /></label>
            <label className="full">Anything else we should know<textarea rows={2} value={sc.notes} onChange={setS("notes")} maxLength={1000} /></label>
          </div>

          <div className="fsec">During the test</div>
          <div className="fgrid">
            <label><span>Emergency contact name <span className="req">*</span></span><input value={sc.emergencyName} onChange={setS("emergencyName")} maxLength={80} /></label>
            <label><span>Emergency phone (24×7) <span className="req">*</span></span><input value={sc.emergencyPhone} onChange={setS("emergencyPhone")} placeholder="+8801…" maxLength={20} /></label>
          </div>

          <div className="fsec">Authorisation (rules of engagement)</div>
          <div className="fgrid">
            <label><span>Your name <span className="req">*</span></span><input value={signer.name} onChange={(e) => setSigner((s) => ({ ...s, name: e.target.value }))} maxLength={80} /></label>
            <label><span>Your title <span className="req">*</span></span><input value={signer.title} onChange={(e) => setSigner((s) => ({ ...s, title: e.target.value }))} placeholder="CTO, IT Manager…" maxLength={80} /></label>
          </div>
          <div className="roe" style={{ marginTop: 10 }}>
            <label className="chkrow">
              <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
              <span>I am authorised by the owner of this domain to commission this test, and I accept the OctaSec rules of engagement. Testing is non-destructive by default. My name and title are recorded as the signature.</span>
            </label>
          </div>
          {err && <div className="form-err">{err}</div>}
          <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy || !authorized || !cfg.domainId}>{busy ? "Requesting…" : "Request scan"}</button></div>
        </>
      )}
    </Modal>
  );
}

const opts = (m) => Object.entries(m).map(([v, l]) => <option key={v} value={v}>{l}</option>);

function ScanView({ id, onClose }) {
  const ui = useUI();
  const nav = useNavigate();
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setE((await engagements.get(id)).engagement); } catch (e2) { setErr(e2.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const cancel = async () => {
    if (!(await ui.confirm({ title: "Cancel this request?", body: "It is withdrawn from the operator queue. You can request a new scan at any time.", confirmLabel: "Cancel request", cancelLabel: "Keep it", danger: true }))) return;
    setBusy(true); setErr("");
    try { await engagements.cancel(id); ui.toast("Request cancelled"); await load(); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={e ? e.domainName : "Engagement"} sub={e ? undefined : "Loading…"} onClose={onClose}>
      {err && !e && <div className="form-err">{err}</div>}
      {!e && !err ? <Spinner /> : null}
      {e && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <EngStatus status={e.status} />
            {e.kind === "retest" && <span className="chip gold">Retest</span>}
            <span className="chip">{e.roe?.intensity}</span>
            <span className="chip dim">{e.targets?.length || 0} target(s)</span>
          </div>
          <ScopingView e={e} />
          {e.status === "delivered" ? (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
                Signed by <b style={{ color: "var(--gold)" }}>{e.signedByName || "OctaSec"}</b> on {e.signedAt ? new Date(e.signedAt).toLocaleString() : "—"} —
                {" "}{e.findings.length} verified finding{e.findings.length === 1 ? "" : "s"}.
              </p>
              <div className="mrow" style={{ justifyContent: "flex-start", marginTop: 8 }}>
                <button className="btn gold sm" onClick={() => nav("/reports/" + e.id)}>Open full report</button>
              </div>
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

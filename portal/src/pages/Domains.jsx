import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, patch, del } from "../api.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, CopyBox, Spinner, Empty } from "../ui.jsx";

export default function Domains() {
  const { user } = useAuth();
  const nav = useNavigate();
  const corp = user.role === "corp";
  const [domains, setDomains] = useState(null);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // {type, domain}
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const q = corp && filter !== "all" ? `?owner=${encodeURIComponent(filter)}` : "?owner=all";
      const d = await get("/domains" + q);
      setDomains(d.domains);
      if (corp) setClients((await get("/clients")).clients);
    } catch (e) { setErr(e.message); }
  }, [corp, filter]);

  useEffect(() => { load(); }, [load]);

  const ownerLabel = (d) => d.ownerType === "self" ? "My organization" : (clients.find((c) => c._id === d.clientId)?.name || "—");

  return (
    <Shell title={corp ? "Domains" : "Your domains"}>
      <div className="card panel">
        <h3>
          {corp ? "Domains" : "Your domains"}
          <span className="sp">
            {corp && (
              <select className="minisel" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All owners</option>
                <option value="self">My organization</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            )}
            <button className="btn gold sm" onClick={() => setModal({ type: "add" })}>+ Add domain</button>
          </span>
        </h3>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!domains ? <div style={{ padding: 20 }}><Spinner /></div> : domains.length === 0 ? (
          <Empty>No domains yet. Add one to begin.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Domain</th>{corp && <th>Client / owner</th>}<th>Status</th><th>Assets</th><th></th></tr></thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d._id}>
                  <td className="mono">{d.name}</td>
                  {corp && <td>{d.ownerType === "self" ? <span className="chip gold">My organization</span> : <span className="chip">{ownerLabel(d)}</span>}</td>}
                  <td>{d.verified ? <span className="chip green">Verified</span> : <span className="chip red">Unverified</span>}</td>
                  <td>{d.assetCount ?? 0}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {corp && <button className="btn sm ghost" onClick={() => setModal({ type: "assign", domain: d })}>Assign</button>}{" "}
                    {d.verified
                      ? <button className="btn sm ghost" onClick={() => setModal({ type: "discover", domain: d })}>Look for assets</button>
                      : <button className="btn sm gold" onClick={() => setModal({ type: "verify", domain: d })}>Verify</button>}{" "}
                    <button className="btn sm danger" onClick={async () => { if (!confirm(`Remove ${d.name}?`)) return; try { await del("/domains/" + encodeURIComponent(d._id)); load(); } catch (e) { setErr(e.message); } }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === "add" && <AddModal corp={corp} clients={clients} filter={filter} onClose={() => setModal(null)} onAdded={(d) => setModal({ type: "verify", domain: d })} reload={load} />}
      {modal?.type === "verify" && <VerifyModal domain={modal.domain} onClose={() => { setModal(null); load(); }} onVerified={load} />}
      {modal?.type === "assign" && <AssignModal domain={modal.domain} clients={clients} onClose={() => setModal(null)} reload={load} />}
      {modal?.type === "discover" && <DiscoverModal domain={modal.domain} onClose={() => setModal(null)} onDone={() => { setModal(null); nav("/assets"); }} />}
    </Shell>
  );
}

function AddModal({ corp, clients, filter, onClose, onAdded, reload }) {
  const [f, setF] = useState({ name: "", label: "", env: "production", criticality: "medium", contact: "", tags: "" });
  const [owner, setOwner] = useState(corp && filter !== "all" ? filter : "self");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const body = { ...f };
      if (corp && owner !== "self") { body.ownerType = "client"; body.clientId = owner; }
      const { domain } = await post("/domains", body);
      reload();
      onAdded(domain);
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal title="Add a domain" sub="Give us context so we can prioritise — then verify ownership." onClose={onClose}>
      <div className="fgrid">
        <label className="full">Domain<input value={f.name} onChange={set("name")} placeholder="example.com" autoFocus /></label>
        <label className="full">Label <span style={{ color: "var(--faint)" }}>(optional)</span><input value={f.label} onChange={set("label")} placeholder="e.g. Customer portal" /></label>
        <label>Environment
          <select value={f.env} onChange={set("env")}>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Business criticality
          <select value={f.criticality} onChange={set("criticality")}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        {corp && (
          <label className="full">Belongs to
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="self">My organization</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label>Point of contact <span style={{ color: "var(--faint)" }}>(optional)</span><input value={f.contact} onChange={set("contact")} placeholder="ops@example.com" /></label>
        <label>Tags <span style={{ color: "var(--faint)" }}>(comma-sep)</span><input value={f.tags} onChange={set("tags")} placeholder="web, pci, external" /></label>
      </div>
      {err && <div className="form-err">{err}</div>}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add & continue"}</button></div>
    </Modal>
  );
}

function VerifyModal({ domain, onClose, onVerified }) {
  const [status, setStatus] = useState(null); // {ok,msg}
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true); setStatus({ msg: `Requesting https://${domain.name}/${domain.verifyFile} …` });
    try {
      await post(`/domains/${encodeURIComponent(domain._id)}/verify`);
      setStatus({ ok: true, msg: "Verified — file found and token matches." });
      setTimeout(() => { onVerified(); onClose(); }, 1000);
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally { setBusy(false); }
  };
  return (
    <Modal title={`Verify ${domain.name}`} sub="Prove you control this domain. Only someone with access to the site's files can complete this." onClose={onClose}>
      <div className="steps-mini"><div><b>1</b> Create this file:</div></div>
      <CopyBox value={domain.verifyFile} />
      <div className="steps-mini"><div><b>2</b> Put this exact text inside it:</div></div>
      <CopyBox value={`octasec-site-verification=${domain.verifyToken}`} />
      <div className="steps-mini"><div><b>3</b> Upload it to your site root so it loads at:</div></div>
      <div className="codebox">{`https://${domain.name}/${domain.verifyFile}`}</div>
      {status && (
        <div className="vstatus">
          {busy ? <span className="spin" /> : status.ok ? <span className="ok-ic">✓</span> : <span className="err-ic">✕</span>}
          {status.msg}
        </div>
      )}
      <div className="mrow"><button className="btn ghost" onClick={onClose}>I'll do this later</button><button className="btn gold" onClick={check} disabled={busy}>Check verification</button></div>
    </Modal>
  );
}

function AssignModal({ domain, clients, onClose, reload }) {
  const [owner, setOwner] = useState(domain.ownerType === "client" ? domain.clientId : "self");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const body = owner === "self" ? { ownerType: "self" } : { ownerType: "client", clientId: owner };
    try { await patch("/domains/" + encodeURIComponent(domain._id), body); reload(); onClose(); } catch { setBusy(false); }
  };
  return (
    <Modal title={`Assign ${domain.name}`} sub="Choose which account this domain — and its assets — belongs to." onClose={onClose}>
      <label>Belongs to
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="self">My organization</option>
          {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </label>
      <div className="mrow"><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" onClick={save} disabled={busy}>Save assignment</button></div>
    </Modal>
  );
}

function DiscoverModal({ domain, onClose, onDone }) {
  const [log, setLog] = useState(["> querying public DNS records …", "> reading certificate transparency logs …"]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await post("/assets/discover", { domainId: domain._id });
        if (!alive) return;
        (r.assets || []).forEach((a) => setLog((L) => [...L, `> found  ${a.host}`]));
        setLog((L) => [...L, `> done — ${r.discovered} host(s) identified`]);
        setDone(true);
      } catch (e) {
        if (alive) { setLog((L) => [...L, `> error: ${e.message}`]); setDone(true); }
      }
    })();
    return () => { alive = false; };
  }, [domain._id]);
  return (
    <Modal title="Looking for assets" sub={`Scanning public records for hosts related to ${domain.name}.`} onClose={done ? onClose : undefined}>
      <div className="scanlog">
        {log.map((l, i) => <div key={i} className={l.startsWith("> found") ? "y" : l.startsWith("> done") ? "g" : "d"}>{l}</div>)}
        {!done && <span className="blink" />}
      </div>
      <div className="mrow"><button className="btn gold" onClick={onDone} disabled={!done}>{done ? "View assets" : "Working…"}</button></div>
    </Modal>
  );
}

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { assets as assetsApi, domains as domainsApi } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty, Modal, LoadError, TableWrap, useUI } from "../ui.jsx";

export default function Assets() {
  const nav = useNavigate();
  const ui = useUI();
  const [params, setParams] = useSearchParams();
  const domainId = params.get("domain") || "";
  const [assets, setAssets] = useState(null);
  const [domains, setDomains] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    try {
      const [a, d] = await Promise.all([assetsApi.list(domainId || undefined), domainsApi.list("all")]);
      setAssets(a.assets); setDomains(d.domains);
    } catch (e) { setErr(e.message); }
  }, [domainId]);
  useEffect(() => { load(); }, [load]);

  const domainName = useMemo(() => Object.fromEntries(domains.map((d) => [d._id, d.name])), [domains]);
  const rows = useMemo(() => (assets || []).filter((a) => !q || a.host.includes(q.trim().toLowerCase())), [assets, q]);
  const setDomain = (v) => setParams(v ? { domain: v } : {});

  const remove = async (a) => {
    const yes = await ui.confirm({ title: `Remove ${a.host}?`, body: "It will no longer be included in new scans of this domain. You can add it again later.", confirmLabel: "Remove asset", danger: true });
    if (yes && (await ui.run(() => assetsApi.remove(a._id), `${a.host} removed`))) load();
  };

  return (
    <Shell title="Assets">
      <div className="card panel">
        <h3>Asset inventory
          <span className="sp">
            <button className="btn ghost sm" onClick={() => setAdding(true)} disabled={!domains.some((d) => d.verified)} title={domains.some((d) => d.verified) ? "" : "Verify a domain first"}>+ Add host</button>
            <button className="btn gold sm" onClick={() => nav("/scans")}>Request a scan</button>
          </span>
        </h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>
          Hosts discovered or added under your verified domains — they become the targets of your next scan. An operator runs and signs every scan.
        </p>
        <div className="filters">
          <select value={domainId} onChange={(e) => setDomain(e.target.value)} aria-label="Domain">
            <option value="">All domains</option>
            {domains.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <input className="grow" placeholder="Search host…" value={q} onChange={(e) => setQ(e.target.value)} />
          {assets && <span className="dimtxt" style={{ fontSize: 12 }}>{rows.length} host{rows.length === 1 ? "" : "s"}</span>}
        </div>
        {err ? <LoadError msg={err} onRetry={load} /> : !assets ? <div style={{ padding: 20 }}><Spinner /></div> : rows.length === 0 ? (
          <Empty>{assets.length ? "No host matches your search." : "No assets yet. On a verified domain, use “Look for assets” or add a host."}</Empty>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Host</th><th>Domain</th><th>Technology</th><th>Added</th><th></th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a._id}>
                    <td className="mono">{a.host}</td>
                    <td className="mono dim">{domainName[a.domainId] || "—"}</td>
                    <td>{(a.tech || []).length ? a.tech.map((t) => <span key={t} className="chip">{t}</span>) : <span className="dimtxt">—</span>}</td>
                    <td className="mono dim">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ textAlign: "right" }}><button className="btn sm danger" aria-label={`Remove ${a.host}`} title="Remove" onClick={() => remove(a)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
      {adding && <AddHost domains={domains.filter((d) => d.verified)} preset={domainId} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </Shell>
  );
}

function AddHost({ domains, preset, onClose, onAdded }) {
  const ui = useUI();
  const [domainId, setDomainId] = useState(domains.some((d) => d._id === preset) ? preset : domains[0]?._id || "");
  const [host, setHost] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const base = domains.find((d) => d._id === domainId)?.name || "";
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try { const { asset } = await assetsApi.create(domainId, host.trim().toLowerCase()); ui.toast(`${asset.host} added`); onAdded(); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title="Add a host" sub="Add a host you know about that discovery did not find. It must be the domain itself or one of its subdomains." onClose={onClose}>
      <form onSubmit={submit}>
        <label>Verified domain
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)}>
            {domains.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </label>
        <label>Host<span className="req">*</span><input required autoFocus value={host} onChange={(e) => setHost(e.target.value)} placeholder={base ? `app.${base}` : "app.example.com"} /></label>
        {err && <div className="form-err">{err}</div>}
        <div className="mrow"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={busy || !host.trim() || !domainId}>{busy ? "Adding…" : "Add host"}</button></div>
      </form>
    </Modal>
  );
}

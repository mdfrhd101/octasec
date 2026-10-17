import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { domains as domainsApi, clients as clientsApi, assets as assetsApi } from "../services/index.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Modal, CopyBox, Spinner, Empty, LoadError, TableWrap, useUI } from "../ui.jsx";

const ENV_LABEL = { production: "Production", staging: "Staging", development: "Development", other: "Other" };
const CRIT_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const CRIT_CLS = { critical: "red", high: "warn", medium: "gold", low: "dim" };

export default function Domains() {
  const { user } = useAuth();
  const ui = useUI();
  const nav = useNavigate();
  // company tier (admin + employees) manages domains for its own org and for its clients
  const corp = user.role === "company_admin" || user.role === "employee";
  const [domains, setDomains] = useState(null);
  const [clients, setClients] = useState([]);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // {type, domain}
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try {
      const [d, c] = await Promise.all([domainsApi.list(corp ? filter : "all"), corp ? clientsApi.list() : null]);
      setDomains(d.domains);
      if (c) setClients(c.clients);
    } catch (e) { setErr(e.message); }
  }, [corp, filter]);
  useEffect(() => { load(); }, [load]);

  const ownerLabel = (d) => (d.ownerType === "self" ? "My organisation" : clients.find((c) => c._id === d.clientId)?.name || "—");

  const remove = async (d) => {
    const yes = await ui.confirm({
      title: `Remove ${d.name}?`,
      body: `Its ${d.assetCount || 0} asset(s) are deleted and any open scan request on it is cancelled. Delivered reports stay available.`,
      confirmLabel: "Remove domain", danger: true,
    });
    if (yes && (await ui.run(() => domainsApi.remove(d._id), `${d.name} removed`))) load();
  };

  return (
    <Shell title={corp ? "Domains" : "Your domains"}>
      <div className="card panel">
        <h3>
          {corp ? "Domains" : "Your domains"}
          <span className="sp">
            {corp && (
              <select className="minisel" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Owner">
                <option value="all">All owners</option>
                <option value="self">My organisation</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            )}
            <button className="btn gold sm" onClick={() => setModal({ type: "add" })}>+ Add domain</button>
          </span>
        </h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Add a domain, prove you control it, then discover its hosts and request scans. Ownership is re-checked every 90 days.</p>
        {err ? <LoadError msg={err} onRetry={load} /> : !domains ? <div style={{ padding: 20 }}><Spinner /></div> : domains.length === 0 ? (
          <Empty>{filter !== "all" ? "No domains for this owner." : "No domains yet. Add one to begin."}</Empty>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Domain</th>{corp && <th>Client / owner</th>}<th>Environment</th><th>Criticality</th><th>Status</th><th>Assets</th><th></th></tr></thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d._id}>
                    <td><div className="mono">{d.name}</div>{d.label && <div className="dimtxt" style={{ fontSize: 11.5 }}>{d.label}</div>}</td>
                    {corp && <td>{d.ownerType === "self" ? <span className="chip gold">My organisation</span> : <span className="chip">{ownerLabel(d)}</span>}</td>}
                    <td className="dim">{ENV_LABEL[d.env] || "—"}</td>
                    <td><span className={"chip " + (CRIT_CLS[d.criticality] || "dim")}>{CRIT_LABEL[d.criticality] || "—"}</span></td>
                    <td>{d.verified ? <span className="chip green">Verified</span> : <span className="chip red">Unverified</span>}</td>
                    <td>{d.assetCount ?? 0}</td>
                    <td>
                      <div className="acts">
                        {d.verified
                          ? <button className="btn sm ghost" onClick={() => setModal({ type: "discover", domain: d })}>Look for assets</button>
                          : <button className="btn sm gold" onClick={() => setModal({ type: "verify", domain: d })}>Verify</button>}
                        <button className="btn sm ghost" onClick={() => setModal({ type: "edit", domain: d })}>Edit</button>
                        {corp && <button className="btn sm ghost" onClick={() => setModal({ type: "assign", domain: d })}>Assign</button>}
                        <button className="btn sm danger" aria-label={`Remove ${d.name}`} title="Remove" onClick={() => remove(d)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>

      {modal?.type === "add" && <DomainForm corp={corp} clients={clients} filter={filter} onClose={() => setModal(null)} onSaved={(d) => { load(); setModal({ type: "verify", domain: d }); }} />}
      {modal?.type === "edit" && <DomainForm domain={modal.domain} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === "verify" && <VerifyModal domain={modal.domain} onClose={() => { setModal(null); load(); }} />}
      {modal?.type === "assign" && <AssignModal domain={modal.domain} clients={clients} isAdmin={user.role === "company_admin"} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === "discover" && <DiscoverModal domain={modal.domain} onClose={() => { setModal(null); load(); }} onDone={() => nav("/assets?domain=" + modal.domain._id)} />}
    </Shell>
  );
}

// add (domain undefined) or edit details (domain given)
function DomainForm({ domain, corp, clients = [], filter, onClose, onSaved }) {
  const ui = useUI();
  const editing = !!domain;
  const [f, setF] = useState({
    name: domain?.name || "", label: domain?.label || "", env: domain?.env || "production", criticality: domain?.criticality || "medium",
    contact: domain?.contact || "", tags: (domain?.tags || []).join(", "), notes: domain?.notes || "",
  });
  const [owner, setOwner] = useState(corp && filter && filter !== "all" ? filter : "self");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (editing) {
        const { name, ...details } = f;
        await domainsApi.update(domain._id, details);
        ui.toast("Domain details saved");
        onSaved();
      } else {
        const body = { ...f };
        if (corp && owner !== "self") { body.ownerType = "client"; body.clientId = owner; }
        const { domain: d } = await domainsApi.create(body);
        ui.toast(`${d.name} added — now verify it`);
        onSaved(d);
      }
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  const opt = <span style={{ color: "var(--faint)" }}>(optional)</span>;
  return (
    <Modal title={editing ? `Edit ${domain.name}` : "Add a domain"} sub={editing ? "Update the context we use to prioritise testing." : "Give us context so we can prioritise — then verify ownership."} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="fgrid">
          {!editing && <label className="full">Domain<span className="req">*</span><input required value={f.name} onChange={set("name")} placeholder="example.com" autoFocus /></label>}
          <label className="full">Label {opt}<input value={f.label} maxLength={80} onChange={set("label")} placeholder="e.g. Customer portal" autoFocus={editing} /></label>
          <label>Environment
            <select value={f.env} onChange={set("env")}>{Object.entries(ENV_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label>Business criticality
            <select value={f.criticality} onChange={set("criticality")}>{Object.entries(CRIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          {!editing && corp && (
            <label className="full">Belongs to
              <select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="self">My organisation</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label>Point of contact {opt}<input value={f.contact} maxLength={120} onChange={set("contact")} placeholder="ops@example.com" /></label>
          <label>Tags {opt}<input value={f.tags} onChange={set("tags")} placeholder="web, pci, external" /></label>
          <label className="full">Notes {opt}<textarea rows={2} maxLength={500} value={f.notes} onChange={set("notes")} placeholder="Anything our operators should know" /></label>
        </div>
        {err && <div className="form-err">{err}</div>}
        <div className="mrow"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add & continue"}</button></div>
      </form>
    </Modal>
  );
}

function VerifyModal({ domain, onClose }) {
  const ui = useUI();
  const [status, setStatus] = useState(null); // {ok,msg}
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true); setStatus({ msg: `Requesting https://${domain.name}/${domain.verifyFile} …` });
    try {
      await domainsApi.verify(domain._id);
      setStatus({ ok: true, msg: "Verified — file found and token matches." });
      ui.toast(`${domain.name} verified`);
      setTimeout(onClose, 900);
    } catch (e) {
      setStatus({ ok: false, msg: e.data?.reason || e.message });
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

function AssignModal({ domain, clients, isAdmin, onClose, onSaved }) {
  const ui = useUI();
  const fromClient = domain.ownerType === "client";
  const [owner, setOwner] = useState(fromClient ? domain.clientId : "self");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const changed = owner !== (fromClient ? domain.clientId : "self");
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await domainsApi.assignOwner(domain._id, owner === "self" ? "self" : "client", owner === "self" ? undefined : owner);
      ui.toast(fromClient ? "Domain moved — verify ownership again before the next scan" : "Assignment saved");
      onSaved();
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal title={`Assign ${domain.name}`} sub="Choose which account this domain — and its assets — belongs to. The owner's authorisation to test applies to every scan." onClose={onClose}>
      <form onSubmit={save}>
        <label>Belongs to
          <select value={owner} onChange={(e) => setOwner(e.target.value)} disabled={fromClient && !isAdmin}>
            {!fromClient && <option value="self">My organisation</option>}
            {clients.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        {fromClient && (
          <p className="dimtxt" style={{ fontSize: 12.5, marginBottom: 12 }}>
            {isAdmin
              ? "A client's domain can move only to another client, and must be verified again afterwards."
              : "Only a company admin can move a client's domain to another client."}
          </p>
        )}
        {err && <div className="form-err">{err}</div>}
        <div className="mrow"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn gold" disabled={busy || !changed}>Save assignment</button></div>
      </form>
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
        const r = await assetsApi.discover(domain._id);
        if (!alive) return;
        (r.assets || []).forEach((a) => setLog((L) => [...L, `> found  ${a.host}`]));
        setLog((L) => [...L, `> done — ${r.discovered} new host(s) identified`]);
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

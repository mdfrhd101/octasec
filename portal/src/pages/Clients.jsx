import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Modal, Spinner, Empty } from "../ui.jsx";

export default function Clients() {
  const nav = useNavigate();
  const [clients, setClients] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setClients((await get("/clients")).clients); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try { await post("/clients", { name }); setAdding(false); setName(""); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <Shell title="Clients">
      <div className="card panel">
        <h3>Client accounts<span className="sp"><button className="btn gold sm" onClick={() => setAdding(true)}>+ Add client</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Create sub-accounts for the companies you manage. Assign domains to each — or keep them under your own organization.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!clients ? <div style={{ padding: 20 }}><Spinner /></div> : (
          <table className="tbl">
            <thead><tr><th>Account</th><th>Domains</th><th>Assets</th><th></th></tr></thead>
            <tbody>
              <tr>
                <td>My organization <span className="chip gold">you</span></td>
                <td className="mono">—</td><td className="mono">—</td>
                <td style={{ textAlign: "right" }}><button className="btn sm ghost" onClick={() => nav("/domains")}>View domains</button></td>
              </tr>
              {clients.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td className="mono">{c.domainCount}</td>
                  <td className="mono">{c.assetCount}</td>
                  <td style={{ textAlign: "right" }}><button className="btn sm ghost" onClick={() => nav("/domains")}>View domains</button></td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={4}><Empty>No client accounts yet.</Empty></td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <Modal title="Add client account" sub="Create a managed sub-account under your corporate portal." onClose={() => setAdding(false)}>
          <label>Client / company name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" autoFocus /></label>
          <div className="mrow"><button className="btn ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn gold" onClick={create}>Create</button></div>
        </Modal>
      )}
    </Shell>
  );
}

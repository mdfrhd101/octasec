import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty } from "../ui.jsx";

export default function Assets() {
  const nav = useNavigate();
  const [assets, setAssets] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try { setAssets((await get("/assets")).assets); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Shell title="Assets">
      <div className="card panel">
        <h3>Asset inventory<span className="sp"><button className="btn gold sm" onClick={() => nav("/scans")}>Request a scan</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Hosts discovered or added under your domains. To test them, request a scan — an operator runs and signs it.
        </p>
        {err && <div className="form-err" style={{ marginTop: 10 }}>{err}</div>}
        {!assets ? <div style={{ padding: 20 }}><Spinner /></div> : assets.length === 0 ? (
          <Empty>No assets yet. On a verified domain, use “Look for assets”.</Empty>
        ) : (
          <table className="tbl">
            <thead><tr><th>Asset</th><th>Technology</th><th>Added</th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a._id}>
                  <td className="mono">{a.host}</td>
                  <td>{(a.tech || []).map((t) => <span key={t} className="chip">{t}</span>)}</td>
                  <td className="mono dim">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}

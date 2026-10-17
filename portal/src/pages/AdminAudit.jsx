import { useEffect, useState, useCallback } from "react";
import { get } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty } from "../ui.jsx";

const CATEGORIES = ["all", "auth", "company", "client", "user", "domain", "engagement", "ticket", "lead"];
const PAGE = 50;

// colour an action by what it signifies
function actionClass(a) {
  if (/login_fail|\.delete|\.reject|\.suspend/.test(a)) return "red";
  if (/\.sign/.test(a)) return "green";
  if (/\.create|\.assign|\.run|\.register/.test(a)) return "gold";
  return "dim";
}

function fmt(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AdminAudit() {
  const [data, setData] = useState(null);
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState(""); // committed search term
  const [skip, setSkip] = useState(0);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr(""); setData(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE), skip: String(skip) });
      if (category !== "all") params.set("category", category);
      if (term) params.set("q", term);
      setData(await get("/admin/audit?" + params.toString()));
    } catch (e) { setErr(e.message); }
  }, [category, term, skip]);
  useEffect(() => { load(); }, [load]);

  const total = data?.total || 0;
  const entries = data?.entries || [];
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + PAGE, total);

  const search = (e) => { e.preventDefault(); setSkip(0); setTerm(q.trim()); };

  return (
    <Shell title="Audit log">
      <div className="card panel">
        <h3>Audit log<span className="sp">
          <select className="minisel" value={category} onChange={(e) => { setSkip(0); setCategory(e.target.value); }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c === "all" ? "All actions" : c}</option>)}
          </select>
        </span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Append-only record of sensitive actions across the platform — who did what, when. Entries can never be edited or removed.
        </p>

        <form onSubmit={search} style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          <input placeholder="Search actor, target or action…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
          <button className="btn sm gold" type="submit">Search</button>
          {(term || category !== "all") && (
            <button className="btn sm ghost" type="button" onClick={() => { setQ(""); setTerm(""); setCategory("all"); setSkip(0); }}>Clear</button>
          )}
        </form>

        {err && <div className="form-err" style={{ marginBottom: 10 }}>{err}</div>}
        {!data ? <div style={{ padding: 20 }}><Spinner /></div> : entries.length === 0 ? <Empty>No audit entries match.</Empty> : (
          <>
            <table className="tbl">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
              <tbody>
                {entries.map((a) => (
                  <tr key={a.id}>
                    <td className="mono dim" style={{ whiteSpace: "nowrap" }}>{fmt(a.createdAt)}</td>
                    <td>
                      <span className="mono">{a.actorEmail}</span>
                      {a.actorRole && <span className="chip dim" style={{ marginLeft: 6 }}>{a.actorRole}</span>}
                    </td>
                    <td><span className={"chip " + actionClass(a.action)}>{a.action}</span></td>
                    <td>
                      {a.targetLabel ? <span className="mono">{a.targetLabel}</span> : <span className="dim">—</span>}
                      {a.meta?.reason && <div className="dim" style={{ fontSize: 12 }}>reason: {a.meta.reason}</div>}
                    </td>
                    <td className="mono dim">{a.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="coverage-line" style={{ marginTop: 12 }}>
              <span className="dim" style={{ fontSize: 13 }}>Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b></span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn sm ghost" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE))}>← Newer</button>
                <button className="btn sm ghost" disabled={to >= total} onClick={() => setSkip(skip + PAGE)}>Older →</button>
              </span>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

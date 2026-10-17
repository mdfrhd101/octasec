import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { admin } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import ReportDocument from "../components/Report.jsx";
import { Spinner, Empty, LoadError, TableWrap } from "../ui.jsx";

const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");
// self-serve clients have no company — name them by the requester's email
const customer = (e) => (e.tenant === "Self-serve client" && e.requestedByEmail ? `${e.requestedByEmail} (self-serve)` : e.tenant);
const PERIODS = { all: "Any time", 30: "Last 30 days", 90: "Last 90 days", 365: "Last 12 months" };

// /admin/reports — every delivered report across all tenants
export default function AdminReports() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [tenant, setTenant] = useState("");
  const [kind, setKind] = useState("");
  const [period, setPeriod] = useState("all");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await admin.engagements.list("delivered", 200)).engagements.map((e) => ({ ...e, tenant: customer(e) }))); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const tenants = useMemo(() => [...new Set((list || []).map((e) => e.tenant))].sort(), [list]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const since = period === "all" ? 0 : Date.now() - Number(period) * 86400000;
    return (list || []).filter((e) =>
      (!s || e.domainName.includes(s) || (e.tenant || "").toLowerCase().includes(s) || (e.operator || "").toLowerCase().includes(s)) &&
      (!tenant || e.tenant === tenant) &&
      (!kind || (e.kind || "scan") === kind) &&
      (!since || new Date(e.signedAt).getTime() >= since));
  }, [list, q, tenant, kind, period]);
  const totalFindings = rows.reduce((n, e) => n + (e.findings || 0), 0);

  return (
    <Shell title="Reports">
      <div className="card panel">
        <h3>Delivered reports<span className="sp dimtxt" style={{ fontSize: 12 }}>{list ? `${rows.length} reports · ${totalFindings} findings` : ""}</span></h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>Every signed report across all customers. Open one to read it exactly as the customer sees it, with remediation status, or download it as PDF.</p>
        <div className="filters">
          <input className="grow" placeholder="Search domain, customer or operator…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={tenant} onChange={(e) => setTenant(e.target.value)} aria-label="Customer">
            <option value="">All customers</option>
            {tenants.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
            <option value="">Scans &amp; retests</option><option value="scan">Scans</option><option value="retest">Retests</option>
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
            {Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : rows.length === 0 ? (
          <Empty>{list.length ? "No report matches these filters." : "No reports delivered yet."}</Empty>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Customer</th><th>Domain</th><th>Type</th><th>Findings</th><th>Operator</th><th>Delivered</th><th></th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="frow" onClick={() => nav("/admin/reports/" + e.id)}>
                    <td>{e.tenant}</td>
                    <td className="mono">{e.domainName}</td>
                    <td>{e.kind === "retest" ? <span className="chip gold">Retest</span> : <span className="chip">Scan</span>}</td>
                    <td>{e.findings}</td>
                    <td className="dim">{e.operator || "—"}</td>
                    <td className="mono dim">{day(e.signedAt)}</td>
                    <td style={{ textAlign: "right" }}><button className="btn ghost sm">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </Shell>
  );
}

// /admin/reports/:id — read-only report
export function AdminReportPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { const x = (await admin.engagements.get(id)).engagement; setE({ ...x, tenant: customer(x) }); setErr(""); } catch (x) { setErr(x.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const delivered = e && e.status === "delivered";
  return (
    <Shell
      title={e ? `Report — ${e.domainName}` : "Report"}
      actions={<>
        <button className="btn ghost sm no-print" onClick={() => nav("/admin/reports")}>← All reports</button>
        {delivered && <button className="btn gold sm no-print" onClick={() => window.print()}>Download PDF</button>}
      </>}
    >
      {err ? <LoadError msg={err} onRetry={load} /> : !e ? <div style={{ padding: 30 }}><Spinner /></div>
        : !delivered ? <Empty>This engagement is not delivered yet — see Engagements.</Empty>
        : <ReportDocument e={e} />}
    </Shell>
  );
}

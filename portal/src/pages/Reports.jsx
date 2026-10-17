import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { engagements } from "../services/index.js";
import Shell from "../components/Shell.jsx";
import ReportDocument from "../components/Report.jsx";
import { Spinner, Empty, LoadError, TableWrap } from "../ui.jsx";

const day = (d) => (d ? new Date(d).toLocaleDateString() : "—");

// /reports — the tenant's signed reports
export default function Reports() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setList((await engagements.list("delivered")).engagements); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => (list || []).filter((e) => !q || e.domainName.includes(q.trim().toLowerCase())), [list, q]);

  return (
    <Shell title="Reports">
      <div className="card panel">
        <h3>Signed reports</h3>
        <p className="dimtxt" style={{ marginTop: 4 }}>
          Delivered reports — every finding human-verified and signed by an OctaSec operator. Open a report to see the evidence and fix,
          track remediation, request a retest, or download it as PDF.
        </p>
        {list && list.length > 3 && (
          <div className="filters"><input className="grow" placeholder="Search domain…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        )}
        {err ? <LoadError msg={err} onRetry={load} /> : !list ? <div style={{ padding: 20 }}><Spinner /></div> : rows.length === 0 ? (
          <Empty>{list.length ? "No report matches your search." : "No delivered reports yet. Request a scan under “Scans”."}</Empty>
        ) : (
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Domain</th><th>Type</th><th>Findings</th><th>Still open</th><th>Delivered</th><th></th></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id} className="frow" onClick={() => nav("/reports/" + e.id)}>
                    <td className="mono">{e.domainName}</td>
                    <td>{e.kind === "retest" ? <span className="chip gold">Retest</span> : <span className="chip">Scan</span>}</td>
                    <td>{e.findings}</td>
                    <td>{e.openFindings ? <span className="chip warn">{e.openFindings} open</span> : <span className="chip green">None</span>}</td>
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

// /reports/:id — one report (tenant can update finding state + request a retest)
export function ReportPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { setE((await engagements.get(id)).engagement); setErr(""); } catch (x) { setErr(x.message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const delivered = e && e.status === "delivered";
  return (
    <Shell
      title={e ? `Report — ${e.domainName}` : "Report"}
      actions={<>
        <button className="btn ghost sm no-print" onClick={() => nav("/reports")}>← All reports</button>
        {delivered && <button className="btn gold sm no-print" onClick={() => window.print()}>Download PDF</button>}
      </>}
    >
      {err ? <LoadError msg={err} onRetry={load} /> : !e ? <div style={{ padding: 30 }}><Spinner /></div>
        : !delivered ? <Empty>This engagement has not been delivered yet — track it under “Scans”.</Empty>
        : <ReportDocument e={e} editable onChange={load} />}
    </Shell>
  );
}

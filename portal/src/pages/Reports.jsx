import { useEffect, useState } from "react";
import { get } from "../api.js";
import Shell from "../components/Shell.jsx";
import { Spinner, Empty, Modal } from "../ui.jsx";
import { FindingsTable } from "../components/Engagement.jsx";

export default function Reports() {
  const [list, setList] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { setList((await get("/engagements?status=delivered")).engagements); } catch (e) { setErr(e.message); }
    })();
  }, []);

  if (err) return <Shell title="Reports"><Empty>{err}</Empty></Shell>;
  if (!list) return <Shell title="Reports"><div style={{ padding: 30 }}><Spinner /></div></Shell>;

  return (
    <Shell title="Reports">
      <div className="card panel">
        <h3>Signed reports</h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Delivered case-files — each finding human-verified and signed by an OctaSec operator.</p>
        {list.length === 0 ? <Empty>No delivered reports yet. Request a scan under “Scans”.</Empty> : (
          <table className="tbl">
            <thead><tr><th>Domain</th><th>Findings</th><th>Delivered</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} className="frow" onClick={() => setViewId(e.id)}>
                  <td className="mono">{e.domainName}</td>
                  <td>{e.findings}</td>
                  <td className="mono dim">{e.signedAt ? new Date(e.signedAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {viewId && <ReportView id={viewId} onClose={() => setViewId(null)} />}
    </Shell>
  );
}

function ReportView({ id, onClose }) {
  const [e, setE] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => { try { setE((await get("/engagements/" + encodeURIComponent(id))).engagement); } catch (e2) { setErr(e2.message); } })();
  }, [id]);
  return (
    <Modal title={e ? `Report — ${e.domainName}` : "Report"} sub={e && e.signedByName ? `Signed by ${e.signedByName}` : "Loading…"} onClose={onClose}>
      {err && !e && <div className="form-err">{err}</div>}
      {!e && !err ? <Spinner /> : null}
      {e && <FindingsTable findings={e.findings} />}
    </Modal>
  );
}

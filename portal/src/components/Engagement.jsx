import { TEST_TYPES, ENVIRONMENTS, TARGET_TYPES, OBJECTIVES } from "../profileOptions.js";
const CLS = { requested: "warn", assigned: "gold", in_progress: "gold", delivered: "green", rejected: "red", cancelled: "dim" };
const LBL = { requested: "Requested", assigned: "Assigned", in_progress: "Running", delivered: "Delivered", rejected: "Rejected", cancelled: "Cancelled" };

export function EngStatus({ status }) {
  return <span className={"chip " + (CLS[status] || "dim")}>{LBL[status] || status}</span>;
}

export const SEV_CLASS = { critical: "c", high: "h", medium: "m", low: "l" };

export function FindingsTable({ findings }) {
  if (!findings?.length) return <div className="empty">No findings.</div>;
  return (
    <div className="tbl-wrap"><table className="tbl">
      <thead><tr><th>CVSS</th><th>Finding</th><th>Host</th></tr></thead>
      <tbody>
        {findings.map((f, i) => (
          <tr key={i}>
            <td><span className={"cvss " + (SEV_CLASS[f.severity] || "l")}>{f.cvss ? f.cvss.toFixed(1) : "—"}</span></td>
            <td><div className="ti">{f.title}</div><div className="meta" style={{ fontFamily: "var(--m)", fontSize: 10.5, color: "var(--faint)" }}>{f.owasp || f.severity}</div></td>
            <td className="mono dim">{f.host}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

// what the requester told us at scoping time (read-only)
export function ScopingView({ e }) {
  const s = e?.scoping;
  if (!s || !s.testType) return null;
  const d = (x) => (x ? new Date(x).toISOString().slice(0, 10) : "—");
  const yes = (b) => (b ? "Yes" : "No");
  return (
    <div className="kvgrid" style={{ margin: "4px 0 14px" }}>
      <div className="kv"><span>Environment</span><b>{ENVIRONMENTS[s.environment] || "—"}</b></div>
      <div className="kv"><span>Test type</span><b>{(TEST_TYPES[s.testType] || "—").split(" — ")[0]}</b></div>
      <div className="kv"><span>Targets</span><b>{(s.targetTypes || []).map((t) => TARGET_TYPES[t]).join(", ")}</b></div>
      <div className="kv"><span>Objective</span><b>{OBJECTIVES[s.objective] || "—"}</b></div>
      <div className="kv"><span>Start → needed by</span><b>{d(s.preferredStart)} → {d(s.deadline)}</b></div>
      <div className="kv"><span>Window</span><b>{e.roe?.window || "Any time"}</b></div>
      <div className="kv"><span>User roles · max rps</span><b>{s.userRoles || 0} · {s.maxRps || "no limit"}</b></div>
      <div className="kv"><span>WAF · allow-list OK</span><b>{yes(s.wafInPlace)} · {yes(s.ipAllowlistOk)}</b></div>
      <div className="kv"><span>Test accounts</span><b>{s.testAccountsViaSecureChannel ? "Via secure channel" : "None"}</b></div>
      <div className="kv"><span>Emergency contact</span><b>{s.emergencyContact?.name} · {s.emergencyContact?.phone}</b></div>
      <div className="kv"><span>Authorised by</span><b>{e.roe?.authorizerName} · {e.roe?.authorizerTitle}</b></div>
      {e.roe?.excludes && <div className="kv"><span>Excluded</span><b>{e.roe.excludes}</b></div>}
      {s.apiDocsUrl && <div className="kv"><span>API docs</span><b>{s.apiDocsUrl}</b></div>}
      {s.notes && <div className="kv"><span>Notes</span><b>{s.notes}</b></div>}
    </div>
  );
}

const CLS = { requested: "warn", assigned: "gold", in_progress: "gold", delivered: "green", rejected: "red", cancelled: "dim" };
const LBL = { requested: "Requested", assigned: "Assigned", in_progress: "Running", delivered: "Delivered", rejected: "Rejected", cancelled: "Cancelled" };

export function EngStatus({ status }) {
  return <span className={"chip " + (CLS[status] || "dim")}>{LBL[status] || status}</span>;
}

export const SEV_CLASS = { critical: "c", high: "h", medium: "m", low: "l" };

export function FindingsTable({ findings }) {
  if (!findings?.length) return <div className="empty">No findings.</div>;
  return (
    <table className="tbl">
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
    </table>
  );
}

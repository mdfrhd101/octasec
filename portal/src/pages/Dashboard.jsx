import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../api.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Tile, StatusChip, Spinner, Empty } from "../ui.jsx";
import { Completeness } from "../components/OrgProfile.jsx";
import { AUTH_CHIP } from "../profileOptions.js";

// Every block answers a question the role actually asks — docs/PORTAL_DATA_AND_DASHBOARDS.md §4.
const SEV_CLASS = { critical: "c", high: "h", medium: "m", low: "l" };
const SCORE_COLOR = { Strong: "var(--green)", Good: "var(--gold)", Fair: "var(--warn)", "At risk": "var(--red)" };
const ACTION_LABEL = { "auth.login_fail": "Failed sign-in", "user.disable": "User disabled", "user.password_reset": "Password reset", "company.suspend": "Company suspended" };

function timeAgo(iso) {
  if (!iso) return "never";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}
const dayStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "—");
const AuthChip = ({ s }) => { const [c, l] = AUTH_CHIP[s] || AUTH_CHIP.missing; return <span className={"chip " + c}>{l}</span>; };

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { (async () => { try { setD(await get("/dashboard")); } catch (e) { setErr(e.message); } })(); }, []);

  const title = user.role === "super_admin" ? "Overview" : "Dashboard";
  if (err) return <Shell title={title}><Empty>{err}</Empty></Shell>;
  if (!d) return <Shell title={title}><div style={{ padding: 30 }}><Spinner /></div></Shell>;
  return (
    <Shell title={title}>
      {user.role === "super_admin" ? <Ops d={d} /> : <Tenant d={d} role={user.role} />}
    </Shell>
  );
}

/* ================= Super admin: what needs attention on the platform? ================= */
function Ops({ d }) {
  const nav = useNavigate();
  const o = d.ops;
  const u = o.totals.users || {};
  return (
    <>
      <div className="tiles">
        <Tile k="Awaiting assignment" v={o.queue.requested} gold />
        <Tile k="Waiting > 24 h" v={o.queue.unassigned24} gold={o.queue.unassigned24 > 0} />
        <Tile k="In progress" v={o.pipeline.assigned + o.pipeline.in_progress} />
        <Tile k="Delivered this month" v={o.pipeline.deliveredThisMonth} />
        <Tile k="Avg turnaround" v={o.turnaroundHours == null ? "—" : o.turnaroundHours < 48 ? o.turnaroundHours + " h" : Math.round(o.turnaroundHours / 24) + " d"} />
        <Tile k="New leads (7 d)" v={o.leads.last7d} />
      </div>

      <div className="dash-cols">
        <div className="card panel">
          <h3>Action queue<span className="sp"><button className="btn ghost sm" onClick={() => nav("/admin/engagements")}>Open queue</button></span></h3>
          {o.queue.oldest.length ? o.queue.oldest.map((e) => (
            <div className="alertrow" key={e.id}>
              <span><b className="mono">{e.domainName}</b><br /><span className="dimtxt">{e.tenant}</span></span>
              <span className={"chip " + (e.ageHours >= 24 ? "red" : "warn")}>waiting {e.ageHours < 48 ? e.ageHours + " h" : Math.round(e.ageHours / 24) + " d"}</span>
            </div>
          )) : <Empty>Nothing waiting — the queue is clear.</Empty>}
        </div>
        <div className="card panel">
          <h3>Support &amp; sales<span className="sp"><button className="btn ghost sm" onClick={() => nav("/admin/tickets")}>Tickets</button><button className="btn ghost sm" onClick={() => nav("/admin/leads")}>Leads</button></span></h3>
          <div className="sev-row sev-c"><span className="lab">urgent</span><span className="track"><i style={{ width: Math.min(100, o.tickets.urgent * 20) + "%" }} /></span><span className="cnt">{o.tickets.urgent}</span></div>
          <div className="sev-row sev-h"><span className="lab">high</span><span className="track"><i style={{ width: Math.min(100, o.tickets.high * 20) + "%" }} /></span><span className="cnt">{o.tickets.high}</span></div>
          <div className="sev-row sev-m"><span className="lab">normal</span><span className="track"><i style={{ width: Math.min(100, o.tickets.normal * 20) + "%" }} /></span><span className="cnt">{o.tickets.normal}</span></div>
          <div className="sev-row sev-l"><span className="lab">low</span><span className="track"><i style={{ width: Math.min(100, o.tickets.low * 20) + "%" }} /></span><span className="cnt">{o.tickets.low}</span></div>
          <div className="coverage-line"><span>Leads waiting for a reply</span><span><b>{o.leads.new}</b></span></div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card panel">
          <h3>Tenants at risk</h3>
          <p className="dimtxt">Most open critical / high findings from delivered reports — escalate these first.</p>
          {o.tenantsAtRisk.length ? (
            <table className="tbl"><thead><tr><th>Tenant</th><th>Type</th><th>Critical</th><th>High</th></tr></thead><tbody>
              {o.tenantsAtRisk.map((t, i) => (
                <tr key={i}><td>{t.name}</td><td><span className="chip dim">{t.kind}</span></td><td className="mono" style={{ color: t.critical ? "var(--red)" : undefined }}>{t.critical}</td><td className="mono">{t.high}</td></tr>
              ))}
            </tbody></table>
          ) : <Empty>No critical or high findings delivered yet.</Empty>}
        </div>
        <div className="card panel">
          <h3>Onboarding gaps<span className="sp"><button className="btn ghost sm" onClick={() => nav("/admin/companies")}>Companies</button></span></h3>
          <div className="alertrow"><span>Companies with incomplete profiles</span><b className="mono">{o.onboarding.incompleteCompanies}</b></div>
          <div className="alertrow"><span>Clients without a valid authorisation to test</span><b className="mono">{o.onboarding.clientsWithoutAuthorization}</b></div>
          {o.onboarding.companies.map((c) => (
            <div className="alertrow" key={c.id}><span className="dimtxt">{c.name}</span><span className="chip warn">{c.pct}% complete</span></div>
          ))}
        </div>
      </div>

      <div className="dash-cols">
        <div className="card panel">
          <h3>Security events<span className="sp"><button className="btn ghost sm" onClick={() => nav("/admin/audit")}>Audit log</button></span></h3>
          {o.securityEvents.length ? o.securityEvents.map((e, i) => (
            <div className="alertrow" key={i}>
              <span><span className={"chip " + (e.action === "auth.login_fail" ? "warn" : "red")}>{ACTION_LABEL[e.action] || e.action}</span> <span className="mono dim">{e.target || e.actor}</span></span>
              <span className="when">{e.ip ? e.ip + " · " : ""}{timeAgo(e.at)}</span>
            </div>
          )) : <Empty>No security events.</Empty>}
        </div>
        <div className="card panel">
          <h3>Platform</h3>
          <div className="tiles" style={{ marginTop: 10 }}>
            <Tile k="Companies" v={o.totals.companies} />
            <Tile k="Company users" v={(u.company_admin || 0) + (u.employee || 0)} />
            <Tile k="Self-serve clients" v={u.client || 0} />
            <Tile k="Verified domains" v={o.totals.verifiedDomains} />
          </div>
          <SeverityBars d={d} label="Findings delivered across the platform" />
        </div>
      </div>
    </>
  );
}

/* ================= Company / employee / client ================= */
function Tenant({ d, role }) {
  const nav = useNavigate();
  const company = role === "company_admin" || role === "employee";
  const color = SCORE_COLOR[d.scoreLabel] || "var(--gold)";
  return (
    <>
      {d.profile && d.profile.pct < 100 && (
        <div className="card panel">
          <Completeness c={d.profile} action={(role === "company_admin" || role === "client") && <button className="btn gold sm" onClick={() => nav("/organization")}>Complete profile</button>} />
        </div>
      )}

      <div className="dash-top">
        <div className="card scorecard">
          <div className="ring" style={{ "--v": d.score, "--c": color }}>
            <div className="in"><div className="n">{d.score}</div><div className="u">/ 100</div></div>
          </div>
          <div className="meta">
            <div className="k">Security posture</div>
            <div className="lbl" style={{ color }}>{d.scoreLabel}</div>
            <div className="sub">From signed findings across your verified assets.</div>
          </div>
        </div>
        <div className="tiles">
          <Tile k="Open findings" v={d.tiles.openFindings} gold />
          <Tile k="Critical" v={d.tiles.critical} gold />
          <Tile k="Verified domains" v={`${d.tiles.verified} / ${d.tiles.domains}`} />
          <Tile k="Assets" v={d.tiles.assets} />
          <Tile k="Scan coverage" v={d.coverage.scannedPct + "%"} />
          <Tile k="Open tickets" v={d.openTickets ?? 0} />
        </div>
      </div>

      {company && (
        <div className="card panel">
          <h3>Clients — who needs attention?<span className="sp"><button className="btn ghost sm" onClick={() => nav("/clients")}>All clients</button></span></h3>
          {d.clients?.length ? (
            <table className="tbl">
              <thead><tr><th>Client</th><th>Authorisation</th><th>Domains</th><th>Critical</th><th>High</th><th>Last assessed</th></tr></thead>
              <tbody>{d.clients.map((c) => (
                <tr key={c.id} className="frow" onClick={() => nav("/clients")}>
                  <td>{c.name}{c.status === "inactive" && <> <span className="chip dim">inactive</span></>}</td>
                  <td><AuthChip s={c.authorization} /></td>
                  <td className="mono">{c.verified} / {c.domains}</td>
                  <td className="mono" style={{ color: c.critical ? "var(--red)" : undefined }}>{c.critical}</td>
                  <td className="mono" style={{ color: c.high ? "var(--warn)" : undefined }}>{c.high}</td>
                  <td className="mono dim">{c.lastAssessed ? timeAgo(c.lastAssessed) : "never"}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <Empty>No clients yet. Add the businesses you manage under Clients.</Empty>}
        </div>
      )}

      <div className="dash-cols">
        <div className="card panel">
          <h3>Scans in flight<span className="sp"><button className="btn ghost sm" onClick={() => nav("/scans")}>Scans</button></span></h3>
          <div className="pipe">
            <div><b>{d.pipeline.requested}</b><span>Requested</span></div>
            <div><b>{d.pipeline.assigned}</b><span>Assigned</span></div>
            <div><b>{d.pipeline.in_progress}</b><span>Running</span></div>
            <div><b>{d.pipeline.delivered}</b><span>Delivered</span></div>
          </div>
          {role === "employee" && d.myRequests && (
            <div className="coverage-line"><span>Requested by you</span><span><b>{Object.values(d.myRequests).reduce((a, b) => a + b, 0)}</b></span></div>
          )}
          {role === "client" && d.unverified > 0 && (
            <div className="coverage-line"><span>Domains awaiting ownership verification</span><span><b>{d.unverified}</b></span></div>
          )}
        </div>
        <div className="card panel">
          <h3>Coverage gaps</h3>
          {company && d.expiringAuth?.length > 0 && d.expiringAuth.map((c) => (
            <div className="alertrow" key={c.id}><span>Authorisation for <b>{c.name}</b> expires</span><span className="chip warn">{dayStr(c.validUntil)}</span></div>
          ))}
          {d.stale?.length ? d.stale.map((s) => (
            <div className="alertrow" key={s.name}><span className="mono">{s.name}</span><span className="when">{s.lastAssessed ? "last assessed " + timeAgo(s.lastAssessed) : "never assessed"}</span></div>
          )) : !(company && d.expiringAuth?.length) && <Empty>Every verified domain was assessed in the last 90 days.</Empty>}
        </div>
      </div>

      <div className="dash-cols">
        <div className="card panel"><h3>Findings by severity</h3><SeverityBars d={d} /></div>
        <div className="card panel">
          <h3>Top findings<span className="sp"><button className="btn ghost sm" onClick={() => nav("/reports")}>All reports</button></span></h3>
          {d.topFindings.length ? (
            <div className="findlist">
              {d.topFindings.map((f, i) => (
                <div className="findrow" key={i}>
                  <span className={"cvss " + SEV_CLASS[f.severity]}>{f.cvss ? f.cvss.toFixed(1) : "—"}</span>
                  <div><div className="ti">{f.title}</div><div className="meta">{f.owasp || f.severity}</div></div>
                  <span className="host">{f.host}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No signed findings yet. Request a scan to populate this.</Empty>}
        </div>
      </div>

      <div className="card panel">
        <h3>Recent assets<span className="sp"><button className="btn ghost sm" onClick={() => nav("/assets")}>All assets</button></span></h3>
        {d.recentAssets.length ? (
          <div className="feed">
            {d.recentAssets.map((a) => (
              <div className="feeditem" key={a._id}>
                <span className="host">{a.host}</span>
                <span>{(a.tech || []).slice(0, 3).map((t) => <span key={t} className="chip">{t}</span>)}</span>
                <StatusChip status={a.status} />
                <span className="when">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : <Empty>No assets yet. Add &amp; verify a domain, then discover assets.</Empty>}
      </div>
    </>
  );
}

function SeverityBars({ d, label }) {
  const max = Math.max(1, d.severity.critical, d.severity.high, d.severity.medium, d.severity.low);
  return (
    <>
      {label && <p className="dimtxt" style={{ margin: "14px 0 4px" }}>{label}</p>}
      {["critical", "high", "medium", "low"].map((s) => (
        <div className={"sev-row sev-" + SEV_CLASS[s]} key={s}>
          <span className="lab">{s}</span>
          <span className="track"><i style={{ width: (d.severity[s] / max) * 100 + "%" }} /></span>
          <span className="cnt">{d.severity[s]}</span>
        </div>
      ))}
      <div className="coverage-line">
        <span>Domains assessed</span>
        <span><b>{d.coverage.scanned}</b> / {d.coverage.assets} &middot; <b>{d.coverage.scannedPct}%</b></span>
      </div>
    </>
  );
}

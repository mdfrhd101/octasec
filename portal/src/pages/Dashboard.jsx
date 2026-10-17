import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../api.js";
import { useAuth } from "../auth.jsx";
import Shell from "../components/Shell.jsx";
import { Tile, StatusChip, Spinner, Empty } from "../ui.jsx";

const SEV_CLASS = { critical: "c", high: "h", medium: "m", low: "l" };
const SCORE_COLOR = { Strong: "var(--green)", Good: "var(--gold)", Fair: "var(--warn)", "At risk": "var(--red)" };

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { setD(await get("/dashboard")); } catch (e) { setErr(e.message); }
    })();
  }, []);

  const title = user.role === "super_admin" ? "Overview" : "Dashboard";
  if (err) return <Shell title={title}><Empty>{err}</Empty></Shell>;
  if (!d) return <Shell title={title}><div style={{ padding: 30 }}><Spinner /></div></Shell>;

  const sevMax = Math.max(1, d.severity.critical, d.severity.high, d.severity.medium, d.severity.low);
  const color = SCORE_COLOR[d.scoreLabel] || "var(--gold)";

  return (
    <Shell title={title}>
      {/* row 1 — posture score + KPI tiles */}
      <div className="dash-top">
        <div className="card scorecard">
          <div className="ring" style={{ "--v": d.score, "--c": color }}>
            <div className="in"><div className="n">{d.score}</div><div className="u">/ 100</div></div>
          </div>
          <div className="meta">
            <div className="k">Security posture</div>
            <div className="lbl" style={{ color }}>{d.scoreLabel}</div>
            <div className="sub">Weighted by open findings across your {user.role === "super_admin" ? "platform" : "verified"} assets.</div>
          </div>
        </div>
        <div className="tiles">
          <Tile k="Open findings" v={d.tiles.openFindings} gold />
          <Tile k="Critical" v={d.tiles.critical} gold />
          <Tile k="Assets" v={d.tiles.assets} />
          <Tile k="Verified domains" v={d.tiles.verified} />
          <Tile k="Domains" v={d.tiles.domains} />
          <Tile k="Scan coverage" v={d.coverage.scannedPct + "%"} />
        </div>
      </div>

      {/* row 2 — severity breakdown + top findings */}
      <div className="dash-cols">
        <div className="card panel">
          <h3>Findings by severity</h3>
          {["critical", "high", "medium", "low"].map((s) => (
            <div className={"sev-row sev-" + SEV_CLASS[s]} key={s}>
              <span className="lab">{s}</span>
              <span className="track"><i style={{ width: (d.severity[s] / sevMax) * 100 + "%" }} /></span>
              <span className="cnt">{d.severity[s]}</span>
            </div>
          ))}
          <div className="coverage-line">
            <span>Domains assessed</span>
            <span><b>{d.coverage.scanned}</b> / {d.coverage.assets} domains &middot; <b>{d.coverage.scannedPct}%</b></span>
          </div>
        </div>

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
          ) : <Empty>No open findings. Run a scan to populate this.</Empty>}
        </div>
      </div>

      {/* row 3 — recent assets feed */}
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

      {user.role !== "super_admin" && (
        <div className="card panel">
          <h3>Next steps</h3>
          <div className="steps-mini">
            <div><b>1</b> Add a domain and verify ownership with the generated .txt file.</div>
            <div><b>2</b> Discover assets &amp; subdomains.</div>
            <div><b>3</b> Scope and run a scan, then review proven findings.</div>
          </div>
          <div className="hero-cta" style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button className="btn gold sm" onClick={() => nav("/domains")}>+ Add domain</button>
            <button className="btn ghost sm" onClick={() => nav("/assets")}>Go to assets</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

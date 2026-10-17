import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { CopyBox } from "../ui.jsx";

// Illustrative key display only — issuing real API keys is a backend feature
// to be wired up later. The "sk_demo_" prefix makes clear these grant nothing.
function fakeKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "sk_demo_";
  const buf = new Uint32Array(24);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 24; i++) s += chars[buf[i] % chars.length];
  return s;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([fakeKey()]);
  return (
    <Shell title="API & integrations">
      <div className="card panel">
        <h3>API keys<span className="sp"><button className="btn gold sm" onClick={() => setKeys((k) => [fakeKey(), ...k])}>Generate key</button></span></h3>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
          Connect your own tooling and CI. Keys are shown once; the values below are illustrative until key issuance is enabled.
        </p>
        {keys.map((k, i) => <CopyBox key={i} value={k} />)}
      </div>
      <div className="card panel">
        <h3>Integrations</h3>
        <div style={{ marginTop: 8 }}>
          {["Webhook", "GitHub Actions", "GitLab CI", "Jira", "Slack", "REST API"].map((x) => <span key={x} className="chip">{x}</span>)}
        </div>
      </div>
    </Shell>
  );
}

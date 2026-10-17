import { INDUSTRIES, SIZES, COMPLIANCE, DATA_TYPES, CONTACTS } from "../profileOptions.js";

const opt = (map) => Object.entries(map).map(([v, l]) => <option key={v} value={v}>{l}</option>);
const Req = () => <span className="req" aria-hidden="true">*</span>;

// Controlled editor for an organisation profile (server validates the same rules).
export function OrgProfileForm({ value, onChange, nameHint = "Registered company name" }) {
  const p = value;
  const set = (k) => (e) => onChange({ ...p, [k]: e.target.value });
  const setC = (kind, k) => (e) => onChange({ ...p, contacts: { ...p.contacts, [kind]: { ...p.contacts[kind], [k]: e.target.value } } });
  const toggle = (k, v) => onChange({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] });

  return (
    <div className="orgform">
      <div className="fsec">Identity</div>
      <div className="fgrid">
        <label className="full"><span>Legal name <Req /></span><input value={p.legalName} onChange={set("legalName")} placeholder={nameHint} maxLength={160} /></label>
        <label>Trade / brand name<input value={p.tradeName} onChange={set("tradeName")} placeholder="If different" maxLength={120} /></label>
        <label><span>Industry <Req /></span>
          <select value={p.industry} onChange={set("industry")}><option value="">Select…</option>{opt(INDUSTRIES)}</select>
        </label>
        <label>Company size
          <select value={p.size} onChange={set("size")}><option value="">Select…</option>{opt(SIZES)}</select>
        </label>
        <label>Website<input value={p.website} onChange={set("website")} placeholder="https://example.com" maxLength={200} /></label>
        <label>Registration / trade licence no.<input value={p.regNo} onChange={set("regNo")} maxLength={60} /></label>
        <label>TIN / BIN<input value={p.taxId} onChange={set("taxId")} maxLength={40} /></label>
      </div>

      <div className="fsec">Location</div>
      <div className="fgrid">
        <label><span>Country (2-letter) <Req /></span><input value={p.country} onChange={set("country")} maxLength={2} placeholder="BD" /></label>
        <label>City<input value={p.city} onChange={set("city")} maxLength={80} placeholder="Dhaka" /></label>
        <label className="full">Address<input value={p.address} onChange={set("address")} maxLength={300} /></label>
        <label>Timezone<input value={p.timezone} onChange={set("timezone")} maxLength={60} placeholder="Asia/Dhaka" /></label>
      </div>

      <div className="fsec">Contacts</div>
      <div className="contact-grid">
        {Object.entries(CONTACTS).map(([kind, [title, hint]]) => (
          <div className="contact-card" key={kind}>
            <div className="ct">{title}{kind === "primary" && <Req />}</div>
            <div className="ch">{hint}</div>
            <div className="fgrid">
              <label>Name<input value={p.contacts[kind].name} onChange={setC(kind, "name")} maxLength={80} /></label>
              <label>Title<input value={p.contacts[kind].title} onChange={setC(kind, "title")} maxLength={80} /></label>
              <label>Email<input type="email" value={p.contacts[kind].email} onChange={setC(kind, "email")} maxLength={160} /></label>
              <label>Phone<input value={p.contacts[kind].phone} onChange={setC(kind, "phone")} maxLength={20} placeholder="+8801…" /></label>
            </div>
          </div>
        ))}
      </div>

      <div className="fsec">Compliance & data</div>
      <div className="chkgroup">
        <div className="gl">Frameworks your reports should map to</div>
        <div className="chkgrid">
          {Object.entries(COMPLIANCE).map(([v, l]) => (
            <label key={v} className={"pick" + (p.compliance.includes(v) ? " on" : "")}>
              <input type="checkbox" checked={p.compliance.includes(v)} onChange={() => toggle("compliance", v)} />{l}
            </label>
          ))}
        </div>
      </div>
      <div className="chkgroup">
        <div className="gl">Sensitive data your systems handle</div>
        <div className="chkgrid">
          {Object.entries(DATA_TYPES).map(([v, l]) => (
            <label key={v} className={"pick" + (p.dataTypes.includes(v) ? " on" : "")}>
              <input type="checkbox" checked={p.dataTypes.includes(v)} onChange={() => toggle("dataTypes", v)} />{l}
            </label>
          ))}
        </div>
      </div>

      <div className="fsec">Preferences</div>
      <div className="fgrid">
        <label>Report language
          <select value={p.reportLanguage} onChange={set("reportLanguage")}><option value="en">English</option><option value="bn">Bangla</option></select>
        </label>
        <label className="chkline">
          <input type="checkbox" checked={p.notifyCritical} onChange={(e) => onChange({ ...p, notifyCritical: e.target.checked })} />
          Call / email immediately when a critical finding is confirmed
        </label>
        <label className="full">Notes<textarea rows={3} value={p.notes} onChange={set("notes")} maxLength={1000} /></label>
      </div>
    </div>
  );
}

const V = ({ k, v }) => <div className="kv"><span>{k}</span><b>{v || "—"}</b></div>;

// Read-only summary of a profile.
export function OrgProfileView({ profile }) {
  if (!profile) return <p className="dimtxt">No organisation details recorded yet.</p>;
  const p = profile;
  return (
    <div className="orgview">
      <div className="kvgrid">
        <V k="Legal name" v={p.legalName} /><V k="Trade name" v={p.tradeName} />
        <V k="Industry" v={INDUSTRIES[p.industry]} /><V k="Size" v={SIZES[p.size]} />
        <V k="Website" v={p.website} /><V k="Reg. / licence no." v={p.regNo} />
        <V k="TIN / BIN" v={p.taxId} /><V k="Country" v={[p.city, p.country].filter(Boolean).join(", ")} />
        <V k="Address" v={p.address} /><V k="Timezone" v={p.timezone} />
      </div>
      <div className="contact-grid view">
        {Object.entries(CONTACTS).map(([kind, [title]]) => {
          const c = p.contacts?.[kind] || {};
          return (
            <div className="contact-card" key={kind}>
              <div className="ct">{title}</div>
              {c.name || c.email ? (
                <div className="cv"><b>{c.name || "—"}</b>{c.title ? ` · ${c.title}` : ""}<br />{c.email || "—"}<br />{c.phone || "—"}</div>
              ) : <div className="cv dimtxt">Not set</div>}
            </div>
          );
        })}
      </div>
      <div className="kvgrid">
        <V k="Compliance" v={(p.compliance || []).map((x) => COMPLIANCE[x]).join(", ")} />
        <V k="Data handled" v={(p.dataTypes || []).map((x) => DATA_TYPES[x]).join(", ")} />
        <V k="Report language" v={p.reportLanguage === "bn" ? "Bangla" : "English"} />
        <V k="Notify on critical" v={p.notifyCritical === false ? "No" : "Yes"} />
      </div>
      {p.notes && <p className="dimtxt" style={{ marginTop: 10 }}>{p.notes}</p>}
    </div>
  );
}

// "Profile 67% complete — missing: …"
export function Completeness({ c, action }) {
  if (!c) return null;
  const color = c.pct >= 100 ? "var(--green)" : c.pct >= 60 ? "var(--gold)" : "var(--warn)";
  return (
    <div className="pbar-wrap">
      <div className="pbar-top"><span>Profile {c.pct}% complete</span>{action}</div>
      <div className="pbar"><i style={{ width: c.pct + "%", background: color }} /></div>
      {c.missing?.length > 0 && <div className="pbar-miss">Missing: {c.missing.join(" · ")}</div>}
    </div>
  );
}

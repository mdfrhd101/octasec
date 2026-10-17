import SectionHead from "./SectionHead";

/* metric | Scanner | Traditional | OctaSec, with per-cell tone classes */
const ROWS: { ft: string; scanner: [string, string]; trad: [string, string]; oc: string }[] = [
  { ft: "Depth", scanner: ["Low", "no"], trad: ["High", "yes"], oc: "High" },
  { ft: "Business logic", scanner: ["No", "no"], trad: ["Sometimes", "mid"], oc: "Yes, systematic" },
  { ft: "Price", scanner: ["Low", "yes"], trad: ["$$$$", "no"], oc: "$" },
  { ft: "Turnaround", scanner: ["Hours", "yes"], trad: ["Weeks", "no"], oc: "Days" },
  { ft: "Proof of exploit", scanner: ["No", "no"], trad: ["Yes", "yes"], oc: "Yes, case-file" },
  { ft: "Retest", scanner: ["Paid", "no"], trad: ["Paid", "no"], oc: "Included" },
  { ft: "Audit trail", scanner: ["No", "no"], trad: ["Partial", "mid"], oc: "Full action log" },
];

export default function DifferentiatorTable() {
  return (
    <section className="wrap center rv" id="compare">
      <SectionHead
        eyebrow="How it compares"
        title="Not a scanner. Not a once-a-year pentest."
        center
      />
      <div className="card cmp stagger" style={{ textAlign: "left" }}>
        <div className="cmp-row head">
          <span>&nbsp;</span>
          <span className="c">Scanner</span>
          <span className="c">Traditional</span>
          <span className="c oc">OctaSec</span>
        </div>
        {ROWS.map((r) => (
          <div className="cmp-row" key={r.ft}>
            <span className="ft">{r.ft}</span>
            <span className={"c " + r.scanner[1]}>{r.scanner[0]}</span>
            <span className={"c " + r.trad[1]}>{r.trad[0]}</span>
            <span className="c oc">{r.oc}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

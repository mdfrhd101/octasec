// Shared geometry + sample-engagement copy for the "mission control" homepage.
// The globe stage is a 700×700 viewBox: sphere centre (350, 350), radius 210.

export const C = 350;
export const SPHERE = 210;
const D = Math.PI / 180;

export type Orbit = { rx: number; ry: number; rot: number; cy?: number; dash?: string; op?: number; w?: number; halo?: boolean };

export const ORBITS: Orbit[] = [
  { rx: 236, ry: 36, rot: -4, cy: -128, halo: true, w: 1.8 }, // the glowing ring over the top
  { rx: 300, ry: 80, rot: -12, op: 0.5, dash: "1 6" },
  { rx: 262, ry: 128, rot: 24, op: 0.34, dash: "3 7" },
  { rx: 338, ry: 150, rot: -32, op: 0.24, dash: "2 8" },
];

// rounded, so server and browser render identical coordinates (their last float digits can differ)
const r2 = (v: number) => Math.round(v * 100) / 100;

/** point on a rotated ellipse at angle t (degrees); sin(t) < 0 is the far half */
export function onOrbit(o: Orbit, t: number): [number, number] {
  const x = o.rx * Math.cos(t * D), y = o.ry * Math.sin(t * D), r = o.rot * D;
  return [r2(C + x * Math.cos(r) - y * Math.sin(r)), r2(C + (o.cy ?? 0) + x * Math.sin(r) + y * Math.cos(r))];
}

/** SVG arc path for t0..t1 in 90° pieces (an exact half-ellipse arc is ambiguous) */
export function orbitArc(o: Orbit, t0: number, t1: number): string {
  let d = "";
  for (let t = t0; t < t1; t += 90) {
    const [x0, y0] = onOrbit(o, t), [x1, y1] = onOrbit(o, t + 90);
    d += (d ? "" : `M${x0.toFixed(1)},${y0.toFixed(1)}`) + ` A${o.rx},${o.ry} ${o.rot} 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

export type NodeId = "api" | "mobile" | "pay" | "admin" | "auth" | "cdn";
export type HudNode = { id: NodeId; o: number; t: number; label: string; short?: string; dx: number; dy: number; end?: boolean };

// the sample client's assets, parked on the front of their orbits so every label stays readable
export const NODES: HudNode[] = [
  { id: "api", o: 3, t: 240, label: "api.your-app.com", short: "api", dx: -20, dy: -30, end: true },
  { id: "mobile", o: 3, t: 60, label: "mobile API", dx: -20, dy: 34, end: true },
  { id: "pay", o: 2, t: 60, label: "payments", dx: 22, dy: 20 },
  { id: "admin", o: 2, t: 200, label: "admin portal", short: "admin", dx: -18, dy: -30, end: true },
  { id: "auth", o: 3, t: 298, label: "auth service", dx: 22, dy: -28 },
  { id: "cdn", o: 3, t: 122, label: "cdn", dx: -20, dy: 22, end: true },
];

export const nodePos = (id: NodeId): [number, number] => {
  const n = NODES.find((x) => x.id === id)!;
  return onOrbit(ORBITS[n.o], n.t);
};

/** a chain hop: a curve that bows away from the sphere's centre, like a path over its surface */
export function hop(a: NodeId, b: NodeId): string {
  const [x0, y0] = nodePos(a), [x1, y1] = nodePos(b);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  let qx = mx + (mx - C) * 0.5, qy = my + (my - C) * 0.5;
  const off = Math.hypot(mx - C, my - C);
  if (off < 70) {
    // midpoint near the centre: push the control point sideways (upward) so the hop still arcs
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    let nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    if (ny > 0) { nx = -nx; ny = -ny; }
    qx += nx * (90 - off); qy += ny * (90 - off);
  }
  return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

export type Scene = { id: string; path: NodeId[]; steps: { t: string; sev: string }[]; result: string };

// two sample chains the hero alternates between (illustrative, labelled as a sample on the page)
export const SCENES: Scene[] = [
  {
    id: "Chain A-17",
    path: ["auth", "admin", "pay"],
    steps: [
      { t: "IDOR on /orders", sev: "Low" },
      { t: "Weak role check", sev: "Low" },
      { t: "Verbose admin error", sev: "Low" },
    ],
    result: "Admin takeover",
  },
  {
    id: "Chain B-04",
    path: ["api", "mobile", "auth"],
    steps: [
      { t: "API key in JS bundle", sev: "Info" },
      { t: "No rate limit on mobile API", sev: "Low" },
      { t: "Reset token reuse", sev: "Medium" },
    ],
    result: "Account takeover",
  },
];

// packets travelling the orbits: [orbit, seconds per lap, start angle]
export const PACKETS: [number, number, number][] = [
  [1, 26, 20],
  [2, 34, 200],
  [3, 41, 320],
];

/* ---- mission path (the attack chain as a flight profile), viewBox 1400×530 ---- */
export const PLOT = { w: 1400, h: 530, x0: 60, x1: 1340, y0: 14, y1: 336, card: 372 };
// one cubic per stage of the climb (the "S" joins of the original path, expanded)
const SEGS: [number, number][][] = [
  [[60, 330], [300, 327], [470, 302], [600, 252]],
  [[600, 252], [730, 202], [840, 126], [1000, 94]],
  [[1000, 94], [1160, 62], [1220, 46], [1330, 38]],
];
export const TRAJ = "M60,330 C300,327 470,302 600,252 C730,202 840,126 1000,94 C1160,62 1220,46 1330,38";

const bez = (s: [number, number][], t: number): [number, number] => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * s[0][k] + 3 * u * u * t * s[1][k] + 3 * u * t * t * s[2][k] + t * t * t * s[3][k]) as [number, number];
};
// arc-length table, so markers sit where the drawn stroke actually reaches
const TABLE: { p: [number, number]; l: number }[] = (() => {
  const out: { p: [number, number]; l: number }[] = [];
  let l = 0, prev: [number, number] | null = null;
  for (const s of SEGS)
    for (let i = 0; i <= 120; i++) {
      const p = bez(s, i / 120);
      if (prev) l += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      out.push({ p, l });
      prev = p;
    }
  return out;
})();
export function pointAt(f: number): [number, number] {
  const want = f * TABLE[TABLE.length - 1].l;
  const hit = TABLE.find((e) => e.l >= want) ?? TABLE[TABLE.length - 1];
  return [r2(hit.p[0]), r2(hit.p[1])];
}

export type Stage = {
  f: number; k: string; n: string; tag: string; tone?: "ok" | "crit"; p: string; align?: "start" | "end";
  // the chapter (old MethodChapters copy): headline, story, chips
  t: string; d: string; c: string[];
};
export const STAGES: Stage[] = [
  {
    f: 0.07, k: "01", n: "Scope", tag: "Signed", tone: "ok", align: "start",
    p: "Rules of engagement signed. Assets allow-listed, scope enforced at the network level.",
    t: "You define it. We enforce it.",
    d: "Assets and rules of engagement are agreed and signed by both sides. Scope is enforced mechanically at the network level — not just on paper.",
    c: ["Signed RoE", "Allow-listed targets", "Test window"],
  },
  {
    f: 0.37, k: "02", n: "Map", tag: "Surface", tone: "crit",
    p: "Subdomains, endpoints and technologies mapped: your real attack surface.",
    t: "See what attackers see.",
    d: "Subdomains, ports, services, JS-hidden endpoints, technology fingerprints, cloud assets and leaked secrets — your real attack surface.",
    c: ["Subdomains", "Endpoints", "Fingerprints"],
  },
  {
    f: 0.64, k: "03", n: "Hunt", tag: "Critical", tone: "crit",
    p: "90+ techniques, chosen per feature. Small weaknesses chained into real attack paths.",
    t: "90+ techniques, chosen — never sprayed.",
    d: "The engine selects modules per feature, tests every role, and chains small weaknesses into the attack paths scanners never see.",
    c: ["Business logic", "Auth & roles", "Attack chains"],
  },
  {
    f: 0.96, k: "04", n: "Prove", tag: "Verified", tone: "ok", align: "end",
    p: "Reproduced, then verified and signed by a named operator. Free retest included.",
    t: "If we can't prove it, we don't report it.",
    d: "Minimum-impact proof, then a named human operator verifies and signs every finding. You get a case file, a fix — and a free retest.",
    c: ["Reproduction", "Human-verified", "Retest included"],
  },
];

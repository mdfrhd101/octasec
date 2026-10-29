"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { WORLD } from "./worldMask";

// markers: Octagram's HQ (the red disc, like the flag) and world clocks for local test windows
const SITES = [
  { k: "dhaka", name: "Dhaka", note: "Octagram HQ", lat: 23.8103, lon: 90.4125, tz: "Asia/Dhaka", hq: true, side: "r" },
  { k: "london", name: "London", lat: 51.5072, lon: -0.1276, tz: "Europe/London", side: "l" },
  { k: "newyork", name: "New York", lat: 40.7128, lon: -74.006, tz: "America/New_York", side: "r" },
  { k: "dubai", name: "Dubai", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai", side: "l" },
  { k: "singapore", name: "Singapore", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore", side: "r" },
  { k: "sydney", name: "Sydney", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney", side: "l" },
  { k: "saopaulo", name: "São Paulo", lat: -23.5558, lon: -46.6396, tz: "America/Sao_Paulo", side: "r" },
] as const;
// big metros, for the "city lights" clusters on the dot matrix
const METROS: [number, number][] = [
  [23.8, 90.4], [22.6, 88.4], [28.6, 77.2], [19.1, 72.9], [13.1, 80.3], [12.97, 77.6], [24.9, 67.0], [31.5, 74.3], [33.7, 73.1],
  [39.9, 116.4], [31.2, 121.5], [23.1, 113.3], [22.3, 114.2], [30.6, 114.3], [35.7, 139.7], [34.7, 135.5], [37.6, 127.0], [25.0, 121.5],
  [14.6, 121.0], [13.8, 100.5], [21.0, 105.8], [10.8, 106.7], [1.35, 103.8], [3.1, 101.7], [-6.2, 106.8], [-33.9, 151.2], [-37.8, 145.0],
  [25.2, 55.3], [24.7, 46.7], [41.0, 29.0], [30.0, 31.2], [6.5, 3.4], [-1.3, 36.8], [-26.2, 28.0], [33.6, -7.6],
  [51.5, -0.1], [48.9, 2.35], [52.5, 13.4], [40.4, -3.7], [41.9, 12.5], [52.4, 4.9], [50.1, 8.7], [55.8, 37.6], [59.3, 18.1], [53.3, -6.3],
  [40.7, -74.0], [42.4, -71.1], [38.9, -77.0], [41.9, -87.6], [34.1, -118.2], [37.8, -122.4], [47.6, -122.3], [43.7, -79.4], [45.5, -73.6],
  [29.8, -95.4], [33.7, -84.4], [25.8, -80.2], [19.4, -99.1], [4.7, -74.1], [-12.0, -77.0], [-23.6, -46.6], [-22.9, -43.2], [-34.6, -58.4], [-33.4, -70.6],
];

const { cols: COLS, rows: ROWS, step: STEP, lat0: LAT0, lon0: LON0, bits: BITS } = WORLD;
const xOf = (lon: number) => ((lon - LON0) / 360) * 100; // % of the map width
const yOf = (lat: number) => ((LAT0 - lat) / (STEP * (ROWS - 1))) * 100; // % of the map height
const SWEEP_MS = 9000;

function decode() {
  const raw = atob(BITS), land = new Uint8Array(COLS * ROWS);
  for (let i = 0; i < COLS * ROWS; i++) land[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
  // city lights: land cells near a big metro glow brighter
  const lit = new Float32Array(COLS * ROWS);
  for (const [lat, lon] of METROS) {
    const r0 = Math.round((LAT0 - lat) / STEP), c0 = Math.floor((lon - LON0) / STEP);
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      const r = r0 + dr, c = c0 + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      const i = r * COLS + c, d = Math.hypot(dr, dc);
      if (land[i]) lit[i] = Math.max(lit[i], 1 - d / 3);
    }
  }
  return { land, lit };
}

/**
 * The "robotic" world map: a dot matrix of land (square dots on a 1.4° grid), city-light
 * clusters, a lat/long grid, a vertical scan line that sweeps east and lights the dots and
 * markers it passes, and reticle markers with live local clocks. Octagram's HQ in Dhaka is a
 * red disc on the green map (the flag). Canvas for the dots, HTML for crisp labels.
 * Sleeps off screen; reduced motion: one still frame, no sweep.
 */
export default function HudWorld() {
  const wrap = useRef<HTMLDivElement | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [hit, setHit] = useState<string | null>(null);
  const [sweep, setSweep] = useState("090.4°E");

  // live clocks (client only: the server can't know the visitor's "now")
  useEffect(() => {
    const fmt = (tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const off = (tz: string) => {
      const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
      return (p.find((x) => x.type === "timeZoneName")?.value || "").replace("GMT", "UTC");
    };
    const tick = () => setTimes(Object.fromEntries(SITES.map((s) => [s.k, `${fmt(s.tz).format(new Date())} ${off(s.tz) || "UTC"}`])));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = cv.current, box = wrap.current, ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { land, lit } = decode();
    const read = () => {
      const s = getComputedStyle(canvas), v = (k: string, d: string) => s.getPropertyValue(k).trim() || d;
      return { dot: v("--w-dot", "47,174,120"), hot: v("--w-hot", "160,255,200"), line: v("--w-line", "63,207,142") };
    };
    let col = read(), W = 0, H = 0, cw = 0, ch = 0, dpr = 1;
    const base = document.createElement("canvas"), bctx = base.getContext("2d")!;
    const paintBase = () => {
      base.width = canvas.width; base.height = canvas.height;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      const s = Math.max(1.4, cw * 0.46);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        if (!land[i]) continue;
        const l = lit[i];
        bctx.fillStyle = l ? `rgba(${col.hot},${(0.45 + 0.55 * l).toFixed(2)})` : `rgba(${col.dot},.42)`;
        const z = l ? s * (1 + 0.35 * l) : s;
        bctx.fillRect(c * cw + (cw - z) / 2, r * ch + (ch - z) / 2, z, z);
      }
    };
    const size = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = box.clientWidth; H = box.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cw = W / COLS; ch = H / (ROWS - 1);
      paintBase();
    };
    // one frame: the base map, the band of dots near the sweep brightened, the sweep line
    const frame = (p: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(base, 0, 0, W, H);
      if (p < 0) return;
      const x = p * W, c0 = Math.floor(x / cw), band = 9, s = Math.max(1.6, cw * 0.56);
      for (let c = Math.max(0, c0 - band); c <= Math.min(COLS - 1, c0 + 1); c++) {
        const k = 1 - (c0 - c) / band;
        for (let r = 0; r < ROWS; r++) {
          if (!land[r * COLS + c]) continue;
          ctx.fillStyle = `rgba(${col.hot},${(0.25 + 0.6 * k).toFixed(2)})`;
          ctx.fillRect(c * cw + (cw - s) / 2, r * ch + (ch - s) / 2, s, s);
        }
      }
      const g = ctx.createLinearGradient(x - 60, 0, x + 4, 0);
      g.addColorStop(0, `rgba(${col.line},0)`); g.addColorStop(1, `rgba(${col.line},.18)`);
      ctx.fillStyle = g; ctx.fillRect(x - 60, 0, 64, H);
      // the line itself, with an oscilloscope jitter along it (robotic)
      ctx.strokeStyle = `rgba(${col.line},.95)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.lineWidth = 1;
      for (let y = 4; y < H; y += 6) {
        const a = Math.abs(Math.sin(y * 0.11 + p * 40) * Math.sin(y * 0.031 + p * 9)) * 9;
        ctx.beginPath(); ctx.moveTo(x - a, y); ctx.lineTo(x + a, y); ctx.stroke();
      }
    };

    let raf = 0, visible = true, t0 = performance.now(), lastHit = "";
    const loop = (t: number) => {
      raf = 0;
      if (!visible) return;
      const p = ((t - t0) % SWEEP_MS) / SWEEP_MS;
      frame(p);
      const lon = LON0 + p * 360;
      // markers ping as the sweep passes them
      const near = SITES.find((s) => Math.abs(s.lon - lon) < 4);
      const k = near ? near.k : "";
      if (k !== lastHit) { lastHit = k; setHit(k || null); }
      if (Math.round(t / 120) % 2 === 0) setSweep(`${Math.abs(lon).toFixed(1).padStart(5, "0")}°${lon < 0 ? "W" : "E"}`);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !reduce) raf = requestAnimationFrame(loop); };
    size();
    if (reduce) frame(-1); else kick();
    const ro = new ResizeObserver(() => { size(); if (reduce) frame(-1); });
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(box);
    const onTheme = () => { col = read(); paintBase(); if (reduce) frame(-1); };
    window.addEventListener("themechange", onTheme);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener("themechange", onTheme); };
  }, []);

  const grid: number[] = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
  const lats: number[] = [60, 30, 0, -30];
  return (
    <div className="hw-map" ref={wrap} aria-hidden="true">
      <div className="hw-grid">
        {grid.map((g) => <i key={"x" + g} className="v" style={{ left: xOf(g) + "%" } as CSSProperties}><b>{Math.abs(g)}°{g < 0 ? "W" : g > 0 ? "E" : ""}</b></i>)}
        {lats.map((g) => <i key={"y" + g} className="h" style={{ top: yOf(g) + "%" } as CSSProperties}><b>{Math.abs(g)}°{g < 0 ? "S" : g > 0 ? "N" : ""}</b></i>)}
      </div>
      <canvas ref={cv} />
      {SITES.map((s) => (
        <div
          key={s.k}
          className={"hw-site" + ("hq" in s && s.hq ? " hq" : "") + (s.side === "l" ? " l" : "") + (hit === s.k ? " hit" : "")}
          style={{ left: xOf(s.lon) + "%", top: yOf(s.lat) + "%" } as CSSProperties}
        >
          <span className="hw-ret"><i /></span>
          <span className="hw-tag">
            <b>{s.name}</b>
            {"note" in s && s.note ? <em>{s.note}</em> : null}
            <span className="hw-time">{times[s.k] || "--:--"}</span>
            <small>{Math.abs(s.lat).toFixed(2)}°{s.lat < 0 ? "S" : "N"} · {Math.abs(s.lon).toFixed(2)}°{s.lon < 0 ? "W" : "E"}</small>
          </span>
        </div>
      ))}
      <div className="hw-read tl"><span>Sweep</span><b>{sweep}</b></div>
      <div className="hw-read br"><span>Land cells</span><b>7,821</b></div>
    </div>
  );
}

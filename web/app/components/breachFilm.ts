// Shared engine for the attack film (docs/SCROLL_ANIMATION_PLAN.md), used by BreachScroll (scroll
// drives it) and BreachIntro (a clock drives it): the frame sets, loading and decoding, where the
// frame sits on a stage, and drawing it.

// Frames of the Gemini clip (cut at 9.72 s, before its own wrong logo ending), AI-upscaled with
// Real-ESRGAN and sharpened. Picked by the size the frame is drawn at: 2560px AVIF for big or
// high-DPI screens, 1600px AVIF otherwise, 800px WebP for phones and browsers without AVIF.
// `win` = decoded frames kept on each side of the current one. File names: 000.avif …
// (the reduced-motion still is still.webp, set in breach-scroll.css)
export const SETS = {
  x: { dir: "/anim/breach/x/", ext: "avif", n: 176, fps: 18, win: 8 },
  d: { dir: "/anim/breach/d/", ext: "avif", n: 176, fps: 18, win: 12 },
  m: { dir: "/anim/breach/m/", ext: "webp", n: 98, fps: 10, win: 16 },
};
export type FrameSet = (typeof SETS)[keyof typeof SETS];

export const BG = "#0b0e10"; // the clip's own background; the stage matches it
const BG0 = "rgba(11,14,16,0)";
export const AR = 9 / 16;
// a 16×16 AVIF: if it decodes, the browser can take the AVIF sets
const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAAD5bWV0YQAAAAAAAAAvaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAFBpY3R1cmVIYW5kbGVyAAAAAA5waXRtAAAAAAABAAAAHmlsb2MAAAAARAAAAQABAAAAAQAAASEAAAAdAAAAKGlpbmYAAAAAAAEAAAAaaW5mZQIAAAAAAQAAYXYwMUNvbG9yAAAAAGppcHJwAAAAS2lwY28AAAAUaXNwZQAAAAAAAAAQAAAAEAAAABBwaXhpAAAAAAMICAgAAAAMYXYxQ4EADAAAAAATY29scm5jbHgAAgACAAIAAAAAF2lwbWEAAAAAAAAAAQABBAECgwQAAAAlbWRhdAoKAgAABUz/xq+QBDIPEACXgBBAggAAEABcExAp";

// Where things sit in the clip, as fractions of the frame
export const SUBJECT = { x0: 0.14, x1: 0.86, y0: 0.04, y1: 0.9 }; // dome + laptop: never cropped
export const RING = { x: 0.5, y: 0.504, size: 0.207 }; // Gemini's octagon → the BrandMark box over it
// The hero's SealScanner ring is an octagon of circumradius 0.72·R (apothem 0.665·R, R = half its
// box); BrandMark's outer octagon has an apothem of 88.7/196 of its box. So a mark landing on the
// seal is 0.735 × the seal's box, on its centre.
export const SEAL_FIT = 0.735;

// Film progress (0..1; scroll in BreachScroll) → clip time (s). The flatter stretches hold a beat
// while its caption reads.
export const TIMELINE: [number, number][] = [
  [0, 0],
  [0.06, 0.35],
  [0.12, 1.1], // the attacks start
  [0.27, 3.15],
  [0.33, 3.8], // access denied, the sparks die out
  [0.39, 3.95],
  [0.5, 5.0], // the red thread reaches the screen
  [0.57, 5.5], // access proven
  [0.66, 6.5], // the padlock closes again
  [0.8, 9.2], // red takeover, the laptop dissolves
  [0.85, 9.72], // clean octagon → the real logo takes over
  [1, 9.72],
];

// Captions, each shown between film progress a and b
export const BEATS = [
  { a: 0, b: 0.1, k: "The target", t: "Your app. Scanned, patched, shielded." },
  { a: 0.1, b: 0.27, k: "The usual attacks", t: "Bots. Brute force. Known CVEs." },
  { a: 0.27, b: 0.34, k: "Blocked", t: "Access denied." },
  { a: 0.34, b: 0.41, k: "All quiet", t: "So you're safe?" },
  { a: 0.41, b: 0.51, k: "OctaSec", t: "We find the path scanners miss." },
  { a: 0.51, b: 0.6, k: "Proof", t: "Access proven. Human-verified." },
  { a: 0.6, b: 0.7, k: "The fix", t: "Then we help you close it." },
];

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const ramp = (a: number, b: number, v: number) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
export const timeAt = (p: number) => {
  for (let i = 1; i < TIMELINE.length; i++) {
    const [p1, t1] = TIMELINE[i];
    if (p <= p1) {
      const [p0, t0] = TIMELINE[i - 1];
      return t0 + ((t1 - t0) * (p - p0)) / (p1 - p0);
    }
  }
  return TIMELINE[TIMELINE.length - 1][1];
};
export const avifOk = () =>
  new Promise<boolean>((done) => {
    const img = new Image();
    img.onload = () => done(img.naturalWidth > 0);
    img.onerror = () => done(false);
    img.src = AVIF_PROBE;
  });

/** The frame set for a frame drawn `drawPx` device px wide. */
export const pickSet = (avif: boolean, drawPx: number): FrameSet =>
  !avif || Math.min(window.innerWidth, window.innerHeight) <= 600 ? SETS.m : drawPx > 2000 ? SETS.x : SETS.d;

/** Fetch orders: coarse passes first (a scrub can jump anywhere) or front to back (playback). */
export const coarseToFine = (n: number) => {
  const order: number[] = [];
  const queued = new Uint8Array(n);
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < n; i += step) if (!queued[i]) { queued[i] = 1; order.push(i); }
  }
  return order;
};
export const frontToBack = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * Frames fetched as compressed blobs (small, kept) and decoded into ImageBitmaps only in a window
 * around the current frame: off the main thread, ahead in the direction of travel, and closed again
 * behind it, so big frames play without decode stalls or GBs of memory. `onFrame` fires when a
 * frame decodes. Frame 0 is fetched at once; `fetch(order)` fetches the rest, 6 at a time.
 */
export function frameStore(set: FrameSet, onFrame: () => void) {
  const { n, win } = set;
  const blobs: (Blob | null)[] = new Array(n).fill(null);
  const bmps: (ImageBitmap | null)[] = new Array(n).fill(null);
  const inFlight = new Uint8Array(n);
  const fetched = new Uint8Array(n);
  let alive = true, at = 0, dir = 1, decoding = 0, loaded = 0;

  const decode = () => {
    for (let i = 0; i < n; i++) {
      if (bmps[i] && Math.abs(i - at) > win + 2) {
        bmps[i]!.close();
        bmps[i] = null;
      }
    }
    for (let d = 0; d <= win && decoding < 3; d++) {
      for (const i of d ? [at + d * dir, at - d * dir] : [at]) {
        if (decoding >= 3 || i < 0 || i >= n || bmps[i] || inFlight[i] || !blobs[i]) continue;
        inFlight[i] = 1;
        decoding++;
        createImageBitmap(blobs[i]!).then(
          (b) => {
            inFlight[i] = 0;
            decoding--;
            if (!alive || Math.abs(i - at) > win + 2) b.close();
            else {
              bmps[i] = b;
              onFrame();
            }
            if (alive) decode();
          },
          () => {
            inFlight[i] = 0;
            decoding--;
            blobs[i] = null; // undecodable: don't retry
          },
        );
      }
    }
  };
  const load = (i: number) =>
    fetch(set.dir + String(i).padStart(3, "0") + "." + set.ext)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || !alive) return;
        blobs[i] = b;
        loaded++;
        if (Math.abs(i - at) <= win) decode();
      })
      .catch(() => {});

  let order: number[] = [];
  let next = 0, busy = 0;
  const pump = () => {
    while (alive && busy < 6 && next < order.length) {
      const i = order[next++];
      if (fetched[i]) continue;
      fetched[i] = 1;
      busy++;
      load(i).then(() => { busy--; pump(); });
    }
  };
  fetched[0] = 1;
  load(0);

  return {
    n,
    fetch(o: number[]) {
      order = o;
      next = 0;
      pump();
    },
    /** fetched share of the frames, 0..1 */
    loaded: () => loaded / n,
    /** move the decode window to frame i */
    seek(i: number) {
      if (i === at) return;
      dir = i > at ? 1 : -1;
      at = i;
      decode();
    },
    get: (i: number) => bmps[i],
    nearest(i: number) {
      if (bmps[i]) return i;
      for (let d = 1; d < n; d++) {
        if (i - d >= 0 && bmps[i - d]) return i - d;
        if (i + d < n && bmps[i + d]) return i + d;
      }
      return -1;
    },
    destroy() {
      alive = false;
      for (const b of bmps) b?.close();
    },
  };
}

/**
 * Where the frame sits on a W×H stage (CSS px): cover it, but shrink if that would crop the dome
 * or push it under the captions. Portrait stages ("stacked") centre the dome and the captions as
 * one group, captions right under the dome (capY: where they start).
 */
export function fitFrame(W: number, H: number) {
  const sw = SUBJECT.x1 - SUBJECT.x0, sh = (SUBJECT.y1 - SUBJECT.y0) * AR;
  const stacked = H > W;
  let fw: number, x: number, y: number, capY = 0;
  if (stacked) {
    fw = Math.min(Math.max(W, H / AR), W / sw);
    const top = Math.min(96, H * 0.12); // clear the floating nav
    const g = Math.max(top, top + (H - top - (sh * fw + 24 + 130)) / 2); // group: dome, gap, ~130px of caption
    x = (W - sw * fw) / 2 - SUBJECT.x0 * fw;
    y = g - SUBJECT.y0 * fw * AR;
    capY = Math.round(g + sh * fw + 24);
  } else {
    const capH = Math.min(Math.max(H * 0.18, 110), 200);
    const top = H * 0.03, gut = W * 0.04;
    const aw = W - 2 * gut, ah = H - capH - top;
    fw = Math.min(Math.max(W, H / AR), aw / sw, ah / sh);
    x = gut + (aw - sw * fw) / 2 - SUBJECT.x0 * fw;
    y = top + (ah - sh * fw) / 2 - SUBJECT.y0 * fw * AR;
  }
  const fh = fw * AR;
  if (fw >= W) x = Math.min(0, Math.max(W - fw, x)); // a covering axis never shows an edge
  if (fh >= H) y = Math.min(0, Math.max(H - fh, y));
  return { x, y, w: fw, h: fh, stacked, capY };
}

/** The slow "camera" push-in, around the dome: the frame rect scaled by z. */
export const pushIn = (r: { x: number; y: number; w: number; h: number }, z: number) => {
  const cx = r.x + 0.5 * r.w, cy = r.y + 0.47 * r.h;
  return { x: cx - (cx - r.x) * z, y: cy - (cy - r.y) * z, w: r.w * z, h: r.h * z };
};

const edge = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, BG);
  g.addColorStop(1, BG0);
  ctx.fillStyle = g;
  ctx.fillRect(rx, ry, rw, rh);
};

/** Clears the canvas to the stage colour, draws `a` (blended into `b` by `mix`) at X,Y,w,h in
 *  device px, and feathers any frame edge that sits inside the canvas into the background. */
export function drawFrame(ctx: CanvasRenderingContext2D, a: ImageBitmap, b: ImageBitmap | null, mix: number, X: number, Y: number, w: number, h: number) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.globalAlpha = 1;
  ctx.imageSmoothingQuality = "high"; // resizing the canvas resets this
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(a, X, Y, w, h);
  if (b && mix > 0.004) {
    ctx.globalAlpha = mix; // blend into the next frame: smooth between frames
    ctx.drawImage(b, X, Y, w, h);
    ctx.globalAlpha = 1;
  }
  const fe = Math.min(w, h) * 0.08;
  if (X > 0) edge(ctx, X, 0, X + fe, 0, X, Y, fe, h);
  if (X + w < cw) edge(ctx, X + w, 0, X + w - fe, 0, X + w - fe, Y, fe, h);
  if (Y > 0) edge(ctx, 0, Y, 0, Y + fe, X, Y, w, fe);
  if (Y + h < ch) edge(ctx, 0, Y + h, 0, Y + h - fe, X, Y + h - fe, w, fe);
}

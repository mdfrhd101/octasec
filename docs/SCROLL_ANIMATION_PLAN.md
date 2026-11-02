# Scroll animation — "Denied… then OctaSec gets in"

## Now on the homepage: an autoplay video (2026-11-02)

Everything below this section is the history of the scroll-scrubbed test. What the site runs today:

- `components/filmBoot.ts`: an inline script in the homepage's HTML. It picks a file, fetches all of it at high priority, then
  plays it. A film that is all in memory can't stall, and the script doesn't wait for the JS bundle.
- `components/BreachIntro.tsx`: the stage markup and the mark's flight into the hero's globe once the video ends.
- `breach-scroll.css`: everything on top of the video runs on CSS clocks, so a busy main thread can't make it stutter.
- The video has the old film's speed ramp baked in (4.6 s), so the browser only plays it.

| File | Size | Who gets it | Codec settings |
| --- | --- | --- | --- |
| `film-x.av1.mp4` / `film-x.hevc.mp4` | 1053 / 1684 KB | 2560px: big or high-DPI screens with hardware decoding or 8+ desktop cores (never Firefox) | AV1 CRF 50 / HEVC CRF 32 |
| `film-d.av1.mp4` / `film-d.hevc.mp4` | 647 / 953 KB | 1600px: other computers | AV1 CRF 48 / HEVC CRF 31 |
| `film-m.av1.mp4` / `film-m.hevc.mp4` | 270 / 373 KB | 854px: phones and links around 1 Mbps | AV1 CRF 48 / HEVC CRF 31 |
| `film-s.av1.mp4` / `film-s.hevc.mp4` | 139 / 138 KB | 704px, 24 fps, not sharpened: slow links, down to 256 kbps | AV1 CRF 49 / HEVC CRF 35 |
| `film-m.h264.mp4` | 377 KB | last resort if neither AV1 nor HEVC plays | H.264 CRF 29 |

AV1 is tried first, then HEVC (Safari and iPhones without AV1 hardware), then H.264. If nothing plays, or autoplay is blocked (for
example iOS Low Power Mode), the page goes straight to the hero. All 30 fps except the `s` files, 10-bit except H.264, BT.709,
`hvc1` tag, `moov` first. A file that would take more than 3 s while a smaller one exists is dropped for the smaller one mid-download.

VMAF against the masters, measured as the visitor sees it (old frame sets on the film's clock, with their blending):
old 2560px 85.9, 1600px 84.9, 800px phone 77.3; new `x` 92.1, `d` 91.4, `m` 89.8. The `s` file scores 89.0 against its own
704px source, but on a large screen it is visibly softer than `d`: at 256 kbps there is no way to deliver the sharp file in time.

Slow links: on a slow link (`bxi-slow`) nothing on the page uses the web fonts until the film is done, so they don't compete with
it. At 256 kbps a page load costs about 370 KB before the hero: 28 KB HTML, 47 KB CSS, 148 KB JS, 139 KB film.

Masters and tools, outside the public repo (`D:\AI\media\octasec-scroll-anim\tools\`): `build_film.py` (speed ramp → lossless
master), `film_bench.py` (sharpened sources, VMAF), `film_final.py` (slow encodes), `film_low.py` (the `s` tier), `film_score.py`.

Deploy: nginx needs `mp4` in its cached static types and `media-src 'self' blob:` in the site's CSP (`deploy/nginx.conf`, `deploy/docker/nginx.container.conf`).
With an old CSP the film still plays: the script falls back to the file's URL. Check after deploying: real Safari on a Mac and an iPhone.

---

Status: test build (2026-10-26). The owner's 10-beat storyboard → Gemini images + Veo clips → a
scroll-scrubbed `<canvas>` (scroll down plays forward, scroll up plays backward).
Still open: placement on the site, caption wording.

## What was built (test only, not on the homepage)

- The owner made one 20 s, 720p clip in Gemini (`D:\AI\media\octasec-scroll-anim\`). It follows
  the storyboard up to the octagon. After 9.8 s Gemini's own "logo" turns into messy ribbons and
  isn't the real mark, so the frames stop at 9.72 s.
- The 720p clip looked soft on big screens, so every frame is AI-upscaled 4× with Real-ESRGAN
  General x4v3 (Qualcomm AI Hub ONNX build) on the Snapdragon **NPU** (onnxruntime-qnn, fp16,
  ~7 ms per 128px tile; the CPU managed only 0.25–2 s per tile here), Lanczos to 2560px masters,
  then sharpened (unsharp mask) per set. Tools: `D:\AI\media\octasec-scroll-anim\tools\`
  (`esrgan_upscale.py --npu`, `build_sets.py`); venvs in `D:\dev-tools\esrgan\`.
- Frame sets in `web/public/anim/breach/`, chosen by the size the frame is drawn at:
  `x/` 2560px AVIF (big or high-DPI screens), `d/` 1600px AVIF, `m/` 800px WebP (phones and
  browsers without AVIF), plus `still.webp` for reduced motion. AVIF is 10-bit (no banding in the
  dark glows). Made with the native ARM64 ffmpeg in `D:\dev-cache\ffmpeg\bin` (SVT-AV1).
- Frames are fetched as compressed blobs and decoded to ImageBitmaps only in a window around the
  current frame (ahead in the scroll direction, closed behind it), so 2560px frames scrub
  without decode stalls or gigabytes of memory.
- Deploy check: nginx must serve `.avif` as `image/avif` (the browser sniffs it anyway).
- `web/app/components/BreachScroll.tsx` + `web/app/breach-scroll.css`, shown on the noindex test
  page `/scroll-test/` (not linked, not in the sitemap).
- The real OctaSec mark (BrandMark) fades in exactly over Gemini's octagon (aligned within 1px),
  then settles with the wordmark (`BrandLockup part="word"`), a tagline and the CTA.
- The padlock re-locking in the clip (5.75–6.5 s) is used as the "Then we help you close it" beat.

## Test pages (all noindex, not linked, not in the sitemap)

| Page | What it tries |
| --- | --- |
| `/scroll-test/` | The film as a section (scroll plays it) |
| `/scroll-test/hero-full/` | The film as the hero, headline over its first frame |
| `/scroll-test/hero-right/` | The hero copy beside a film card |
| `/scroll-test/hero-expand/` | A film card that grows to full screen |
| `/scroll-test/intro/` | **Lead-in (the owner's current pick):** the page opens on the film; scrolling plays it; the real hero rises in under it and the logo lands exactly on the hero's Seal Scanner; nav hidden during the film except its ☰ |
| `/scroll-test/intro-autoplay/` | Earlier idea: time-based preloader with a Skip button |

Code: `components/breachFilm.ts` (shared engine), `components/BreachScroll.tsx` (scroll-driven;
`variant="lead"` for the lead-in), `components/BreachIntro.tsx` (autoplay), `breach-scroll.css`.
To put the lead-in on the homepage: `<BreachScroll variant="lead" />` right before `<Hero />` in
`app/page.tsx`. On that page the announcement bar is hidden and the nav floats (fixed) — decide
whether the announcement bar should come back after the film.

## Storyboard (owner)

1 laptop · 2–5 one, two, three, four attacks · 6 access denied · 7 calm laptop ·
8 OctaSec attacks · 9 got access · 10 OctaSec logo appears, laptop disappears

## Rules

- One unbranded laptop in a dark studio. **Camera locked** in every image and clip, so the clips
  join seamlessly; the slow "Apple" push-in is added in code.
- **No text or logos** in any image or clip. Captions and the real OctaSec logo
  (`web/app/components/BrandMark.tsx`) are HTML/SVG drawn on top.
- Colour roles: other attacks = cold blue-white · OctaSec = red `#e8433a` (red team) ·
  verified = green `#006A4E`.
- The laptop and its dome sit in the centre half of the frame (phones crop to the centre).
- Every image after F1 is an **edit of the previous image** (upload it with the prompt), so the
  laptop never changes.
- Raw images and clips live in `D:\AI\media\octasec-scroll-anim\`, never in this public repo.
  Only the optimized WebP frames go under `web/public/`.

## Images (Gemini · Nano Banana)

Download full-size originals. Name them F01 … F10.

**F01 — laptop** (new chat)

> Create a photorealistic premium product image, 16:9 landscape. One modern unbranded laptop with
> a dark graphite aluminium body (no logos) stands open in the centre of a deep near-black navy
> studio (#0b0f14). Three-quarter front view from slightly above, screen angled toward the camera.
> The laptop and the space around it take up only the central half of the frame, with plenty of
> empty dark space on all sides. The screen is dark and shows one softly glowing white padlock icon
> (closed) in the middle. Around the laptop is an almost invisible glass dome shield made of a fine
> hexagon pattern, catching only a faint cool edge light. Soft cool rim light, subtle floor
> reflection, sharp focus everywhere, calm and minimal, Apple-keynote style. No text, letters,
> numbers, logos, people, particles, film grain or lens flare.

**F02 — 1 attack** (upload F01)

> Edit this image. Keep everything exactly the same: laptop, camera angle, framing, lighting, dome.
> Add one thin beam of cold blue-white light coming from the upper-left edge of the frame and
> hitting the dome; where it hits, a small bright ripple spreads across the hexagon pattern.
> No text.

**F03 — 2 attacks** (upload F02)

> Edit this image. Keep everything exactly the same, including the first beam. Add a second,
> similar blue-white beam from the right edge, hitting the right side of the dome with its own
> small ripple. No text.

**F04 — 3 attacks** (upload F03)

> Edit this image. Keep everything exactly the same, including both beams. Add a third blue-white
> beam from the lower-left corner, hitting the lower-left of the dome with a small ripple. No text.

**F05 — 4 attacks** (upload F04)

> Edit this image. Keep everything exactly the same, including all three beams. Add a fourth
> blue-white beam from the upper-right corner, hitting near the top of the dome. The whole dome
> now glows slightly brighter. No text.

**F06 — access denied** (upload F05)

> Edit this image. Keep the laptop, camera, framing and lighting exactly the same. All four beams
> have shattered into short bursts of cold sparks right at the dome surface; the whole hexagon dome
> flashes bright blue-white, clearly blocking them. The padlock on the screen is still closed and
> glows a little brighter. No text.

**F07 — calm again:** reuse F01 (no new image).

**F08 — OctaSec attacks** (upload F01)

> Edit this image. Keep everything exactly the same. Add one very thin, precise thread of red light
> (#e8433a) entering from the left edge. Instead of hitting the dome head-on, it slips through a
> tiny gap between two hexagon tiles, bends gently and touches three small points on the laptop
> (the hinge, the keyboard, the edge of the screen), each point glowing red like a link in a chain,
> and ends at the padlock. The padlock is still closed. No text.

**F09 — got access** (upload F08)

> Edit this image. Keep everything exactly the same, including the red thread. Change only this:
> the padlock on the screen is now open (shackle lifted), and the screen glows a rich deep green
> (#006A4E), spilling soft green light onto the keyboard. The hexagon tiles where the thread passed
> have parted slightly. No text.

**F10 — end** (upload F09)

> Edit this image. Same dark studio, camera and lighting, but the laptop, the dome and the thread
> are completely gone. The stage is empty except for a soft, faint red glow (#e8433a) shaped like
> an octagon in the exact centre. No logo, no text.

## Clips (Veo)

Best: Google Flow → Frames to Video (start + end image). If the tool takes only one image, upload
the start image. Any length is fine; the clips get trimmed when the frames are extracted.
Name them V1 … V9.

| Clip | Start → end | Prompt |
| --- | --- | --- |
| V1 | F01 → F02 | A thin blue-white beam shoots in from the upper left and hits the glass dome; a small ripple spreads. |
| V2 | F02 → F03 | A second beam shoots in from the right and hits the dome; the first beam keeps pressing. |
| V3 | F03 → F04 | A third beam from the lower left hits the dome. |
| V4 | F04 → F05 | A fourth beam from the upper right hits the dome; the dome glows brighter. |
| V5 | F05 → F06 | All four beams shatter into sparks against the dome; the dome flashes; the padlock stays locked. |
| V6 | F06 → F01 | The sparks fade and the dome dims back to almost invisible; everything becomes calm. |
| V7 | F01 → F08 | A thin red thread of light slips in from the left through a tiny gap in the dome and touches the hinge, the keyboard and the screen edge one by one, ending at the padlock. |
| V8 | F08 → F09 | The padlock clicks open and the screen fills with deep green light. |
| V9 | F09 → F10 | The laptop, dome and thread dissolve into fine glowing dust that drifts inward and fades into a soft red octagon glow in the centre. |

Every clip prompt ends with: *Static locked-off camera, no camera movement, no zoom, no cuts. Keep
everything else exactly as in the image. Smooth, steady motion. No text, letters, logos or people.
16:9, 1080p.*

## Scroll map and captions (as built in the test; wording still needs the owner's OK)

Set in `BreachScroll.tsx` (`TIMELINE` maps scroll to clip time, `BEATS` holds the captions).

| Scroll | Clip time | Caption (HTML) |
| --- | --- | --- |
| 0–10% | 0–0.9 s | 01 · The target: Your app. Scanned, patched, shielded. |
| 10–27% | 0.9–3.2 s | 02 · The usual attacks: Bots. Brute force. Known CVEs. |
| 27–34% | 3.2–3.8 s | 03 · Blocked: Access denied. |
| 34–41% | 3.8–4.1 s | 04 · All quiet: So you're safe? |
| 41–51% | 4.1–5.1 s | 05 · OctaSec: We find the path scanners miss. |
| 51–60% | 5.1–5.8 s | 06 · Proof: Access proven. Human-verified. |
| 60–70% | 5.8–7.3 s | 07 · The fix: Then we help you close it. |
| 70–85% | 7.3–9.72 s | (none: red smoke, the laptop dissolves into Gemini's octagon) |
| 85–100% | hold | Real OctaSec mark over the octagon, then wordmark · "Find it before attackers do." · Book a scoping call |

## Frame budget

The 10 images are only keyframes. The animation frames are taken from the clips (each clip is
about 8 s × 24 fps). Busy moments get more frames:

| Clip | V1 | V2 | V3 | V4 | V5 | V6 | V7 | V8 | V9 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop (1600px) | 16 | 16 | 16 | 16 | 20 | 12 | 28 | 20 | 24 | 168 |
| Phone (800px) | 8 | 8 | 8 | 8 | 10 | 6 | 14 | 10 | 12 | 84 |

- WebP, 3–6 MB in total.
- The canvas blends each frame with the next one by scroll position, so motion stays smooth
  between frames in both directions.
- Clip joins: clips made with start + end images (Flow) match exactly. Start-only clips get a
  cross-fade of about 6 frames at each join.

## Build notes

- Tall section with a `position:sticky` canvas; one requestAnimationFrame loop with a light lerp
  (the CursorCard/CursorFX pattern); cover-fit; devicePixelRatio capped at 2.
- First frame loads immediately; the rest load when the section nears the viewport
  (IntersectionObserver).
- `prefers-reduced-motion`: one still (F09) with the captions as a plain list.

## Main site (2026-10-26)

The owner changed the brief after approving the scroll-driven lead-in. The homepage now uses the **autoplay intro**, not the scroll version:

- `components/BreachIntro.tsx` is used with `once={false}`.
- It plays full screen on every page load, and a reload plays it again. It does not play on in-site navigation, and never again on scroll.
- Its length is about 6.5 s (the owner settled on 6–7 s, after trying 5–6, 8–10 and 10–12 s): `PLAY` 4.6 s, `FLY` 0.95 s, `LAND` 0.45 s. On a slow network or device it skips frames rather than running long (`MAX_LAG`, 0.8 s). Firefox draws it lighter: a 1× canvas, 30 draws a second, no blend between frames.
- At the end the mark lands on the hero's seal and the hero appears.
- No visible Skip button (owner: `skipButton={false}`). It can still be skipped with Esc, Enter, Space, a click, the wheel or a swipe.
- It is off under reduced motion and without JavaScript.
- Verified in headless Chrome:
  - desktop, phone and dark mode finished in 5.7–6.0 s at the 5.5 s timing; re-verified at 9 s, see the activity log;
  - the mark lands exactly on the seal (0 px off, 0.735 × its width);
  - no replay on scroll; a reload replays it;
  - Skip finishes 1.3 s after the click;
  - reduced motion downloads no frames.
- The main site doesn't ship `BreachScroll.tsx`, the scroll version; the test worktree keeps it.
- `breachFilm.ts` (the engine) and `breach-scroll.css` (`.bx*`/`.bxi*`, shared) are shipped.
- Open:
  - captions: hidden on the main site (owner: `captions={false}`, no text over the film). The test pages still show them; the wording needs the owner's OK if they ever come back;
  - deploy: check that nginx's `mime.types` maps `avif` to `image/avif`.

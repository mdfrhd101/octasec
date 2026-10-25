---
title: "PHP2Shell: Expectation vs Reality — Everyone's Vulnerable, Almost Nobody's Exploitable (Yet)"
slug: php2shell-expectation-vs-reality
description: "CVE-2026-109618 and CVE-2026-109619 give pre-auth RCE in PHP core. We reproduced the best public exploits 3/3 — then hit five walls between Docker and the internet. Here's what actually fires on production."
date: 2026-10-22
tags: [php2shell, CVE-2026-109618, CVE-2026-109619, RCE, research, field-report]
author: OctaSec Research
---

# PHP2Shell: Expectation vs Reality — Everyone's Vulnerable, Almost Nobody's Exploitable (Yet)

**A field report on CVE-2026-109618 / CVE-2026-109619 — what the headlines promised, what the lab proved, and what actually fires on production servers.**

When the PHP2Shell disclosure dropped on October 20, 2026, the numbers were terrifying: a CVSS 4.0 **9.2** pre-auth RCE in PHP core, present since **5.4.0 (2012)**, demonstrated against stock WordPress, Drupal, Joomla, Magento and Laravel. "Every PHP site on the internet" was the ambient temperature of security Twitter that week.

At OctaSec we do one thing with claims like that: we try to break real systems with them — in our labs first, then against what we're authorized to touch. So we reproduced the best public exploit, verified the follow-ups, and then mapped, one by one, the distance between a stock Docker container and a hardened production host.

That distance turned out to be the entire story.

## TL;DR

- PHP2Shell is **real, critical, and pervasive**. Fixed in 8.2.35 / 8.3.36 / 8.4.27 / 8.5.12 (Oct 21, 2026). PHP ≤ 8.1 gets **no official fix, ever**.
- The public demos are **genuine** — we reproduced the best one at **3/3, ~10 seconds per run**. But they run against stock Docker images, and stock Docker images are an unusually soft target.
- Against a large, authorized estate of hundreds of live production PHP hosts, our result was an **honest negative**: zero RCEs — not because the bugs aren't there, but because every public chain needs at least one precondition real deployments don't provide.
- In-the-wild exploitation is already happening — but only with the **simplest chain** (session poisoning + LFI), not the memory-corruption chains making headlines.
- We built a **safe, non-destructive patch oracle** (~300 bytes, one request) so defenders can verify exposure without crashing their own workers.

## The bugs, in plain English

Both CVEs live in code that runs **before your application does**. When PHP receives a `multipart/form-data` request — any file upload form — it parses the body inside `php_request_startup()`, before the target script's first line executes. A legacy feature, `session.upload_progress` (on by default since PHP 5.4), initializes **session machinery in that pre-boot window** to track upload progress.

That single design decision creates the entire attack surface:

| CVE | Official title | Plain English |
|---|---|---|
| **CVE-2026-109618** (GHSA-w8hw-w9fx-j79w) | RCE via OOM corruption | A request hits the memory limit; PHP's error handling escapes mid-bookkeeping, leaving half-built structures behind. Request shutdown later treats garbage as live data. |
| **CVE-2026-109619** (GHSA-6wmf-4rv5-p3rp) | RCE via stale global state | Worker globals keep pointing at freed memory. The **next request** on the same worker touches those dangling pointers before re-initialization. |

Why this is worse than a typical web bug: the trigger is **any multipart POST to any PHP script**. The application doesn't need an upload form, doesn't need `session_start()`, doesn't need to be buggy. A page containing only `<?php echo "OK";` is a valid target.

> **Attribution note:** found by Ryan Austin (Calif) with GPT-5.6, independently by Wiz Research, with OpenAI coordinating. Be aware that Wiz/Sansec file the sub-bugs under the **opposite** CVE numbers than PHP's own advisories — half the internet has the mapping swapped. PHP's advisories are authoritative.

## The disclosure storm

Details leaked ~18 hours before the patch. Within 48 hours we counted **338 public GitHub repos** referencing the CVEs. We surveyed all of them and deep-read roughly 50:

- **~40%** — same-day AI-generated noise (banner checkers, "PoCs" that test nothing)
- **~25%** — mitigation scripts, patched Docker images, EOL backports
- **~20%** — detection content (Suricata/Sigma/YARA/Zeek, nuclei templates)
- **~10%** — honest lab reproductions of the app-assisted chains
- **A handful** — genuinely novel exploitation engineering

**Junk warning:** at least one "mass exploit" repo is Telegram-group bait with no code, and several high-star PoCs implement a mechanism (`post_bytes_processed` UAF) that multiple independent labs — and our own source read — could not reproduce. Stars ≠ correctness, especially this week.

## What we reproduced in the lab

All labs are Docker: official `php:*-apache` images, FPM builds of 8.2.34, a from-source 8.4.27, and legacy builds of 5.6 / 7.4 / 8.0 / 8.1.

| Chain | Lab result |
|---|---|
| **Zero-precondition RCE** (mod_php, 8.4.26) | ✅ **3/3**, `uid=33(www-data)` proof each run, ~10s. Leaks heap + libphp base through `Set-Cookie: PHPSESSID` (Heartbleed-style OOB read), then a forged HashTable whose destructor pointer is `zif_system` — PHP's own session teardown calls it |
| **52× memory amplification** | ✅ our own bisection on a 128M target: 2.28 MB body → HTTP 200; **2.57 MB → OOM**. Matches the published 52.3× threshold exactly |
| **Content-Type separator WAF bypass** | ✅ `multipart/form-data, boundary=X` parses fully and engages upload-progress; defeats Content-Type-anchored rules |
| **Chain A** (session poisoning + LFI) | ✅ end-to-end RCE on PHP 5.6 → 8.2.34; **still works on patched 8.4.27** — it's an unpatched by-design weakness, not one of the CVEs |
| **Chain C** (serialize-handler mismatch → `__destruct`) | ✅ end-to-end RCE on 5.6 → 8.2.34; also survives the patch |
| **109619 pre-RINIT `__wakeup`** | ✅ reproduced on 7.4+ (needs opcache preload or an app-resolvable class) |
| **109618 OOM corruption** | ✅ worker-kill corruption confirmed; weaponized form classified DoS-class and gated |
| **display_errors=Off leak chain** | ⚠️ the **leak works with display_errors off** (chunk + libphp base recovered) — the fire stage did not survive a rebuild (see Wall 5) |
| **Warning-count patch oracle** | ✅ 8.2.34 → 3 warnings (vulnerable), 8.4.27 → 2 warnings (patched), 100% separation in our A/B |

## Docker vs Reality: the five walls

This is the part no headline wrote down. Every "RCE confirmed!" demo this week ran against **stock official Docker images** — Apache prefork + mod_php, `display_errors=On`, a tiny `memory_limit`, a single worker. Production is none of those things. Here is each wall, with the evidence.

### Wall 1 — SAPI: mod_php vs PHP-FPM

The memory-corruption chains depend on **per-process continuity**: request A leaves a dangling pointer, request B must land on the *same process* to consume it, and after a worker crash the replacement must inherit the *same memory layout* (that's how the ASLR bypass works — a re-forked prefork child shares the master's address space).

- **Apache prefork + mod_php** satisfies all of this. The demonstrated RCE completes *before application code*, on default settings.
- **PHP-FPM** kills the child on request-startup failure — the corrupted state dies with it. The official 109619 advisory confirms an FPM RCE path exists, but it is **application-assisted**. No public zero-app-precondition FPM chain exists as of writing.
- **The awkward part:** most modern production PHP is FPM behind nginx, and you often **cannot tell from outside** — `expose_php=Off` and header hygiene hide the SAPI. Several of our real targets were "Apache" in the banner with the SAPI genuinely undeterminable passively.

### Wall 2 — `display_errors`

The main chain's first-stage leak is bootstrapped by a `max_input_vars` **warning** (it sets `headers_sent`, which changes cookie behavior the leak relies on). Flip `display_errors=Off` — as every production hardening guide demands — and the chain dies at stage 1. We verified: 3/3 → 0/3.

A follow-up chain removes this dependency *for the leak* (we verified the display_errors=Off leak returns both base addresses) — but see Wall 5 for why that doesn't yet equal RCE.

### Wall 3 — `memory_limit` (the wall that fell during our research)

The original demos OOM a tiny 8M limit with a 12 MB body. Production runs 128M+, and a 12 MB body barely dents it — verified: the chain fails 3/3 at 128M.

Then the amplification landed: PHP places **no limit on the number of headers per multipart part**, and each duplicate ~6-byte header costs real allocations. A **2.57 MB** wire body — comfortably under the default 8M `post_max_size` — exhausts a 128M heap. We verified this independently. **This wall is gone.** The limiting factor is now `post_max_size`, and most defaults allow the attack body.

### Wall 4 — worker count / affinity

The chain's request pairs must hit the **same child process**. Single-worker prefork (the lab default) makes this trivial. Production runs tens to hundreds of workers behind a load balancer that round-robins connections. We verified: raising the lab to 4 workers took the exploit from 3/3 to 0/3. Beating this needs worker-affinity tricks (connection reuse, keep-alive pinning, timing under low load) — solvable in principle, unsolved in public code.

### Wall 5 — per-build offsets, and the reproducibility tax

Every stage of the weaponized chains is calibrated to a specific libphp.so **build**: symbol offsets, heap geometry constants, grooming counts. The better repos auto-extract offsets — **from the container's own libphp**, which you only have if you already control the box. Against a remote unknown build you need the right offsets database.

And builds drift in ways that will bite you: we rebuilt one of the best public chains from its own Dockerfile and the fire stage **stopped working**, because the Dockerfile's base image is **unpinned** — today's image has a different libphp layout than the author's validated one. The leak survived; the execution didn't.

> **If you reproduce anything from this week, pin your base images by digest.**

### Bonus wall — the edge

Before PHP ever sees your request: Cloudflare deployed managed rules **9 hours before disclosure** (including its first-ever *response-side* blocking rule), Fastly and others followed. We additionally found targets whose edge WAF **rejects all multipart bodies outright** — which kills every chain in this report before it starts.

## The application-assisted chains have their own reality problems

The "simpler" chains (session poisoning + LFI, handler mismatch, pre-RINIT unserialize) don't need heap magic — they need **application features**, and those turned out to be just as rare in the wild:

- **Chain A (poison + LFI)** needs an LFI/include sink. On a 16-host sample of legacy production sites (native sessions, multipart accepted, PHP 5.4–8.1 — perfectly conditioned otherwise), we found **zero** usable LFI sinks: the dominant stacks are template-deployed SaaS apps whose public controllers are DB-driven with whitelisted parameters, and several hosts run mod_security that 403s traversal and `php://` on sight.
- **Modern frameworks starve the session chains entirely**: Laravel/Symfony-class apps don't use native `PHPSESSID` sessions, so there is nothing to fixate or poison through this path.
- **Chain C** needs two directories with *different* `session.serialize_handler` sharing one save path — a misconfiguration that template-deployed single apps simply don't have.
- **109619's pre-RINIT chain** needs a session-planting feature plus a class resolvable before RINIT — again, app-dependent.

The pattern: **the bugs are in PHP core, but every public exploit path still needs one property from the target** — the right SAPI, the right ini, the right worker topology, or the right application feature. "Any PHP page is exploitable" is true exactly as long as those stars align.

## Real-world testing: the honest negative

This is where our methodology matters. Against a national-scale estate we are authorized to test (hundreds of live production PHP hosts), we ran a two-phase assessment:

1. **Passive sweep** (500 hosts): banner/session/framework fingerprinting, multipart reachability, SAPI tells. **53 hosts** came out "conditioned" (vulnerable version + native sessions + multipart reaches the PHP parser).
2. **Targeted hunting** (16 of the most conditioned, ~115 benign requests total — no DoS shapes, no uploads, no worker-killing): map the app surface, look for the one missing precondition per chain.

**Result: zero RCEs.** Not because the targets are patched — nearly all run EOL PHP that will *never* be patched — but because each host was missing exactly one link: the LFI sink, the handler mismatch, the plantable class, or (for the OOM chains) an acceptable way to fire worker-killing traffic at a live public service, which we do not do.

The closest real-world matches to the "ideal victim" profile — an EOL mod_php stack with native sessions and upload-progress provably initializing pre-RINIT (verifiable with two benign requests) — do exist in the estate. They remain one authorized maintenance window away from a definitive test, because the only chains that would settle the question kill workers by design.

**Expectation:** 9.2 CVSS, "every PHP site RCE'd tonight."
**Reality:** pervasive latent vulnerability, a working exploit class that is genuinely configuration-gated, and a defensive window measured in how long it takes exploit authors to solve worker affinity and per-build calibration — not in whether the bug is real.

## What attackers are actually doing

Honeypot telemetry (VulnCheck canaries, Cloudflare, watchTowr) tells a consistent story:

- Attacks began **07:43 UTC on Oct 21** — seven hours before the patch.
- The **only** weaponized chain observed firing in the wild so far is the simplest one: **session poisoning + LFI readback** — a multipart POST planting `<?php … system($_GET['c']) …?>` into a session file via a raw upload filename, followed by LFI attempts to include it.
  - **IOCs:** webshell prefix `PWNED::`, multipart boundary `------p2s9rdme2st6guc9g0rafic`
- The rest of the traffic is scanning and fingerprinting.
- **Nobody** — researchers included — has published a verified RCE against a named, real production target with the memory-corruption chains.

Interpretation: the threat this week is not an unstoppable heap-corruption worm; it's the boring chain pointed at the long tail of legacy apps with file-include sinks — plus a fast-maturing exploit ecosystem that will get there.

## Check your own servers — safely

A worrying trend this week: "detector" scanners that verify the bug by **crashing your workers**. Do not run random PoCs against production; some are DoS by construction (and a few are outright malware-bait).

Safe options:

1. **Version check** (necessary, not sufficient): anything below 8.2.35 / 8.3.36 / 8.4.27 / 8.5.12 is vulnerable; ≤8.1 has no fix coming. Remember CLI version ≠ web SAPI version, and distro backports can lie in banners.
2. **Warning-count differential oracle** (our favorite): one ~300-byte multipart POST with an invalid session id. Unpatched PHP emits **3** session warnings; patched emits **2**. Requires `display_errors=On` to be observable; benign and worker-safe. We validated 100% separation across vulnerable/fixed builds.
3. **Log review** for the exploitation shape: `Allowed memory size … in Unknown on line 0` bursts, Apache `AH00052` child segfaults followed by one slow request, oversized or malformed `PHPSESSID` cookies, multipart bodies containing `PHP_SESSION_UPLOAD_PROGRESS` from clients with no upload UI.

## Defense that actually works (and what doesn't)

**The only complete fix: patch PHP.** 8.2.35 / 8.3.36 / 8.4.27 / 8.5.12. Note that 8.1 and older will never get one — community backports exist (including prebuilt guard extensions for 5.6–8.5) but audit before trusting.

If you can't patch yet:

| Mitigation | Verdict |
|---|---|
| `session.upload_progress.enabled = 0` | **Partial** — closes the 109619 session path, does **not** touch 109618's OOM corruption |
| `memory_limit = -1` (admin-enforced) | Removes the OOM trigger; watch host RAM. PHP releng: "INI settings alone won't protect you" |
| Block all `multipart/form-data` at the web server | Effective but breaks legitimate uploads; test checkout/admin flows |
| WAF rules (Cloudflare/Fastly/ModSecurity packs) | Good stopgap; already being mutated around — the `, boundary=` separator bypass defeats Content-Type-anchored rules; cloud body-inspection windows (8–128 KB) can be padded past |
| `display_errors=Off`, `session.use_strict_mode=On`, `@`-suppression | **Not mitigations** for these bugs |
| RLIMIT_AS/RLIMIT_DATA as a "sandbox" | **Actively harmful** — they *cause* the mmap failures this bug feeds on |
| FPM instead of mod_php | Raises the bar (no public zero-precondition FPM chain) but is not a fix — the 109619 FPM path is officially validated |
| Take the host read-only/offline | What PHP core devs themselves recommended pre-patch; several large public-sector operators did exactly that |

Detection content worth deploying: Snort SIDs 67359/67360/67375 (Talos), abstract.security's ModSecurity/Suricata pack, Corelight's Zeek notices (`PHP_Crash_Sequence`, `Multipart_Header_Flood`), and any alert on **web workers spawning shells** — the one signal every post-exploitation path shares.

One more reason to patch even if you feel well-configured: independent researchers have demonstrated that **app-assisted primitives survive the patch** (a `var_destroy` reentrancy UAF reproduced on 8.4.27; handler-mismatch and raw-filename session injection are unpatched by design). Patching closes the worst door, not every door.

## Conclusions

1. **The vulnerability is as bad as advertised; the exploitation is not (yet) as easy as advertised.** PHP2Shell is a genuine pre-auth RCE class in PHP core, present for 14 years, with the worst paths gated behind target configuration rather than target code.
2. **"Works on the official Docker image" proved to be a weak proxy for "works on the internet."** Stock images are prefork mod_php with demo-friendly ini; production is FPM, display_errors off, big memory limits, many workers, and a WAF. Each of those is a wall; we measured every one of them.
3. **The walls are falling in order.** During our research window alone, the memory_limit wall fell (52× amplification, verified) and the display_errors wall cracked (leak stage, verified). Worker affinity and per-build remote calibration are the two that remain — both are engineering problems, not fundamental barriers.
4. **The ecosystem is fast and noisy.** 338 repos in 48 hours, ~40% AI-generated, several confidently wrong. Verify against source, distrust stars, and pin your lab images by digest.
5. **Defense-in-depth actually matters here.** The patched version, a WAF with full-body inspection, FPM topology, and behavioral detection each remove different links of every known chain.

---

*All reproductions were performed in self-hosted Docker labs. Real-target assessment was limited to benign, non-destructive probes on systems covered by an authorized testing scope; no availability-affecting techniques were used against production hosts. Original research: Ryan Austin (Calif), Wiz Research, OpenAI; coordinated fix by the PHP security team. Telemetry: VulnCheck, Cloudflare, watchTowr, Sansec, Patchstack. Official advisories: GHSA-w8hw-w9fx-j79w, GHSA-6wmf-4rv5-p3rp; CERT-EU 2026-018.*

---

**Running PHP you can't upgrade?** OctaSec offers fixed-price [emergency PHP2Shell hardening](/php2shell/) — $10 per site, $100 per server (up to 100 sites), including EOL versions 5.6–8.1 — verified before and after with the non-destructive oracle described in this post.

---
title: "How AI Agents Actually Fail at Pentesting: A Failure-Mode Taxonomy"
description: "We autopsied eight benchmark applications that defeated strong models. The failures weren't knowledge gaps — they were decision-point failures. Here's the taxonomy and the fixes."
date: 2026-10-18
tags: [research, agents, engineering, benchmarks]
slug: agent-failure-modes
---

# How AI Agents Actually Fail at Pentesting: A Failure-Mode Taxonomy

Everyone building agentic security tools measures what their system solves. We recently did the opposite: a transcript-level autopsy of eight deliberately vulnerable applications — from our private, uncontaminated APEX benchmark — that defeated every local model we threw at them, while a frontier worker engine solved all eight. We read both sides of every run, the winning transcripts and the losing ones, classified every failure, and turned the results into training data and harness patches.

This post is the taxonomy. If you build or buy agentic security tooling, these are the failure modes to ask about — because they are not the ones vendors advertise.

## The setup

Eight applications, all solved by a frontier worker engine operating solo. All eight resisted three different local models under identical conditions: airlocked (no web access), black-box (HTTP only), a 35-step budget, no hints. The losing models were not weak — the strongest of them solves 12 of 20 comparable applications on our recall benchmark. So the question was precise: *what, exactly, did the winners do that the losers didn't?*

We classified each failure into four classes:

- **(a) Coverage** — never found the vulnerable surface.
- **(b) Reasoning** — found the surface, chose the wrong exploitation path.
- **(c) Execution** — right path, died on mechanics, loops, or budget.
- **(d) Information** — needed knowledge the airlock blocks.

The result was lopsided, and it's the most important finding in this post: **class (a) was primary nowhere, and class (d) was zero.** In all eight failures, the losing model located the vulnerable component within its first few steps. Everything it needed was derivable from target behavior. The failures happened *after* discovery, at decision points.

**Class (b) — found the surface, took the wrong path — dominated: primary in six of eight cases, present as substrate in a seventh.**

## The three micro-patterns that actually kill hunts

### 1. "Fetch failed" is not "blocked"

On an SSRF target, the losing model sprayed loopback representations — `127.0.0.1`, `localhost`, decimal and hex forms — against the wrong internal port for eighteen steps. Every probe returned "fetch failed," and the model read that as *the filter blocks loopback*. It wasn't a filter verdict; it was a connection error. Nothing was listening on that port.

The winning engine asked the next question: what else is on this machine's network, and does the filter check resolved addresses at all? It confirmed the filter ignored hostnames via a self-fetch on the app's real internal port, then swept the private address space *through the SSRF itself*, using response differentials as the oracle — and found the internal admin API.

The lesson generalizes brutally: agents systematically misread transport errors as policy verdicts. An error from the network layer is not an answer from the application layer. Our harness now forces the distinction — a probe that fails to connect is labeled *inconclusive*, never *denied*.

### 2. Decoy fields win by default

On a prototype-pollution target, the application offered a configuration field literally named `command`. The losing model spent nineteen consecutive steps trying to turn it into command injection despite uniform negative evidence — and when it finally reached for the right vulnerability class, it only knew the textbook top-level form, which the sanitizer strips. The actual bug was one nesting level down.

This was the pattern across multiple autopsies: an application surface that *looks* exploitable in an obvious way absorbs the entire budget. The fix is an explicit reflex, not more knowledge: **after N attempts against uniform negative evidence, treat the feature as a decoy and re-derive the attack surface from the architecture.** In that same target, the documented export routes returned permanent 404s — a signal the winning engine read correctly: the published index is a decoy; fuzz the undocumented siblings.

### 3. Primitive inventory amnesia

The most frustrating near-miss: a target requiring a two-primitive chain — an XXE in a document parser to read credentials, plus an SSRF in a video processor to reach an internal object store. The losing model independently found *both* primitives, and even recovered the internal storage hostname from the process environment. Then it tried to reach storage through the XXE (whose HTTP fetching was neutered), concluded "storage isn't accessible," and never once pointed its own working SSRF at the host it had already named.

Every piece was in hand. The missed move was the cross-product: *when primitive A hits a wall, enumerate primitive A × primitive B before writing anything off.* The winning engine fetched the storage service's root through the SSRF, read its own authentication instructions off the response, and chained the two primitives in four requests.

## The loop disease

Underneath the reasoning failures sits a behavioral one we now track as its own defect class: **byte-identical repetition loops**. On one target, roughly 60% of the entire step budget went to re-fetching the same five API responses the model already had in context. In a recall benchmark of twenty applications, transcripts showed the final 5–9 steps of failed runs burned on verbatim retries against negative evidence — the model polishing a dead hypothesis instead of switching angles.

Fine-tuning against naive "stop repeating" signals only mutates the disease — verbal repetition loops became command-family loops, different spelling, same dead end. What works is *pivot-to-what* training: pairs that don't just punish repetition but demonstrate the structural move to make instead. Two of the eight autopsied applications are now winnable purely from this training signal; most of the rest need it as a prerequisite.

Alongside the weights, a deterministic harness guard: hash each command's family and target; on the third repetition, interrupt with the recorded output and a demand — *state what new hypothesis requires this probe, or switch angles.* This isn't a suggestion in a prompt. It's machinery.

## Why you can't fix this with a bigger prompt

The industry's default response to "the model lacks technique" is to stuff a skills digest into the context window. We measured that move directly, on the recall benchmark, same model, identical conditions:

| Configuration | Solved |
|---|---|
| Large reasoning model, clean context | 12 / 20 |
| Same model + ~2,900-token skills digest | **7 / 20** |

A net loss of five solves. On the eight autopsied applications, the digest changed almost nothing — identical wrong strategies, sometimes *deeper* into the wrong family. The failures were never "the model hasn't seen the technique." They were decision-point failures, and in-context text does not fix decision points. Context is a finite attention budget; a static digest mostly displaces working memory the hunt needs.

Our doctrine, stated plainly: expertise goes **into weights** (fine-tuning and preference training on exactly these failure pairs), **into deterministic machinery** (loop guards, route oracles, scope enforcement), or **into just-in-time retrieval** (the one relevant skill, surfaced when the observed stack calls for it). Never into a static mega-digest.

## What this means if you're evaluating us — or anyone

Three questions cut through the marketing:

1. **What happens at a decision point?** Ask how the system behaves after N consecutive failures on one hypothesis. If the answer is "the model figures it out," you're looking at the loop disease with extra steps.
2. **Where does expertise live?** Prompt-stuffed playbooks measurably hurt. Weights, machinery, or just-in-time retrieval are the only answers with evidence behind them.
3. **Can I see a failure autopsy?** We publish ours. A vendor who can't show you a losing transcript hasn't read one.

The ceiling on agentic pentesting today is not knowledge and not coverage. It's judgment at decision points under negative evidence — and that is an engineering problem with engineering solutions. That's the work.

---

*The benchmark conditions and full ladder behind these numbers: [octasec.ai/benchmarks](/benchmarks). The verification layer that catches what reasoning misses: [how we verify](/blog/how-we-verify).*

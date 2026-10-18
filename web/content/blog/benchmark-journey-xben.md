---
title: "The Benchmark Journey: What 104 Deliberately Vulnerable Apps Taught Us"
description: "Expectations vs reality on a public pentest benchmark — why orchestration beat model quality, what the last 15% looks like, and the numbers we insist you read with caveats."
date: 2026-10-18
tags: [benchmarks, methodology, research]
slug: benchmark-journey-xben
---

# The Benchmark Journey: What 104 Deliberately Vulnerable Apps Taught Us

We recently ran OctaSec against XBEN-104, the public validation suite used in published autonomous-agent research: 104 deliberately vulnerable web applications, each holding a flag to capture. This is the honest version of what happened — including the parts most benchmark posts leave out.

## The numbers, with their conditions

| Configuration | Solved | Rate |
|---|---|---|
| Best single engine, first pass, no hints | 92 / 103 | 89.3% |
| Second engine, first pass, no hints | 78 / 103 | 75.7% |
| **Combined system, airlocked capability score** | **100 / 103** | **97.1%** |
| **Combined system, full research pipeline** | **103 / 103** | **100%** |

Every flag was verified byte-identical against independently recomputed ground truth. One challenge is excluded from the denominator because we proved — by auditing it — that it ships broken: the flag is never injected into the running container. It cannot be solved as built.

The conditions matter more than the numbers, so here they are:

- **Black-box.** HTTP interaction only. No source access, no container inspection.
- **Airlocked.** Web search and external fetches were disabled at the harness level, not by instruction. No writeups, no CVE lookups, no sibling-challenge leakage.
- **Self-navigation.** The agents were told the flag format and that exactly one vulnerability class exists per app. They were not told which one.
- **Verified.** Flags were recomputed from ground truth independently of agent output. An agent claiming success was never the evidence.

We state these explicitly because public leaderboards for this suite mix conditions wildly. Published scores on it range from white-box runs (the agent is given full source), to hint-conditioned runs (the vulnerability category is handed over), to self-reported figures nobody has replicated. The strongest *independently reproducible* baseline under strict black-box, no-hint conditions was roughly 80% going in.

## Expectations vs. reality

**What we expected:** a story about model quality.

**What we got:** a story about systems engineering.

First passes landed at 75.7% and 89.3% per engine — strong, but short of the goal. Every point after that came from the harness, not from smarter models:

- **Fresh-context retries with failure history: +9 conversions.** Same model, same targets, same tools — but a clean context plus a journal of what already failed. This was the single biggest lever we measured, and it matches published research showing that retries *inside* a failed context have dramatically higher error rates than clean restarts.
- **Scope-corrected briefs: +3 conversions, immediately.** Our solvability audit of the hardest holdouts found one target publishing a **second port** our task briefs never mentioned, and another exposing an internal service our briefs never made reachable-in-scope. The hunters weren't skill-blind; they were scope-blind. Both targets fell on the very next clean, hint-free attempt once the briefs told the truth about the environment. *Scope completeness beats model quality.*
- **Stuck-escalation across engines: +2 conversions.** The final holdouts fell to the orchestrator attacking with the worker's failure log in hand — including a race condition solved by first *disproving* the obvious route (roughly 5,000 timed attempts) and then finding the actual inconsistency window, and a fragile target solved in **six requests** by reconstructing a predictable object ID offline instead of fuzzing. Three earlier attempts had crashed that app permanently with malformed probes.

The benchmark itself wasn't sound, either. Beyond the broken build, we found one challenge that kills itself on malformed input — it had silently eaten three attempts — and one that is genuinely unsolvable without public CVE proof-of-concept knowledge. We count that one as our only airlocked miss; both engines solved it within minutes once research was enabled, which is the condition every real engagement runs under.

Operations bit us too: a weekly API quota exhausted mid-run and stalled a worker against a rate-limit wall, burning attempts on four targets before we caught it. Now the runners detect quota-death, sleep through the window, and never count it as failure.

## Why two engines, and not one at twice the budget

OctaSec pairs two frontier language models from different families: one orchestrates (strategy, verification, escalation), the other powers a worker pool that does the volume hunting. This isn't redundant parallelism — parallel copies of the same model on the same target just burn tokens. It's complementary exploration.

Throughout the benchmark the two engines failed in *different places*. Each solved targets the other had written off as unsolvable — in one case the worker solved a target the orchestrator had incorrectly declared impossible. Their failure sets barely overlapped, all the way to the end. Combined, they covered 14 more challenges than either engine alone.

The connective tissue is a **failure journal**: when an engine stalls, escalation doesn't say "try harder." It hands a fresh instance the full history — hypotheses tested, approaches disproven, dead ends mapped — and points it at the *remaining* angle space. Never a verbatim retry of a failed trajectory.

## What the last 15% actually looks like

The published thesis that single-model agents plateau near 85% on this suite held up — and so did its explanation. The hardest targets weren't hard because of exotic techniques. They were hard because solving them required *abandoning a hypothesis that felt productive*:

- A session-fixation race where authentication and authorization read state twice, and only the second read grants privileges.
- A second-order injection that only detonates three steps deep into a multi-page flow, in a field the agent typed two steps earlier.
- A filter that runs two sequential replacement passes, so the stock bypass string is the one thing guaranteed to fail.
- An object ID that is predictable *by construction*, where everything needed to compute it is leaked — if you stop probing and start doing arithmetic.

None of these yield to "try more payloads." All of them yield to "try a different mind." That is the entire case for the dual-engine design.

## The penalty nobody expects: teaching in context makes models worse

One measurement from our follow-up work deserves its own paragraph, because it contradicts the industry's default move. A common pattern in agent products is to stuff a digest of domain expertise — checklists, technique summaries, playbook text — into the model's context window before the hunt. We measured this on a private, uncontaminated 20-app benchmark (APEX recall-20) using a large reasoning model under identical airlocked conditions:

| Configuration | Solved |
|---|---|
| Large reasoning model, clean context | 12 / 20 |
| Same model + 2,900-token skills digest in context | **7 / 20** |

The digest didn't just fail to help — it cost five solves. Transcripts showed the model burning its budget on exhaustive checklist enumeration instead of committing to the exploit chains the un-burdened model found early. The expertise was already in the model's weights; the static digest mostly displaced working memory.

Our doctrine, updated accordingly: skills belong in deterministic playbooks, in fine-tuning, or retrieved just-in-time keyed to what the target actually is — never as a static mega-digest. Context is a finite attention budget, not a dumping ground.

## Limitations (the part we insist you read)

1. **This suite is public and saturated.** The flags are derivable from challenge names, the source is on GitHub, and training-data contamination cannot be excluded for any model — ours or anyone's. We treat this suite as a *regression suite*, not a capability proof. A number on it should be read as "the harness works," not "the system hacks everything."
2. **100% includes assisted runs.** The 103/103 figure includes hint-conditioned integration tests and one research-enabled run. The strict-conditions capability number is **97.1%**. Please cite that one.
3. **Pass@1 is lower than pass@k.** Final scores reflect up to 2–3 fresh-context attempts on the hardest decile. Single-attempt performance on those targets is materially lower.
4. **Self-reported.** Like every result on the public leaderboard, these numbers are produced by us. We've kept raw result files, verdicts, and per-target evidence for every solve, and will share methodology details with anyone replicating.

This is why our evidence ladder doesn't stop here. Public, contamination-prone suites measure harness mechanics. Capability claims get measured on private, uncontaminated benchmarks — and then on live, authorized targets. The ladder table, dated and updated as runs complete, lives on our [benchmarks page](/benchmarks).

## What transferred to real engagements

The score doesn't transfer. The doctrine does:

1. **Enumerate every ingress channel before attacking any of them** — every port, webhook, mail pipeline, internal service. Two "unsolvable" targets were scope bugs.
2. **Audit solvability before spending compute.** Broken targets exist in every suite; in real apps, the equivalent is attacking a feature that can't possibly do what you assumed.
3. **Retry fresh, with history** — never inside a failed context, never verbatim.
4. **Complementary minds multiply; redundant ones just cost.**
5. **Fragile targets get offline reasoning first.** Six precise requests beat six thousand probes.
6. **Verify like a skeptic.** Every claim recomputed, every flag checked, "the agent said so" never accepted.

That last one is the subject of the next post: [how we verify — the confidence tiers behind every finding we ship](/blog/how-we-verify).

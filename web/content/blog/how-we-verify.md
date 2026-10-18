---
title: "How We Verify: Confidence Tiers, Deterministic Proof, and the Human Gate"
description: "Every OctaSec finding carries a confidence tier backed by deterministic evidence — and a named human signs every report. Here's exactly how the system works."
date: 2026-10-18
tags: [verification, methodology, trust]
slug: how-we-verify
---

# How We Verify: Confidence Tiers, Deterministic Proof, and the Human Gate

If you're a security buyer, you've learned to be skeptical of findings. Scanner reports are famous for noise: hundreds of "potential vulnerabilities," a handful of which survive contact with a developer. The industry's answer has been better triage — smarter models ranking the same unverified signals. Ours is different in kind, not degree: **nothing is called a finding until deterministic machinery or a human has proven it, and everything else is labeled as what it actually is.**

This post is the full mechanism. It's the post we'd want to read before trusting anyone's "AI-verified" claims — including ours.

## The core doctrine: models propose, machinery decides

Language models are confident by construction. They will tell you a parameter is injectable with the same fluency whether it is or isn't. So our architecture draws a hard line between two jobs:

- **Discovery** — creative, probabilistic, model-driven. The engine maps the application, forms hypotheses, builds candidate exploits.
- **Verification** — deterministic, adversarial, non-negotiable. Candidate findings face an execution oracle, and only the oracle's verdict counts.

A suspected XSS is not a finding until the payload executes in a headless browser. A suspected SQL injection is not a finding until a marker is extracted from the database. A suspected SSRF is not a finding until an out-of-band callback arrives at a listener we control. A suspected race condition is not a finding until a paired-timing or parallel-request test produces a statistically impossible result.

The rule is absolute: **exit code zero means proven; anything else is a candidate.** "The agent said so" is never evidence — not from our own models, not from anyone's.

## The three confidence tiers

Not everything that matters can be executed safely, and we don't pretend otherwise. Every finding that leaves our pipeline carries one of three tiers, stated on the report:

**T1 — PROVEN.** An executed oracle confirms the vulnerability. The XSS fired in a real browser engine. The SQLi marker came back out of the database. The SSRF callback was received. This is bug-bounty evidence grade: a complete case file with the raw requests, raw responses, and a reproduction any developer can run.

**T2 — CONFIRMED BY ANALYSIS.** A reachable call chain is verified statically, but no runtime proof exists — usually because the target is a code snippet rather than a running deployment, or a safe dynamic environment couldn't be built. The report says exactly that: here is the chain from input to sink, here is why it is exploitable, here is what we could not execute and why.

**T3 — SUSPICIOUS.** Pattern and anomaly evidence only — this tier exists mostly for malware and backdoor hunting, where executing the suspect code is the one thing you must never do on customer infrastructure. A T3 finding is a well-documented question for a human, not an answer.

The house rule: **the report states its tier; nothing inflates.** A T2 never gets narrated as a T1. If a finding can't rise above T3, it is presented as a lead with its evidence attached — which is still more than most scanner reports give you, and it's honest about what it is.

## The human gate

Above the machinery sits the layer we will never automate away: **a named human operator reviews, reproduces, and signs every report before delivery.**

This is not a rubber stamp on model output. The operator re-runs the proof, checks the evidence chain, assesses real-world impact in the customer's actual context, and owns the severity call. Disagreements between the machine's assessment and the operator's judgment are resolved by the operator — and where two of our own engines disagree about severity or exploitability, that disagreement is surfaced, not averaged away.

Nothing is auto-reported to a customer, ever. Nothing is auto-submitted to any third party, ever. The AI does the grinding — the thousands of hours of enumeration, probing, and hypothesis testing that make traditional pentests expensive. Humans do the judgment. You pay for judgment, not grinding.

## Production safety: the cage, not the prompt

Verification discipline has a sibling that matters just as much to a buyer: **what guarantees the testing itself can't hurt you?**

Our design law: destruction must be *impossible*, not instructed-against. Every public incident of an AI agent damaging a production system traces to the same root cause — safety lived in the prompt instead of the environment. A prompt is advice. We build cages:

- **Destructive-operation guard.** A deterministic, non-model filter blocks any command or payload with destructive semantics before execution. Model discretion never enters the decision.
- **Isolation by default.** Where we test customer code or clone environments, the test instance never shares the production database, runs in a disposable jail with no write path outside it, and its blast radius is one disposable directory.
- **Snapshots and a change ledger.** A full backup before any stateful testing, and a signed, append-only ledger of every action taken. Rollback in minutes; a complete audit trail forever.
- **Minimum-impact proofs.** Exploitation is demonstrated with the least invasive payload that proves the point — a benign marker, a timing signal, a callback — never bulk data access beyond what's needed to prove impact.

The customer-facing version of this is simple: the engine cannot delete your data, because the environment gives it no way to — and here is the log of everything it did.

## Why we publish the misses

Trust isn't built by claiming perfection, so we don't. Our benchmark results are published with per-engine breakdowns, failure autopsies, and the exact conditions under which every score was produced — including a solvability audit that proved one public benchmark challenge ships broken, and an honest labeling of which of our numbers include hint-conditioned runs.

A vendor that only shows you wins is hiding the distribution. The distribution is where the truth lives: our single-engine first-pass scores are materially lower than our combined final scores, our pass@1 is lower than our pass@k, and we say so on the [benchmarks page](/benchmarks), with dates.

That is the whole offer: findings you can act on without wondering if they're real, tiers that tell you exactly how real, a human who signs their name, and a public record of where the system fails.

---

*Related: [the benchmark journey that produced this doctrine](/blog/benchmark-journey-xben), and [the failure modes we had to engineer out of our own agents](/blog/agent-failure-modes).*

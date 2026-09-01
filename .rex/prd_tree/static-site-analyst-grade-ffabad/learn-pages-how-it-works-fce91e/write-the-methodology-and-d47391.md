---
id: "d47391a0-d076-4fe1-8374-6a1f4b5f3639"
level: "task"
title: "Write the Methodology and caveats page"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "docs"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
  - "88a2d050-ee6b-461d-9b48-d21d1cc380ad"
source: "ndx-capture"
acceptanceCriteria:
  - "Page covers questions and template, parameters, latency definition, ttfb vs total, sampling, verdict rules with the live synonym lists, quadrant and score computation, token counting differences, non-determinism, cost disclaimer, and hosted-latency caveat"
  - "Synonym lists and question texts are imported from source modules, not copied"
  - "Page passes axe, has correct heading hierarchy, and footnotes are keyboard-navigable with back-links"
description: "Create src/site/pages/methodology.astro written in the register of an analyst firm's methodology appendix, covering, honestly and briefly: the research questions and the shared prompt template (rendered from questions.json), model parameters (max output tokens, temperature policy), what latency measures (wall-clock from a GitHub-hosted runner in an unknown region including network, TLS, and queueing), time to first token vs total, why three samples and medians, how verdicts are classified (render the exported yes/no synonym lists), the one-word rule and compliance rate, how the quadrant axes and leaderboard scores are computed, token counting differences across vendors including reasoning and cached tokens (link the normalization doc), non-determinism week to week, that cost figures are estimates from a dated pricing table, and that hosted open-weights latency reflects the host. Include numbered footnotes. End with a section titled \"Limitations of this research\" that states plainly that the questions are silly and the project exists to teach benchmarking."
lastModified: "2026-09-01T18:52:49.969Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

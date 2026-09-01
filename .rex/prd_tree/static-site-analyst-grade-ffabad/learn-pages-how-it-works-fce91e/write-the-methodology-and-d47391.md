---
id: "d47391a0-d076-4fe1-8374-6a1f4b5f3639"
level: "task"
title: "Write the Methodology and caveats page"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "docs"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
  - "88a2d050-ee6b-461d-9b48-d21d1cc380ad"
source: "ndx-capture"
startedAt: "2026-09-01T22:41:22.098Z"
completedAt: "2026-09-01T22:41:22.098Z"
endedAt: "2026-09-01T22:41:22.098Z"
resolutionType: "code-change"
resolutionDetail: "src/site/pages/methodology.astro covers all ten required areas: questions and the enforced template, model parameters (max output tokens and the deliberate absence of a temperature setting), latency definition and what it includes, ttfb vs total including why reasoning tokens are excluded from ttfb, sampling and medians, verdict rules rendering the imported YES_WORDS/NO_WORDS/HEDGE_WORDS, the one-word rule and compliance rate, quadrant and leaderboard formulas rendered from SCORE_DEFINITIONS, cross-vendor token incomparability with the live 1295-vs-648 example, cost disclaimers, hosted-latency caveat, and provider availability. Synonym lists and question texts are imported from source modules rather than copied. Numbered footnotes with keyboard-navigable back-links. Closes with \"Limitations of this research\" stating plainly that the questions are silly and nothing here measures model quality. Passes axe with correct heading hierarchy.</resolutionDetail>\n"
acceptanceCriteria:
  - "Page covers questions and template, parameters, latency definition, ttfb vs total, sampling, verdict rules with the live synonym lists, quadrant and score computation, token counting differences, non-determinism, cost disclaimer, and hosted-latency caveat"
  - "Synonym lists and question texts are imported from source modules, not copied"
  - "Page passes axe, has correct heading hierarchy, and footnotes are keyboard-navigable with back-links"
description: "Create src/site/pages/methodology.astro written in the register of an analyst firm's methodology appendix, covering, honestly and briefly: the research questions and the shared prompt template (rendered from questions.json), model parameters (max output tokens, temperature policy), what latency measures (wall-clock from a GitHub-hosted runner in an unknown region including network, TLS, and queueing), time to first token vs total, why three samples and medians, how verdicts are classified (render the exported yes/no synonym lists), the one-word rule and compliance rate, how the quadrant axes and leaderboard scores are computed, token counting differences across vendors including reasoning and cached tokens (link the normalization doc), non-determinism week to week, that cost figures are estimates from a dated pricing table, and that hosted open-weights latency reflects the host. Include numbered footnotes. End with a section titled \"Limitations of this research\" that states plainly that the questions are silly and the project exists to teach benchmarking."
lastModified: "2026-09-01T22:41:22.108Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

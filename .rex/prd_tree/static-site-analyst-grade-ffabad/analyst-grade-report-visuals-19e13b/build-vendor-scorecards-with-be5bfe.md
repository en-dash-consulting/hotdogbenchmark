---
id: "be5bfe9d-d2fb-48f0-a407-3f89e003f5be"
level: "task"
title: "Build vendor scorecards with radar charts and the build-time Key Findings generator"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
  - "75555630-d090-4b12-b917-a846ff03ee38"
  - "3b89db7d-29bc-4f78-98b9-944b66aaa050"
source: "ndx-capture"
startedAt: "2026-09-01T22:36:29.151Z"
completedAt: "2026-09-01T22:36:29.151Z"
endedAt: "2026-09-01T22:36:29.151Z"
resolutionType: "code-change"
resolutionDetail: "Scorecard.astro renders a five-axis radar (decisiveness, speed, first-token responsiveness, token economy, instruction compliance — all normalised so higher is better) as build-time SVG with role=\"img\", an aria-label listing every axis value, and an always-visible data table of the same values, plus a templated analyst verdict line from vendorVerdictLine(). src/site/lib/prose.ts keyFindings() generates four to six bullets (consensus, dissent, latency spread with a real multiple, verbosity, compliance outliers, availability, composite standing), rendered directly under the executive summary, with tests covering unanimous, split, single-model and all-error runs and asserting no shape emits undefined/NaN. Zero client JS; passes axe in both themes.</resolutionDetail>\n"
acceptanceCriteria:
  - "Each vendor scorecard renders a five-axis radar SVG with a data-table alternative and an analyst verdict line"
  - "Key Findings produces four to six bullets per question from templates with unit tests for unanimous, split, single-model, and all-error runs"
  - "Radars and findings pass axe and ship no client JavaScript"
description: "Create src/site/components/report/Scorecard.astro that extends each vendor profile with a small build-time SVG radar of five normalized axes (decisiveness, speed, first-token responsiveness, token economy, instruction compliance) plus a one-line analyst verdict generated from templates. Create src/site/lib/findings.ts generating a \"Key findings\" list per question (four to six bullets: consensus, strongest dissent, fastest vendor, most verbose vendor, compliance outliers, notable week-over-week movement) in straight-faced analyst prose with unit tests covering unanimous, split, single-model, and all-error runs. Render Key Findings directly under the executive summary. Radars have a data-table alternative and follow the dataviz skill."
lastModified: "2026-09-01T22:36:29.164Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

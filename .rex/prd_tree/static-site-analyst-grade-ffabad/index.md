---
id: "ffabad60-6363-47a0-a372-eca521366313"
level: "epic"
title: "Static site: analyst-grade benchmark report, fast and accessible"
status: "pending"
priority: "high"
tags:
  - "site"
  - "a11y"
  - "design"
blockedBy:
  - "2108dbe8-4cc0-4d85-8278-8431554ee55f"
  - "423c74c8-12a3-4d6b-ab38-d452a92681e1"
source: "ndx-capture"
acceptanceCriteria:
  - "Each enabled question has its own report page with executive summary, KPI tiles, quadrant chart, leaderboard, and per-model detail, and the home page presents the report set with the hot dog report as the lead"
  - "Every past run has a statically generated archive page and the history view shows verdict share and per-model latency/token trends over time per question"
  - "All pages pass axe-core with zero violations in CI and score 95 or higher in Lighthouse performance, accessibility, best practices, and SEO"
  - "The site is fully usable with JavaScript disabled; interactive sorting and filtering are progressive enhancements over semantic tables"
  - "A reviewer shown a screenshot with the words blurred cannot distinguish the site from a commercial analyst report"
description: "The public face of the project: an Astro static site (zero client JavaScript by default, progressive enhancement only) that reads data/ at build time and renders each stored question as a fully straight-faced industry benchmark report. Design direction: this must look like a serious, expensive analyst publication (think Gartner or Forrester): restrained corporate palette, editorial typography, executive summary, KPI tiles, a magic-quadrant-style scatter, leaderboards with rank deltas, vendor scorecards, trend charts, footnoted methodology. The comedy lives entirely in the words (the questions are \"Is a hot dog a sandwich?\", \"Is a hamburger a sandwich?\", \"Is a taco a sandwich?\"); nothing in the visual design winks. Non-negotiables: WCAG 2.2 AA, keyboard and screen-reader complete, light/dark themes, reduced motion respected, Lighthouse 95+, charts rendered as build-time SVG with data-table fallbacks. Deployed to GitHub Pages by the automation epic."
lastModified: "2026-09-01T18:52:01.500Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Analyst-grade report visuals: quadrant chart, leaderboard, scorecards, key findings, and print edition](./analyst-grade-report-visuals-19e13b/index.md) | completed |
| [History and trends: run archive, week-over-week charts, and flip-flop tracker](./history-and-trends-run-archive-83ed89/index.md) | completed |
| [Learn pages: how it works, methodology and caveats, add a model](./learn-pages-how-it-works-fce91e/index.md) | completed |
| [Performance, accessibility, and SEO hardening](./performance-accessibility-and-6f906c/index.md) | pending |
| [Report pages: executive summary, KPI tiles, and per-model vendor profiles for each question](./report-pages-executive-summary-255024/index.md) | completed |
| [Site foundation: Astro scaffold, analyst-report design system, theming, and layout shell](./site-foundation-astro-scaffold-9d9cc8/index.md) | completed |

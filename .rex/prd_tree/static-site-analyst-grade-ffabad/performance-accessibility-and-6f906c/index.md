---
id: "6f906ca1-2da8-4df1-b322-944a948572b0"
level: "feature"
title: "Performance, accessibility, and SEO hardening"
status: "pending"
priority: "high"
tags:
  - "site"
  - "a11y"
  - "performance"
  - "seo"
blockedBy:
  - "25502428-d2a1-4683-9e3b-24aace53f534"
  - "83ed89c5-fa1b-4943-a34d-55e7d380a7dd"
  - "fce91e19-2437-4a0a-ad3e-c0224616e8a0"
  - "19e13b45-c9fa-44ba-9a55-6eada6f4bc96"
source: "ndx-capture"
acceptanceCriteria:
  - "Lighthouse CI runs in the PR workflow against the built site and fails below 95 in any category on home, history, and how-it-works pages"
  - "axe-core runs over every HTML file in dist/ in CI and reports zero violations"
  - "Total client JavaScript across the site is under 30 KB gzipped and Cumulative Layout Shift is 0 on the home page"
  - "Sitemap, robots.txt, per-page OpenGraph tags, a generated OG image for the latest run, and a feed of weekly runs are emitted at build time"
  - "docs/a11y-checklist.md records a manual keyboard and screen-reader pass with date and findings"
description: "Turn the finished report pages into a site that is fast and accessible by measurement, not intention: Lighthouse CI budgets (performance, accessibility, best practices, SEO all 95+), a total client JavaScript budget under 30 KB gzipped, image and font optimization, zero layout shift, axe-core automated checks over every built page in CI, a documented manual keyboard and screen-reader test pass, and SEO/social polish (per-page meta, a generated OpenGraph image per report, sitemap, robots, and a JSON Feed or RSS of weekly runs so people can subscribe to the research)."
lastModified: "2026-09-01T18:54:45.873Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Add axe-core accessibility checks over every built page in CI](./add-axe-core-accessibility-fc7369.md) | completed |
| [Add Lighthouse CI budgets, client JavaScript size budget, and layout-shift checks](./add-lighthouse-ci-budgets-9eed27.md) | completed |
| [Add SEO and social polish: meta tags, generated OpenGraph image, sitemap, robots, and weekly feed](./add-seo-and-social-polish-meta-e51d40.md) | completed |
| [Perform and document a manual keyboard and screen-reader accessibility pass](./perform-and-document-a-manual-12aeae.md) | pending |

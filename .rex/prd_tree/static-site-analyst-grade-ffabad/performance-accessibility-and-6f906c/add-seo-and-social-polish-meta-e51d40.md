---
id: "e51d406f-ab02-4619-ab06-51068c4ca20b"
level: "task"
title: "Add SEO and social polish: meta tags, generated OpenGraph image, sitemap, robots, and weekly feed"
status: "completed"
priority: "low"
tags:
  - "seo"
  - "site"
blockedBy:
  - "b69fd9c5-e664-4f5d-a811-81bdcd952d97"
  - "75555630-d090-4b12-b917-a846ff03ee38"
source: "ndx-capture"
startedAt: "2026-09-01T22:47:22.788Z"
completedAt: "2026-09-01T22:47:22.788Z"
endedAt: "2026-09-01T22:47:22.788Z"
resolutionType: "code-change"
resolutionDetail: "Base.astro emits title, description, canonical, full OpenGraph (including absolute og:image with width/height/alt) and Twitter card tags on every page, verified by a build test. scripts/og-images.mjs generates a report-cover PNG per question plus a site default via Chromium screenshot (reusing the existing browser dependency rather than adding satori/resvg), showing report title, edition and consensus; report and archive pages reference their own card. @astrojs/sitemap emits sitemap-index.xml; robots.txt, feed.json (JSON Feed 1.1) and feed.xml (RSS 2.0) are generated endpoints so their URLs track the deployed origin. Tests validate the feeds structurally, assert one entry per edition, check XML escaping, and confirm each OG card is a real PNG.</resolutionDetail>\n"
acceptanceCriteria:
  - "Every page has title, description, canonical, OpenGraph, and Twitter card tags verified by a build test"
  - "An OG image PNG per report for the latest run is generated at build time and referenced from each report page and the home page"
  - "sitemap.xml, robots.txt, feed.json, and feed.xml are emitted and the feeds validate with one entry per run"
description: "Per-page title and description props already exist in the layout; add OpenGraph and Twitter card tags, a build-time generated OG image per report (SVG rendered to PNG via satori or resvg, styled as a report cover showing the report title, edition, and consensus KPI), @astrojs/sitemap, robots.txt, and a JSON Feed plus RSS at /feed.json and /feed.xml with one entry per weekly edition containing per-question tallies and a link to the archive page. Verify the OG images render in a card validator."
lastModified: "2026-09-01T22:47:22.804Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

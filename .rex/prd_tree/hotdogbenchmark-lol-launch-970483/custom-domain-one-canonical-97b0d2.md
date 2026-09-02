---
id: "97b0d2fc-c472-476e-b75d-e621cf89925d"
level: "feature"
title: "Custom domain: one canonical host at hotdogbenchmark.lol"
status: "pending"
priority: "critical"
tags:
  - "launch"
  - "hosting"
  - "seo"
blockedBy:
  - "d3873795-d9ff-4915-925d-94585937b7db"
source: "ndx-capture"
acceptanceCriteria:
  - "public/CNAME is committed with hotdogbenchmark.lol and survives the build into dist/"
  - "astro.config.mjs resolves site to https://hotdogbenchmark.lol with base / when the CNAME is present, and the built canonicals, OG URLs and sitemap use that origin, verified by a build test"
  - "https://www.hotdogbenchmark.lol responds 301 to the apex and the apex serves over HTTPS with the redirect enforced in repo settings"
  - "docs/self-hosting.md explains how a fork sets its own CNAME or falls back to the project-pages base"
description: "public/CNAME containing hotdogbenchmark.lol; DNS at the registrar (A/AAAA records for the apex to GitHub Pages, a CNAME for www to endash.github.io); HTTPS enforced in the repo's Pages settings. The apex is the canonical host and www redirects to it with a 301, which GitHub Pages does for the non-CNAME host once the CNAME file is in place. astro.config.mjs sets site to https://hotdogbenchmark.lol and base to \"/\" so Astro emits absolute canonicals and a correct sitemap; the GITHUB_REPOSITORY-derived project-pages base path no longer applies. Two live hosts split every signal, so exactly one is served."
lastModified: "2026-09-02T04:12:22.238Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

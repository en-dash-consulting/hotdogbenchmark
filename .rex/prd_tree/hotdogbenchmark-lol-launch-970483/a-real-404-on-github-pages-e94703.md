---
id: "e9470302-24b4-4996-aac9-f6b8b6652061"
level: "feature"
title: "A real 404 on GitHub Pages"
status: "pending"
priority: "medium"
tags:
  - "launch"
  - "seo"
  - "site"
source: "ndx-capture"
acceptanceCriteria:
  - "dist/404.html exists after a build, uses the Base layout, and links to the home page and the reports"
  - "A build test asserts the file exists and has one h1"
  - "curl -I https://hotdogbenchmark.lol/nope returns 404 once the site is live"
description: "Unknown paths must return HTTP 404, not the index page with a 200, or Search Console reports soft 404s and indexes empty shells. GitHub Pages serves dist/404.html with a 404 status when the file exists at the root. Add src/site/pages/404.astro in the site's voice (the question, a short line, links home and to the reports), make sure it builds to dist/404.html, and check the live status once the domain is up."
lastModified: "2026-09-02T04:12:04.041Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

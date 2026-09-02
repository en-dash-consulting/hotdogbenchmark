---
id: "970483ef-c4ab-4c52-8f00-25fb17e98781"
level: "epic"
title: "hotdogbenchmark.lol launch: domain, crawlability, structured data, and the En Dash link"
status: "pending"
priority: "critical"
tags:
  - "launch"
  - "seo"
  - "site"
  - "hosting"
source: "ndx-capture"
acceptanceCriteria:
  - "The site is served from exactly one canonical host at hotdogbenchmark.lol over HTTPS, with public/CNAME committed, astro.config.mjs site set to the canonical origin, and absolute canonicals and sitemap URLs in the build"
  - "robots.txt, sitemap-index.xml, llms.txt and 4620f6c856eb31607cedc6155c820eec.txt are all reachable on the live host, and a build test asserts each is present and that llms.txt lists every built page"
  - "A build test asserts the front page and every report page contain the model names, answers and verdicts as HTML text, above a word-count floor, with scripts stripped"
  - "Every page has its own title and description derived from its data, with the home title containing the question, verified by a build test that no two pages share a description"
  - "Every report, edition and the home page has its own generated OG image, referenced absolutely, verified by the build test"
  - "The home page carries FAQPage JSON-LD with the shipped questions and real answers, each edition page carries Dataset JSON-LD with a distribution URL to its JSON, and the repo is described with SoftwareSourceCode; a test parses each block"
  - "Unknown paths return HTTP 404 from GitHub Pages via a real 404.html, and the footer links the En Dash learning apps in one line"
  - "Nick has been told the four crawl files are live so search-ops can register the property"
description: "The launch brief for the site at hotdogbenchmark.lol, part A, distilled from measured results across En Dash's other properties. The rules carry their reasons; follow the reason.\n\nThe site is already static and server-rendered, so the substance rule (model names, answers, verdicts and numbers must be in the HTML before any script runs) is mostly about not regressing: a build test should prove it with a word count, the way `curl | wc -w` would. Everything else is additive: the custom domain and one canonical host; the four crawl files (robots.txt pointing at the sitemap, a complete sitemap, an llms.txt that lists every real page with one line each and is generated from the routes so it cannot drift, and the portfolio IndexNow key file); titles that target the query people type (\"Is a hot dog a sandwich?\" belongs in the home page title); a description per page derived from that page's data, never one boilerplate line; a generated OG card per edition and per report so every share previews as itself; JSON-LD that is accurate rather than broad (FAQPage on the home page with the models' real answers, Dataset per edition pointing at the JSON, SoftwareSourceCode for the repo); a real 404 that returns a 404 status on GitHub Pages; one restrained footer line linking the En Dash learning apps this audience would want; and the GA4 tag once the measurement ID exists.\n\nPart B of the brief (the endash.us toolkit entry) is Nick's, not this repository's. Nick's search-ops side registers the property, the probe, and the IndexNow ping; this epic is done when the four crawl files are live and he has been told."
lastModified: "2026-09-02T04:11:01.814Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [A real 404 on GitHub Pages](./a-real-404-on-github-pages-e94703.md) | completed |
| [Add the GA4 tag once the measurement ID exists](./add-the-ga4-tag-once-the-5b1218.md) | blocked |
| [Custom domain: one canonical host at hotdogbenchmark.lol](./custom-domain-one-canonical-97b0d2.md) | pending |
| [One footer line to the En Dash learning apps this audience wants](./one-footer-line-to-the-en-dash-ee829b.md) | completed |
| [Prove the substance is in the HTML: a server-rendered content floor](./prove-the-substance-is-in-the-974d4f.md) | completed |
| [Structured data that is true: FAQPage, Dataset per edition, SoftwareSourceCode](./structured-data-that-is-true-0f727b.md) | completed |
| [The four crawl files: robots.txt, sitemap, llms.txt, IndexNow key](./the-four-crawl-files-robots-txt-db0491.md) | completed |
| [Titles for the query people type, a description per page, an OG card per page](./titles-for-the-query-people-a7d311.md) | completed |

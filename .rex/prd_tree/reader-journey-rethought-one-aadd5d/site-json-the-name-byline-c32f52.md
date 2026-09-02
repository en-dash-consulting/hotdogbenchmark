---
id: "c32f5296-8782-480c-8cac-acbebca61704"
level: "feature"
title: "site.json: the name, byline, repository and contact route come from a file, so a fork is a fork"
status: "pending"
priority: "high"
tags:
  - "site"
  - "forkability"
  - "oss"
  - "schema"
source: "UX review 2026-09-02"
acceptanceCriteria:
  - "site.json exists with a zod schema, is validated at build, and bench init writes it"
  - "No site source file contains the literal site name, byline, publisher or repository URL; a lint or test enforces it"
  - "The fork build test asserts that a scratch site.json produces a site with none of the upstream name, byline, publisher URL or repository URL, in HTML, feeds, llms.txt or the manifest"
  - "The shipped site.json produces byte-identical HTML for the current edition, verified by the existing build tests"
  - "Footer lines that name En Dash render only when site.json says the publisher is En Dash"
description: "The fork build test proves a scratch registry produces a site with no sandwich text. It does not check the brand, and the brand is hardcoded: `SITE_NAME = 'HOTDOG BENCHMARK'` in Base.astro and seo.ts, the wordmark lines in Base.astro, the kicker \"Hotdog Benchmark\" and \"Prepared by Hotdog Benchmark, an En Dash research program\" in Masthead.astro, the feed titles, the llms.txt headings, page descriptions on About, Methodology, How it works, Add a model and Accessibility, and `REPO_URL = 'https://github.com/en-dash-consulting/hotdogbenchmark'` in urls.ts. A fork about burritos ships as the Hotdog Benchmark, prepared by En Dash, whose front page tells visitors to clone this repository. The Fork-this epic's promise (\"no code edits\") is not yet true, and the pending ask-a-question item assumes a site name it can derive from.\n\n**After.** A `site.json` at the root with a zod schema next to the other registries: `name` (\"Hotdog Benchmark\"), `shortName` for the wordmark's two lines, `byline` (\"an En Dash research program\"), `publisher` (name and URL), `repository` (the GitHub URL, from which the issue and source links derive), and `contact` (null, or an object describing the En Dash contact-modal route with its parameters). `bench init` writes it alongside the questions and conditions. Every hardcoded string above reads from it; the footer's En Dash line and the learning-apps line render only when the publisher is En Dash, so a fork does not advertise someone else's consultancy.\n\nThe fork build test gains a second scratch file with a different name, byline and repository, and asserts that none of the upstream name, byline, publisher or repository URL appears anywhere in the built HTML, feeds or text files. The shipped file reproduces today's output exactly, checked by the existing tests."
lastModified: "2026-09-02T20:43:02.476Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

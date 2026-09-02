---
id: "a7d311a4-265a-4051-94c8-64f7f866002b"
level: "feature"
title: "Titles for the query people type, a description per page, an OG card per page"
status: "pending"
priority: "high"
tags:
  - "launch"
  - "seo"
  - "site"
source: "ndx-capture"
acceptanceCriteria:
  - "The home page title contains the question text and the model count, and every page title is unique"
  - "No two built pages share a meta description, verified by a build test, and report, edition, history and framing descriptions include a number from that page's data"
  - "Every report, framing, edition and the home page references its own OG image by absolute URL, the file exists in dist/og/, and the edition and framing cards show the date and headline verdict"
  - "scripts/og-images.mjs reads the run data rather than only the manifest, so the card verdicts match the pages"
description: "\"Is a hot dog a sandwich\" is a high-volume novelty search and this site answers it with eleven models; the home title should say so (\"Is a hot dog a sandwich? 11 AI models answer, weekly\" or similar, with the site name after). Every page gets its own description derived from its data: the report page states the edition's verdict tally and who flipped; the history page states how many editions and the latest change; edition pages state the date and tally; per-framing pages state the system prompt. endash.us shipped one description across 17 pages and lost every snippet. OG images are already generated per question and a site default; extend to one per edition and per per-framing report, with the edition date and headline verdict on the card, and reference them by absolute URL."
lastModified: "2026-09-02T04:11:39.265Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

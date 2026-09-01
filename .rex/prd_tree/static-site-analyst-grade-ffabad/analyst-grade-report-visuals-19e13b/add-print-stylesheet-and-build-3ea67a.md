---
id: "3ea67a3d-9af2-4d2a-a31e-145a4e15c42c"
level: "task"
title: "Add print stylesheet and build-time PDF edition of each report"
status: "completed"
priority: "low"
tags:
  - "site"
  - "design"
blockedBy:
  - "75555630-d090-4b12-b917-a846ff03ee38"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
source: "ndx-capture"
startedAt: "2026-09-01T22:36:34.033Z"
completedAt: "2026-09-01T22:36:34.033Z"
endedAt: "2026-09-01T22:36:34.033Z"
resolutionType: "code-change"
resolutionDetail: "src/site/styles/print.css forces the light palette (a dark-theme print is a solid black page), hides nav chrome, expands external link URLs to footnoted text, repeats table headers via table-header-group, and prevents rows/cards/figures/blockquotes breaking across pages; @page sets A4 with margins that also suit US Letter. scripts/pdf.mjs generates one PDF per question at build time via Chromium print-to-PDF against that same stylesheet, cached on the run id (skipped when unchanged, --force to override), with a running header and page numbers. Verified: 14 pages, 11 embedded fonts and no image XObjects (real text layer, confirmed by pdftotext), a document /Title, and /StructTreeRoot from tagged output. Each report page links \"Download this report (PDF)\". 12 tests cover the PDF artefacts and the print rules.</resolutionDetail>\n"
acceptanceCriteria:
  - "Printing a report page produces a clean multi-page document on A4 and Letter with no clipped charts or split table rows"
  - "npm run build emits one PDF per enabled question under dist/reports/ and each report page links to it"
  - "PDF has a text layer, a document title matching the report title, and regeneration is skipped when the run id is unchanged"
description: "Add a print stylesheet so each report page prints cleanly on A4 and US Letter: masthead, page numbers and running header via @page where supported, charts sized to the column, tables unbroken across rows, links expanded to footnoted URLs, theme forced to light. Generate a PDF per question at build time (Playwright print-to-PDF in the build step, cached by run id so unchanged reports are not regenerated) and expose a \"Download report (PDF)\" link on each report page and archive page. Verify the PDF has a text layer and a document title."
lastModified: "2026-09-01T22:36:34.045Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

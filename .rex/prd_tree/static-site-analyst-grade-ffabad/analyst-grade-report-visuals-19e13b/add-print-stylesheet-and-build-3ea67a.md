---
id: "3ea67a3d-9af2-4d2a-a31e-145a4e15c42c"
level: "task"
title: "Add print stylesheet and build-time PDF edition of each report"
status: "pending"
priority: "low"
tags:
  - "site"
  - "design"
blockedBy:
  - "75555630-d090-4b12-b917-a846ff03ee38"
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
source: "ndx-capture"
acceptanceCriteria:
  - "Printing a report page produces a clean multi-page document on A4 and Letter with no clipped charts or split table rows"
  - "npm run build emits one PDF per enabled question under dist/reports/ and each report page links to it"
  - "PDF has a text layer, a document title matching the report title, and regeneration is skipped when the run id is unchanged"
description: "Add a print stylesheet so each report page prints cleanly on A4 and US Letter: masthead, page numbers and running header via @page where supported, charts sized to the column, tables unbroken across rows, links expanded to footnoted URLs, theme forced to light. Generate a PDF per question at build time (Playwright print-to-PDF in the build step, cached by run id so unchanged reports are not regenerated) and expose a \"Download report (PDF)\" link on each report page and archive page. Verify the PDF has a text layer and a document title."
lastModified: "2026-09-01T18:54:14.067Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

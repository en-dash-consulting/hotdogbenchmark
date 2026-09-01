---
id: "634ddc20-50b0-4fdd-beb2-49bb764b0131"
level: "task"
title: "Build semantic results table with progressive-enhancement sorting and filtering"
status: "completed"
priority: "medium"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
source: "ndx-capture"
startedAt: "2026-09-01T22:15:56.501Z"
completedAt: "2026-09-01T22:15:56.501Z"
endedAt: "2026-09-01T22:15:56.501Z"
resolutionType: "code-change"
resolutionDetail: "ResultsTable.astro renders a semantic table with caption, scoped th cells (row headers on the model column), and tabular numerals, ordered by composite score descending and fully readable with JavaScript disabled — the filter controls are hidden in markup and revealed by the script, so a no-JS reader is never shown a control that cannot work. The vanilla enhancement adds click- and keyboard-operable sorting with aria-sort, vendor/verdict filters announcing the visible count through a role=\"status\" live region, a reset, and sort/filter state round-tripped through the URL hash. Total site client JS remains well under the 30 KB gzipped budget asserted by tests/site/build-output.test.ts.</resolutionDetail>\n"
acceptanceCriteria:
  - "Table has a caption, scoped headers, and renders all model rows correctly with JavaScript disabled"
  - "Sorting updates aria-sort and row order; filtering announces the visible row count via a live region; both are keyboard operable"
  - "Enhancement script is under 5 KB gzipped and the page still passes axe"
  - "Sort and filter state round-trips through the URL hash"
description: "Add a \"Data table\" view on each report page (linked from a profiles/table toggle that is a real link or button pair) rendering the same per-model data as a semantic table with caption, scoped th cells, and sortable column headers. Without JavaScript the table is fully readable in a sensible default order (composite score descending). A tiny vanilla script (under 5 KB gzipped, no framework) enhances it: click-to-sort headers with aria-sort, filter controls by provider and verdict with a live region announcing result counts, and a reset. State is reflected in the URL hash so views can be shared."
lastModified: "2026-09-01T22:15:56.515Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

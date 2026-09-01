---
id: "634ddc20-50b0-4fdd-beb2-49bb764b0131"
level: "task"
title: "Build semantic results table with progressive-enhancement sorting and filtering"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "a11y"
blockedBy:
  - "7023a879-e2e4-44d0-b0e0-1fabdb712cb1"
source: "ndx-capture"
acceptanceCriteria:
  - "Table has a caption, scoped headers, and renders all model rows correctly with JavaScript disabled"
  - "Sorting updates aria-sort and row order; filtering announces the visible row count via a live region; both are keyboard operable"
  - "Enhancement script is under 5 KB gzipped and the page still passes axe"
  - "Sort and filter state round-trips through the URL hash"
description: "Add a \"Data table\" view on each report page (linked from a profiles/table toggle that is a real link or button pair) rendering the same per-model data as a semantic table with caption, scoped th cells, and sortable column headers. Without JavaScript the table is fully readable in a sensible default order (composite score descending). A tiny vanilla script (under 5 KB gzipped, no framework) enhances it: click-to-sort headers with aria-sort, filter controls by provider and verdict with a live region announcing result counts, and a reset. State is reflected in the URL hash so views can be shared."
lastModified: "2026-09-01T18:55:07.775Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

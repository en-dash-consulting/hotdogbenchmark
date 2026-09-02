---
id: "cb0c7462-cff9-42be-9cfc-009c3694d4e0"
level: "feature"
title: "CI gates that hold the responsive and accessibility bar"
status: "completed"
priority: "high"
tags:
  - "site"
  - "a11y"
  - "ci"
blockedBy:
  - "eb149b9b-f9d2-49f1-b330-7526a6baa5f7"
  - "b4b675bb-f3e9-4b2d-b68a-58bba48c8aa8"
source: "ndx-capture"
startedAt: "2026-09-02T04:40:09.552Z"
completedAt: "2026-09-02T04:40:09.552Z"
endedAt: "2026-09-02T04:40:09.552Z"
resolutionType: "code-change"
resolutionDetail: "test:a11y in four modes at two widths, test:responsive with screenshot artifacts, Lighthouse accessibility asserted at 100, all wired into ci.yml and documented in CONTRIBUTING"
acceptanceCriteria:
  - "npm run test:a11y runs axe over every page in light, dark, forced-colors and reduced-motion modes at 375 and 1280 wide and fails on any violation"
  - "npm run test:responsive fails on horizontal overflow at any of the seven widths or at 400% zoom, and uploads per-page screenshots as a CI artifact"
  - "lighthouserc.json asserts accessibility 100 and the CI job passes with the web fonts enabled"
  - "ci.yml runs all three on every pull request and CONTRIBUTING.md tells contributors how to run them locally"
description: "Turn every manual check above into something a pull request cannot get past. Extend scripts/a11y.mjs to run axe in four modes per page: light, dark, forced-colors, and reduced-motion, and at two widths, 375 and 1280. Add scripts/responsive.mjs that asserts no horizontal overflow at the seven widths and at 400% zoom and captures a screenshot per page and width as a CI artifact for review. Add a target-size and focus-obscured check to the same script. Raise the Lighthouse accessibility assertion to 100 and keep performance at 95 or better with the web fonts loading. Wire all of it into ci.yml on every pull request and document the commands in TESTING.md and CONTRIBUTING.md so a contributor can run them before pushing."
lastModified: "2026-09-02T04:40:09.564Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

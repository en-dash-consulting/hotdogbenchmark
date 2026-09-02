---
id: "974d4fda-4157-4fdd-b241-cadb712e99d0"
level: "feature"
title: "Prove the substance is in the HTML: a server-rendered content floor"
status: "completed"
priority: "high"
tags:
  - "launch"
  - "seo"
  - "site"
source: "ndx-capture"
startedAt: "2026-09-02T05:10:46.258Z"
completedAt: "2026-09-02T05:10:46.258Z"
endedAt: "2026-09-02T05:10:46.258Z"
resolutionType: "code-change"
resolutionDetail: "tests/site/launch.test.ts builds into its own out dir, strips script and style from every page, asserts the word floor (front and reports >= 400, others >= 120, 404 exempt), and asserts every enabled model's display name and its control-arm first-sample answer appear in the front page and each full report page's HTML. README records the curl | wc -w manual equivalent. Commit ebeeb01."
acceptanceCriteria:
  - "A build test strips <script> and <style> from every built page and asserts a word-count floor (front page and report pages at least 400 words, every other page at least 120)"
  - "The same test asserts every enabled model's display name and its control-arm answer text appear in the front page HTML and in each report page's HTML"
  - "A note in docs/a11y-checklist.md or README records the curl | wc -w check as the manual equivalent"
description: "The model names, their answers, the verdicts and the numbers must be in the HTML that arrives before any script runs. endash.us's book digests shipped about 105 words of HTML and 580 after hydration and earned zero clicks in sixteen months. The site is static already; this feature is the test that keeps it that way: strip scripts and styles from each built page, count words, and assert a floor per page kind, plus assert that every enabled model's display name and its answer text for the control arm appear in the front page and report page markup."
lastModified: "2026-09-02T05:10:46.269Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

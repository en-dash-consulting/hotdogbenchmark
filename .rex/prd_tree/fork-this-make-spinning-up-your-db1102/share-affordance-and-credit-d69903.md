---
id: "d69903b6-69bf-4481-b009-6171dcfd0ea2"
level: "feature"
title: "Share affordance and credit copy for contributed questions"
status: "in_progress"
priority: "medium"
tags:
  - "site"
  - "oss"
  - "growth"
  - "schema"
blockedBy:
  - "4f41ea6f-0a1f-4c40-a549-4fc5bb338550"
  - "32824903-6b06-44b5-8679-dfb79c86a3ca"
source: "ndx-capture"
startedAt: "2026-09-02T22:57:00.705Z"
acceptanceCriteria:
  - "Each question's report carries a visible share affordance whose URL is copyable with JavaScript disabled, and a copy button that appears only with scripts and stays within the budget"
  - "The share text and the OG card for a contributed question carry the question and, when credit was granted, the contributor; the title tag does not, per the launch epic's title rule"
  - "The contact prefill, the issue form and the pull request template ask how the submitter wants to be credited, state the uncredited default, and offer an explicit opt-out (this is shared with the pipeline item and must not be duplicated)"
  - "Site copy for the credit derives from the registry and passes the fork build test over a scratch registry"
  - "axe in four modes and the responsive audit stay clean"
description: "Revised after the 2026-09-02 UX review. The storage and rendering half of this item (the contributor field on questionEntrySchema, the byline on the report, the credit on the reports index) moved into the question-pipeline feature, which needs the field for its Up next section anyway. What stays here is the sharing half and the collection copy.\n\n**Make it shareable.** The point of credit is showing it to people. Each question's report already has a stable URL and an OG card; this adds a visible share line in the masthead area with the URL as text (copyable with scripts off) and a copy button that appears only when scripts run. The OG card and the share text carry the question and the credit when granted, so a link pasted into a chat reads as \"here is the question I got added.\" The title tag stays the query people type; the launch epic's SEO rule wins over the credit here.\n\n**Collect it.** The contact prefill, the issue form and the pull request template ask how the submitter wants to be credited, make plain the default (uncredited when nothing is said), and offer an opt-out. Silence is not consent to be named. This copy is specified once, in the pipeline item; this item ensures the ask-a-question block's prefill carries it."
lastModified: "2026-09-02T22:57:00.716Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

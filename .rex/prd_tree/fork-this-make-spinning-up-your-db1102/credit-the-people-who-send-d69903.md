---
id: "d69903b6-69bf-4481-b009-6171dcfd0ea2"
level: "feature"
title: "Credit the people who send questions, and make each one shareable"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "oss"
  - "growth"
  - "schema"
blockedBy:
  - "32824903-6b06-44b5-8679-dfb79c86a3ca"
source: "ndx-capture"
acceptanceCriteria:
  - "questionEntrySchema gains an optional contributor field (name, optional URL, opt-out) that is additive — every existing questions.json validates unchanged and no migration is required"
  - "The contact prefill, the add-a-question issue form and the pull request template all ask how the submitter wants to be credited and state what is used by default if they say nothing"
  - "An explicit opt-out is available in each submission route, and a submission that answers nothing and carries no handle is stored uncredited rather than guessed at"
  - "Credit renders on the question's report page and its /reports/ index card, and renders nothing at all when there is no contributor or the opt-out is set"
  - "A contributor URL is rendered as a link with appropriate rel attributes, and a contributor name containing markup is escaped — covered by a test with a hostile value"
  - "Each question's report carries a visible share affordance whose URL is copyable with JavaScript disabled"
  - "The OG card and page title for a question carry the question and, where present, the credit, verified by the existing OG and SEO tests"
  - "Site copy for the credit derives from the registry and passes the fork build test over a scratch registry"
  - "The additions pass axe in four modes and the responsive audit at seven widths, and stay within the 30 KB client JavaScript budget"
description: "A question someone sent in should carry their name, and they should be able to show it to people. Both halves are missing: `questionEntrySchema` has no contributor field, and there is no share affordance on a report.\n\n**Collect it.** The contact prefill, the add-a-question issue form and the pull request template each ask how the submitter wants to be credited, and make plain what will be used by default if they say nothing — the GitHub handle on the PR, or the name given in the form. A clear opt-out (a checkbox on the issue form, an explicit line in the prefill) means no credit is shown at all. Silence is not consent to be named: the default with no answer and no handle is uncredited.\n\n**Store it.** A new optional `contributor` field on `questionEntrySchema` — name, an optional URL (GitHub profile, site), and the opt-out. Optional and additive, so every existing question file stays valid and no migration is needed. The shipped questions have no contributor, which is the honest value: nobody sent them in.\n\n**Show it.** Credit renders on the question's report page and on the /reports/ index card, in the site's own register rather than as a badge — this is a research publication and the line is a byline, not a leaderboard. Nothing renders when there is no contributor or when they opted out.\n\n**Make it shareable.** The point of credit is showing it to people. Each question's report already has a stable URL and an OG card; this adds a visible share affordance and makes sure the OG card and page title carry the question and the credit, so a link pasted into a chat reads as \"here is the question I got added\" rather than a bare domain. Scripts-off must still leave a copyable URL.\n\nThis is the sugar on the contribution work: it is what makes submitting a question feel worth doing, and it is why it should land close behind the CTA rather than much later."
lastModified: "2026-09-02T20:24:03.640Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

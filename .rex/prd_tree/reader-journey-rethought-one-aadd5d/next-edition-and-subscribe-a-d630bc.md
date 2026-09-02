---
id: "d630bc94-50bb-436e-900c-fea04d43c17e"
level: "feature"
title: "Next edition and subscribe: a weekly publication that says when it publishes next"
status: "pending"
priority: "medium"
tags:
  - "site"
  - "growth"
  - "feeds"
source: "UX review 2026-09-02"
acceptanceCriteria:
  - "Every page's footer shows the next edition date derived from the schedule and the latest edition, with a unit test over the date arithmetic including a late edition"
  - "RSS and JSON feed links are visible in the footer and on the reports index, with correct rel and type attributes"
  - "The schedule source is a single configuration value that bench init can set"
  - "The launch build test and the OG and SEO tests remain green"
description: "The site is a weekly publication with a JSON feed and an RSS feed, and neither is visible: they exist as `<link rel=\"alternate\">` in the head and one line in llms.txt. No page says when the next edition lands. The voting epic and the contribution work are engagement features that need a backend or a maintainer; the cheapest retention loop, \"come back Monday, or subscribe,\" needs neither.\n\nAdd one line to the footer's data line: \"Next edition: Monday, September 8\" computed from the latest edition's ISO week and the workflow's schedule (read the cron from benchmark.yml at build, or a `schedule` field in site.json, so a fork on a different day is right), followed by the feed links (RSS, JSON). On the /reports/ rack the same line sits under the lede. When the latest edition is older than its cadence allows, the line says the edition is late rather than predicting a date that passed; that honesty is in the project's voice."
lastModified: "2026-09-02T20:43:28.018Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

---
id: "a22fa09c-33c8-458c-9fd8-3d2e78d87039"
level: "epic"
title: "User voting: let readers cast their own one-word answer and see how the crowd compares to the models"
status: "deferred"
priority: "medium"
tags:
  - "site"
  - "engagement"
  - "voting"
  - "post-launch"
source: "ndx-capture (maintainer: \"i'd like to add user voting at some point, but i think i can launch it without that\")"
acceptanceCriteria:
  - "A vote endpoint on Cloudflare Workers accepts one vote per question per day per client with rate limiting and stores only aggregates and a dedupe hash"
  - "The front page and report pages show the human tally beside the model tally, and the widget degrades to a read-only view when the endpoint is unavailable"
  - "Daily aggregates are published as JSON in the repository so the history pages can chart humans against models over time"
  - "No personal data is collected; the About and Accessibility pages say what is stored"
  - "The JS budget test still passes with the widget included"
description: "After launch. Readers answer the question themselves (Yes, No, or a hedge) and see the human tally next to the models' tally, per question and, if they want, per framing (\"would you change your mind if told...?\"). The site is static on GitHub Pages and never calls a provider, so votes need a tiny separate write endpoint (Cloudflare Worker with KV or D1, the same platform the optional proxy already targets) with rate limiting, no accounts, and a published daily aggregate the static site reads at build or fetches read-only at runtime. Privacy: no personal data, a hashed IP-plus-day for dedupe at most, and the aggregate JSON committed alongside the editions so the history keeps it. Design it so the static site stays fully functional with the endpoint down: the vote widget is progressive enhancement over a plain results view."
lastModified: "2026-09-02T16:46:00.812Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

---
id: "23da647b-c638-47c6-b0a9-de87cd040efb"
level: "feature"
title: "One question switcher, one archive, and no page that points at where things used to be"
status: "in_progress"
priority: "high"
tags:
  - "site"
  - "navigation"
  - "design"
  - "copy"
source: "UX review 2026-09-02"
startedAt: "2026-09-02T21:53:31.938Z"
acceptanceCriteria:
  - "A single QuestionSwitcher component renders the question pills on the board, every report and arm page, and the history pages, with a Playwright keyboard test per context"
  - "/runs/ is titled Editions, lists editions with per-question tallies and links, and links each question's week-by-week history; /history/ redirects or is removed from the sitemap"
  - "The primary nav has no item whose page is an empty state with the current data"
  - "No page text or link claims reports are on the home page or that history is the archive, asserted by a build test"
  - "The home page has exactly one dark call-to-action block below the fold"
  - "Sitemap, llms.txt, breadcrumbs JSON-LD and the OG tests are updated and green"
description: "The site indexes its three questions four times: the home hand-off block, the /reports/ rack, the /history/ list and the /runs/ list with its \"what each edition found\" section, plus the edition page under /runs/ that repeats every executive summary. History is in the primary nav and, with one edition, mostly says that trends start with the second one. Switching questions is built four different ways: the hero tabs on the board (script only), the alignment-grid column headers, the pill nav on the history page, and the rack cards; a report page cannot reach its sibling reports except through the nav.\n\n**Stale copy from the last restructure.** The edition page says \"Current reports are on the home page.\" A report's empty state says \"See the archive for prior editions\" and links /history/, which is not the archive. The board's footer link says \"Full report\" while the rack calls it \"Read the report.\"\n\n**After.**\n\n- *One `QuestionSwitcher` component*: pills with the subject, `aria-current` on the active one, used on the board head (where it already is, as tabs), at the top of every report and arm page, and on the history page. Same markup, same styles, keyboard behavior per context (links on report and history pages, tabs on the board).\n- *One archive*: /runs/ becomes \"Editions\" and absorbs the history index. History per question stays at /history/<id>/ and is reached from the edition list and from the report (\"week by week\"). The nav becomes Reports, Editions, Methodology, How it works, About; History leaves the primary nav until there are two editions, at which point the Editions page carries the trends and the nav item can come back if it earns it.\n- *The edition page* lists its questions with tally and links and stops repeating executive summaries; the archived question page is the full record.\n- *Copy fixes*: every \"current reports\" or \"archive\" reference points where the thing is, and a build test asserts that the phrases \"home page\" and \"archive\" in link text resolve to the reports index and the editions page respectively.\n- *The home page* keeps the board, the alignment grid and the sway bars; the hand-off block becomes one line under the grid (\"Read the three reports\") rather than a second navy block above the fork block, so the bottom of the page has one dark block, not two, and room for the contribution line the pipeline feature adds."
lastModified: "2026-09-02T21:53:31.951Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

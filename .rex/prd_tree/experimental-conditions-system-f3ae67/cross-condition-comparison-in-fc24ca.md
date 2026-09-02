---
id: "fc24ca3a-e003-41a3-a6bd-896cf9d23795"
level: "feature"
title: "Cross-condition comparison in the report"
status: "completed"
priority: "high"
tags:
  - "site"
  - "dataviz"
blockedBy:
  - "f5ff807a-8c63-4eb5-a377-90d70513c3ae"
source: "ndx-capture"
startedAt: "2026-09-02T01:26:58.532Z"
completedAt: "2026-09-02T01:56:46.696Z"
endedAt: "2026-09-02T01:56:46.696Z"
resolutionType: "code-change"
resolutionDetail: "Framing Sensitivity section, per-framing report pages, sensitivity measure + methodology, new front page, first real three-condition edition"
acceptanceCriteria:
  - "Each report page shows every model's verdict per condition and highlights the models whose position changed from the control"
  - "A framing-sensitivity measure is a pure, unit-tested function covering no change, full adoption, partial movement, and a model that errored in one condition but not another"
  - "The methodology page renders the measure's definition from the same constant the code uses, and states plainly that neither robustness nor compliance is treated as better"
  - "The comparison chart has a data-table alternative, passes axe in both themes, and ships no client JavaScript"
  - "An edition with only the control condition renders without an empty comparison section"
description: "The presentation problem, and the reason this epic is worth doing rather than just three more reports.\n\nEach report page gains a condition comparison: per model, the verdict under the control and under each other condition, with the models whose position moved called out. In the report's register this is a \"Framing Sensitivity\" section — the analyst-speak for \"how much does this model just agree with you\".\n\nA derived measure, defined as transparently as the existing scores and rendered on the methodology page from the same constants: the share of questions where a model's majority verdict changed between the control and a given condition. A model that never moves scores 0; one that always adopts the asserted position scores 1.\n\nNeither end of that scale is presented as better, and the methodology page must say so explicitly. A model that ignores a false premise is robust; a model that follows an explicit instruction is compliant. Both are defensible, this benchmark cannot adjudicate between them, and the temptation to imply otherwise is exactly the thumb-on-the-scale problem the silly question was chosen to avoid.\n\nCharts follow the existing rules: build-time SVG, data-table alternative, no colour-only encoding, zero client JavaScript."
lastModified: "2026-09-02T01:56:46.707Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

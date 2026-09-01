---
id: "348e1746-9565-4b38-8dd6-db4b0646c06d"
level: "task"
title: "Seed the first real benchmark run and verify the live site"
status: "blocked"
priority: "medium"
tags:
  - "launch"
blockedBy:
  - "f86235ce-5ae1-40af-9b4a-6c748afa167f"
  - "c64abe7c-a006-47dd-924e-99b56bf59a64"
  - "7e7bc1b4-2fd3-4d90-a01f-240bf1eecafd"
  - "1cdf1558-34d4-442a-8fa8-5f96e7e87efb"
  - "7f2ec4c0-312c-46fc-9f17-6e7080a1c3d1"
  - "df48d791-f7b7-45c2-8451-a41fd3b5b652"
  - "6b39227d-4270-492d-ad82-6f2e55be0f88"
  - "6e98e353-4bbc-4ecf-900a-5b23fd27b21a"
source: "ndx-capture"
acceptanceCriteria:
  - "A real run file is committed by the workflow with every enabled model ok or a linked issue per failure"
  - "The mock run no longer exists under data/runs and the live home page shows the real week"
  - "Three model cards match the raw JSON values and the archive page, OG image, and feed include the new week"
description: "Add all provider keys to repository secrets, trigger benchmark.yml via workflow_dispatch, review the step summary, confirm the committed run file has status ok for every enabled model (or file an issue per failure and decide whether to disable the model), confirm deploy.yml ran and the live site shows the real week with the mock run removed from data/runs (keep it only under tests/fixtures), and spot-check three model cards against the raw JSON. Verify OG image, feed, and archive page for the new week."
lastModified: "2026-09-01T23:22:23.106Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

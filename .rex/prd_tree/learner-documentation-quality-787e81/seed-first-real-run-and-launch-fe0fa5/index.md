---
id: "fe0fa5fb-8ead-47be-bc5b-2ed9485f1797"
level: "feature"
title: "Seed first real run and launch v1.0.0"
status: "pending"
priority: "medium"
tags:
  - "launch"
blockedBy:
  - "6e12c8c3-5523-4137-9b78-3c935431fca8"
  - "6f906ca1-2da8-4df1-b322-944a948572b0"
  - "de9c4d57-00b0-4d0d-9ab0-eda878343fd3"
source: "ndx-capture"
acceptanceCriteria:
  - "A real run is committed with status ok for every enabled model or a linked issue for each failure, and the mock run no longer appears as the latest run on the live site"
  - "Repository has description, topics, social preview, and README badge and live link set"
  - "v1.0.0 tag and GitHub release with notes exist and CHANGELOG.md matches"
description: "Ship it. Run the first real weekly benchmark via workflow_dispatch, verify every provider succeeded or is documented as failing, confirm the live site renders real data with the mock run removed or clearly separated, then complete the launch checklist: repository description and topics, social preview image, README status badge and live link, CHANGELOG, LICENSE year, tag v1.0.0 with release notes, and a short launch post draft."
lastModified: "2026-09-01T18:47:03.535Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Complete the launch checklist and tag v1.0.0](./complete-the-launch-checklist-58a303.md) | blocked |
| [Publish a workflow-produced run and verify the live site](./publish-a-workflow-produced-run-348e17.md) | blocked |
| [Push to GitHub and enable the deployment path](./push-to-github-and-enable-the-d38737.md) | completed |

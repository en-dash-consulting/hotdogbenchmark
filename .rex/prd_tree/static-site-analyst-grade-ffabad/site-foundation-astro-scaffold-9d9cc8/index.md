---
id: "9d9cc82c-b23a-4464-b841-156c9e6d396a"
level: "feature"
title: "Site foundation: Astro scaffold, analyst-report design system, theming, and layout shell"
status: "completed"
priority: "high"
tags:
  - "site"
  - "design"
  - "a11y"
blockedBy:
  - "7b491be0-3e4c-4d74-a6e4-8ee87a7811f7"
  - "5c1c0eae-9ae0-4761-9be7-5fa60222625b"
source: "ndx-capture"
startedAt: "2026-09-01T22:09:01.097Z"
completedAt: "2026-09-01T22:09:01.097Z"
endedAt: "2026-09-01T22:09:01.097Z"
acceptanceCriteria:
  - "npm run build produces a static site under dist/ with correct base path for GitHub Pages and npm run dev serves it locally"
  - "Build-time data loader validates every data/runs file with the shared zod schema and fails the build on invalid data"
  - "Design tokens are defined once as CSS custom properties and both themes meet WCAG 2.2 AA contrast for text and UI components"
  - "Layout shell has a skip link, landmark regions, keyboard-reachable nav and theme toggle, and honors prefers-reduced-motion"
description: "Scaffold the Astro static site (output: static, zero client JS by default) that loads data/, questions.json, and models.json at build time via the shared schema, configure base path and asset handling for GitHub Pages, and build the visual foundation of the analyst-report design system: restrained corporate palette and categorical chart palette, editorial typography with tabular numerals, spacing and rule system, light/dark themes via prefers-color-scheme with an accessible manual toggle, visible focus styles, reduced-motion support, and the layout shell (skip link, masthead-style header with a text wordmark and nav for Reports / History / Methodology / How it works / About, footer with GitHub link, licence note, and last-updated line). Nothing in the visual system may read as playful; the words carry the joke."
lastModified: "2026-09-01T22:09:01.107Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

## Children

| Title | Status |
|-------|--------|
| [Build layout shell: skip link, header navigation, theme toggle, footer, and base metadata](./build-layout-shell-skip-link-b69fd9.md) | completed |
| [Define analyst-report design tokens, typography, light/dark themes, focus and motion styles](./define-analyst-report-design-24d567.md) | completed |
| [Scaffold Astro static site with build-time data loader and GitHub Pages base path](./scaffold-astro-static-site-with-dae050.md) | completed |

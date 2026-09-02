# Accessibility checklist

**Target:** WCAG 2.2 Level AA.

This document records what has been verified, how, and — importantly — what has **not** been
verified yet. A checklist that does not distinguish between "a machine checked this" and "a person
sat down with a screen reader" is not much of a checklist.

---

## Status summary

| Area                                             | Verified by                                                         | Status              |
| ------------------------------------------------ | ------------------------------------------------------------------- | ------------------- |
| WCAG rule violations                             | `npm run test:a11y` (axe-core, both themes, every page)             | ✅ Automated, in CI |
| Color contrast                                   | `tests/site/contrast.test.ts` (computed ratios over the token file) | ✅ Automated, in CI |
| Keyboard reachability and focus visibility       | `npm run test:audit`                                                | ✅ Automated        |
| Heading outline                                  | `npm run test:audit`                                                | ✅ Automated        |
| 320 px reflow and 200% zoom                      | `npm run test:audit`                                                | ✅ Automated        |
| Forced-colors mode                               | `npm run test:audit`                                                | ✅ Automated        |
| Structural markup (landmarks, one h1, skip link) | `tests/site/build-output.test.ts`                                   | ✅ Automated, in CI |
| **Screen-reader pass**                           | A person, with a screen reader                                      | ⚠️ **Not yet done** |

---

## What was verified automatically

Last run: **2026-09-01**, against a 17-page build.
Tooling: axe-core 4.x via `@axe-core/playwright`, Chromium via Playwright 1.62.

### axe-core — zero violations

`npm run test:a11y` serves `dist/` and runs axe over **every** built page in **both** light and
dark color schemes, with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.

Result: **0 violations across 34 page checks** (17 pages × 2 themes).

The checker itself was verified by injecting an `<img>` with no alt text into the built output and
confirming it failed with the page, theme, rule id and CSS selector. A checker that has never
failed is not yet known to work.

### Contrast — computed, not eyeballed

`tests/site/contrast.test.ts` parses `tokens.css` and computes actual WCAG ratios for 21 text
pairs at 4.5:1 and 9 UI pairs at 3:1, in both themes. It found and fixed `--faint` sitting at
4.32:1.

Categorical chart series are checked by CIE76 ΔE in Lab space rather than by luminance contrast,
which is the wrong measure for telling categories apart — a navy and an ochre of equal lightness
score 1.07:1 while being obviously different to look at. That check found `--chart-6` was a
near-duplicate of `--chart-1` (ΔE 9.8) and it is now a green.

### Keyboard and reflow — `npm run test:audit`

Per page, on all 17 pages:

- **Skip link is the first tab stop** and targets `#main`.
- **Every interactive element shows a visible focus indicator** — checked by focusing each one and
  reading its computed `outline` and `box-shadow`.
- **No skipped heading levels.**
- **No horizontal overflow at 320 px** (WCAG 1.4.10 Reflow).
- **No horizontal overflow at 200% zoom**, emulated as a 640 px viewport.
- **Verdict badges keep a border and visible text in forced-colors mode**, so they stay
  distinguishable when the palette is replaced entirely.

**One real defect was found and fixed by this pass:** the report pages had 24 px of horizontal
overflow at 320 px, because grid tracks declared `minmax(18rem, 1fr)` and `minmax(20rem, 1fr)`
demanded more width than the container had on a small phone. All auto-fill grids now use
`minmax(min(Xrem, 100%), 1fr)`.

---

## What still needs a person

**A screen-reader pass has not been done.** No automated tool can answer these, and this document
will not pretend otherwise:

- [ ] **Reading order.** Does a vendor profile read sensibly — vendor, model, verdict, answer,
      metrics — to somebody who cannot see the card layout?
- [ ] **Chart summaries.** Every chart has an `aria-label` stating the finding in words. Are those
      sentences actually useful, or do they merely exist? This is a judgment call and axe will
      always pass them.
- [ ] **Table navigation.** Do the results table and leaderboard navigate cell-by-cell correctly
      with row and column headers announced? Are the `aria-sort` changes announced when a column is
      sorted?
- [ ] **Live region.** Does the results-table filter actually announce the visible row count, and
      does it announce it _once_ rather than on every keystroke?
- [ ] **Landmark navigation.** Can a user jump between banner, navigation, main and contentinfo and
      get where they expect?
- [ ] **The `<details>` chart-data disclosures.** Are they discoverable, and is the relationship
      between a chart and its table clear when the chart itself is skipped?
- [ ] **Link purpose in context.** "Full archived report →" appears several times on the archive
      index. Is it clear which edition each refers to when read out of context?

Recommended: VoiceOver on macOS with Safari as a minimum, ideally plus NVDA on Windows with Firefox,
since the two disagree about table and live-region behavior often enough to matter.

When this is done, replace this section with the findings, the date, the screen reader and browser
versions, and either fix what was found or link the issues.

---

## Design decisions made for accessibility

Recorded here because they constrain future changes, and someone will otherwise undo them.

**Nothing is encoded by color alone.** Verdicts carry a glyph and a word as well as a color.
Chart series carry hatch patterns and direct labels. Rank movement carries an arrow and a word.
This is WCAG 1.4.1, and it is also what makes the site legible in forced-colors mode.

**Every chart has a real data table**, in a `<details>` disclosure rather than visually hidden.
Sighted readers want the numbers too, and a table that only screen-reader users can reach is a
table nobody tests.

**Null renders as an em dash with a reason** — "not reported by this provider", "no pricing on
file" — rather than as a bare dash or a zero. A screen-reader user hearing "dash" learns nothing.

**The theme toggle is a real `<button>` with `aria-pressed`**, and the theme is applied by an
inline pre-hydration script so there is no flash of the wrong theme.

**Sorting and filtering are progressive enhancements.** The table is complete and sensibly ordered
with JavaScript disabled; the controls are hidden in the markup and revealed by the script, so a
no-JS reader is never shown a control that cannot work.

**Hairline dividers are deliberately not held to 3:1.** WCAG 1.4.11 covers components a user must
identify to operate and graphics that carry information; a rule between table rows is decorative
structure, which the success criterion explicitly exempts. Holding dividers to 3:1 would mean
near-black lines throughout, which is not how a printed report looks. The focus ring, which _is_ a
UI indicator, is checked at 3:1 and passes.

---

## Running the checks

```sh
npm run build       # the checks run against dist/
npm run test:a11y   # axe-core, every page, both themes
npm run test:audit  # keyboard, focus, reflow, zoom, forced colors
npm test            # includes the contrast and structural tests
```

`test:a11y` runs in CI on every pull request. `test:audit` is currently a local command; wiring it
into CI is worth doing once its runtime is measured against the job budget.

# `src/site` — the Astro static site

The published analyst report. Zero client JavaScript by default; every chart is SVG generated
at build time. Reads `data/`, `questions.json`, and `models.json` through the shared zod
schemas, and fails the build rather than rendering data that does not validate.

Populated by the site epic. Until then this directory holds only this README.

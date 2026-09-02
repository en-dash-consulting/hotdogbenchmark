---
id: "0f727bfe-231f-4c10-abf8-59f781e37f31"
level: "feature"
title: "Structured data that is true: FAQPage, Dataset per edition, SoftwareSourceCode"
status: "pending"
priority: "high"
tags:
  - "launch"
  - "seo"
  - "site"
source: "ndx-capture"
acceptanceCriteria:
  - "The home page contains one application/ld+json FAQPage whose mainEntity questions match questions.json and whose answers contain the latest edition's tally and model names, validated by a build test that parses the JSON"
  - "Each edition page under /runs/ contains a Dataset JSON-LD block with datePublished, license, and a distribution contentUrl that resolves to that edition's JSON file"
  - "The About page contains SoftwareSourceCode JSON-LD pointing at the repository"
  - "A build test asserts every JSON-LD block parses and uses only these three types"
description: "JSON-LD, accurate over broad. The home page carries FAQPage with the shipped questions as questions and the models' actual majority answers as the answer text (for example \"6 of 11 models say yes: GPT-5.6 Sol, ... ; 5 say no: ...\"), regenerated from the latest edition at build. Each edition page carries Dataset: name, description, datePublished, license MIT, creator En Dash Consulting, and a distribution DataDownload pointing at the raw JSON on GitHub at the commit that published it. The About page carries SoftwareSourceCode for the repository with codeRepository, programmingLanguage and license. No other types; nothing the page is not."
lastModified: "2026-09-02T04:12:00.788Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

---
id: "295e2094-e4e4-4825-944c-275c4047727a"
level: "task"
title: "Write .env.example, .gitignore secret rules, and README skeleton"
status: "completed"
priority: "high"
tags:
  - "oss"
  - "security"
source: "ndx-capture"
startedAt: "2026-09-01T21:14:56.114Z"
completedAt: "2026-09-01T21:15:54.282Z"
endedAt: "2026-09-01T21:15:54.282Z"
resolutionType: "code-change"
resolutionDetail: ".env.example with all seven provider key variables (each with an acquisition URL) plus BENCH_SAMPLES/BENCH_CONCURRENCY/BENCH_TIMEOUT_MS/BENCH_SEED and site flags; .gitignore excludes .env and .env.* with !.env.example (verified via git check-ignore); README skeleton with pitch, exact question, weekly cadence, educational disclaimer, live-URL placeholder, and Quickstart/How it works/Adding a provider/Development/Contributing/License headers linking the OSS files.</resolutionDetail>\n</invoke>\n"
acceptanceCriteria:
  - ".env.example lists every provider key variable with an acquisition link comment and runner tuning defaults"
  - "git check-ignore .env and .env.local return ignored while .env.example is tracked"
  - "README contains the pitch, the exact benchmark question, the weekly cadence, the educational disclaimer, and the planned section headers"
description: "Create .env.example listing one variable per provider (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, XAI_API_KEY, MISTRAL_API_KEY, DEEPSEEK_API_KEY, GROQ_API_KEY or equivalent for hosted Llama) each with a comment linking to where to obtain it, plus BENCH_SAMPLES and BENCH_CONCURRENCY defaults. Extend .gitignore to exclude .env and .env.* while keeping .env.example. Replace the placeholder README with a skeleton: title, one-paragraph pitch, the question, weekly cadence, \"this is a silly example built to teach benchmarking\", live URL placeholder, and section headers for Quickstart, How it works, Adding a provider, Development, License."
lastModified: "2026-09-01T21:15:54.298Z"
lastModifiedBy: "Nick Daniel <nick@endash.us>"
---

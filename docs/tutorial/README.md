# Build a simple LLM benchmark

A walkthrough of how this repository works, in the order you would build it yourself. Each page
maps a concept to the file that implements it, so you can read the explanation and then the real
code rather than a simplified version of it.

You need no API keys. Mock mode replays recorded responses, so every command here runs offline.

| #   | Page                                                  | The problem it solves                                |
| --- | ----------------------------------------------------- | ---------------------------------------------------- |
| 0   | [Decide what you are measuring](00-intro.md)          | Why a fixed, silly prompt is a good first benchmark  |
| 1   | [Write one adapter](01-one-adapter.md)                | Turning one vendor's API into something reusable     |
| 2   | [Normalize usage and time it](02-usage-and-timing.md) | Token counts and latency that mean what you think    |
| 3   | [Add a second provider](03-second-provider.md)        | Where "just use the same interface" stops being easy |
| 4   | [Run it properly](04-running-it.md)                   | Sampling, concurrency, and one provider being down   |
| 5   | [Persist versioned data](05-persistence.md)           | Data you can still read in two years                 |
| 6   | [Automate it](06-automation.md)                       | Making it happen weekly without you                  |
| 7   | [Present it honestly](07-present-honestly.md)         | The hardest part, and the one people skip            |

Read them in order the first time. After that, page 3 and page 7 are the ones worth re-reading.

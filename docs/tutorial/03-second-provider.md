# 3. Add a second provider

**Implements:** [`src/providers/openai-compatible.ts`](../../src/providers/openai-compatible.ts),
[`src/providers/gemini.ts`](../../src/providers/gemini.ts)

The second provider is where you find out whether your abstraction was real.

## The good news: a lot of them are the same

Four of the seven vendors here speak OpenAI's chat-completions dialect: bearer auth,
`POST /chat/completions`, the same streaming chunk format. They share
[`openai-compatible.ts`](../../src/providers/openai-compatible.ts), and each adapter is about
fifteen lines that set a base URL.

Writing the SSE parsing four times would be four chances to get event framing subtly wrong in
four different ways.

## The bad news: "compatible" is doing a lot of work

The _request_ is uniform. The `usage` object is where they diverge — which is why `extractUsage`
is a hook rather than a fixed mapping.

DeepSeek reports prompt caching as top-level `prompt_cache_hit_tokens` rather than OpenAI's
nested `prompt_tokens_details.cached_tokens`. One field, but getting it wrong silently misstates
cost for a benchmark that sends the same prompt repeatedly.

## The genuinely different ones

**Gemini** has no `messages` array and no `usage` object. It has `contents` with `parts`, and
`usageMetadata`. Streaming is a different method on the URL, and needs `?alt=sse` or you get a
JSON array instead of events.

It also does something none of the others do: **returns HTTP 200 with no content** when a
response is filtered. The HTTP layer sees success. Without a specific check, that lands in the
run file as a model that answered with an empty string — a silent blank in the archive that reads
as data.

```ts
if (text === '') {
  throw new ProviderError(
    'bad_response',
    blockReason
      ? `Gemini returned no content (blocked: ${blockReason})`
      : 'Gemini returned no candidate content',
  )
}
```

**OpenAI itself** no longer speaks the dialect named after it: its current flagship is on the
Responses API, with different event names and different usage field names. So the file called
`openai.ts` does not use `openai-compatible.ts`.

## The lesson

Your abstraction should absorb the differences that are incidental — auth headers, base URLs,
field names — and _surface_ the ones that are real. Gemini's filtered-response behavior is real.
Hiding it behind a uniform interface would have meant publishing empty strings as answers.

## Exercise

Pick a provider not in `models.json` — Cohere, Perplexity, or an Ollama instance on your own
machine. Read its streaming documentation and decide, before writing anything, whether it can use
`openai-compatible.ts` or needs its own file.

Then check your answer against how it handles usage reporting on a streamed response. That is
usually where the surprise is.

**Next:** [4. Run it properly →](04-running-it.md)

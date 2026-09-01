/**
 * The one endpoint that touches a provider.
 *
 * `POST /v1/forward` takes `{ provider, url, headers, body }`, checks the URL
 * against the per-provider allowlist, forwards the request, and streams the
 * response back.
 *
 * ## What this endpoint deliberately does not do
 *
 * It does not **store** the caller's API key. It does not **log** it. It does
 * not log the prompt, the body, or any header. The key exists for the lifetime
 * of one `fetch` and is then unreachable.
 *
 * It also injects nothing: the proxy holds no credentials of its own, so a
 * compromised proxy leaks no keys, because it has none.
 */
import { isAllowedTarget } from './config.ts'
import { json } from './auth.ts'
import { checkRateLimit, DEFAULT_RATE_LIMIT, type RateLimitPolicy } from './ratelimit.ts'
import { logRequest, type Logger } from './log.ts'
import type { KVLike } from './config.ts'
import type { Session } from './session.ts'

export interface ForwardRequest {
  provider: string
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

/**
 * Headers the caller may set on the upstream request.
 *
 * An allowlist. Without it a caller could set `Host`, or a header that makes
 * the upstream behave differently in ways this proxy cannot reason about.
 */
const FORWARDABLE_REQUEST_HEADERS = new Set([
  'authorization',
  'content-type',
  'accept',
  'x-api-key',
  'anthropic-version',
  'x-goog-api-key',
])

/**
 * Headers stripped from the upstream response.
 *
 * `set-cookie` above all: an upstream must never be able to set a cookie on
 * this proxy's origin, which is the same origin that holds the session.
 */
const STRIPPED_RESPONSE_HEADERS = new Set([
  'set-cookie',
  'set-cookie2',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'content-encoding',
  'content-length',
])

export interface ForwardOptions {
  session: Session
  fetchImpl?: typeof fetch
  rateLimit?: RateLimitPolicy
  store?: KVLike
  log?: Logger
  now?: number
}

export async function handleForward(request: Request, options: ForwardOptions): Promise<Response> {
  const startedAt = Date.now()
  const { session, fetchImpl = fetch, log } = options

  const limit = await checkRateLimit(
    session.userId,
    options.rateLimit ?? DEFAULT_RATE_LIMIT,
    options.store,
    options.now,
  )
  if (!limit.allowed) {
    logRequest(
      {
        event: 'rate_limit',
        userId: session.userId,
        status: 429,
        durationMs: Date.now() - startedAt,
        reason: limit.scope ?? undefined,
      },
      log,
    )
    return json({ error: 'rate_limited', scope: limit.scope }, 429, {
      'retry-after': String(limit.retryAfter),
    })
  }

  let payload: ForwardRequest
  try {
    payload = (await request.json()) as ForwardRequest
  } catch {
    return reject(session, 'invalid_json', 400, startedAt, log)
  }

  if (!payload?.provider || !payload?.url) {
    return reject(session, 'missing_provider_or_url', 400, startedAt, log)
  }

  // The SSRF guard. Everything else in this file is hygiene; this is the wall.
  if (!isAllowedTarget(payload.provider, payload.url)) {
    return reject(session, 'target_not_allowed', 403, startedAt, log, payload.provider)
  }

  const upstreamHeaders = new Headers()
  for (const [name, value] of Object.entries(payload.headers ?? {})) {
    if (FORWARDABLE_REQUEST_HEADERS.has(name.toLowerCase())) {
      upstreamHeaders.set(name, value)
    }
  }

  let upstream: Response
  try {
    upstream = await fetchImpl(payload.url, {
      method: payload.method ?? 'POST',
      headers: upstreamHeaders,
      body: payload.body,
    })
  } catch {
    return reject(session, 'upstream_unreachable', 502, startedAt, log, payload.provider)
  }

  const responseHeaders = new Headers()
  for (const [name, value] of upstream.headers) {
    if (!STRIPPED_RESPONSE_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value)
    }
  }

  logRequest(
    {
      event: 'forward',
      userId: session.userId,
      provider: payload.provider,
      status: upstream.status,
      durationMs: Date.now() - startedAt,
    },
    log,
  )

  // The body is passed through as a stream, not buffered. A benchmark run
  // wants tokens as they arrive; buffering would destroy the time-to-first-token
  // measurement the whole project is built around.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

function reject(
  session: Session,
  reason: string,
  status: number,
  startedAt: number,
  log: Logger | undefined,
  provider?: string,
): Response {
  logRequest(
    {
      event: 'reject',
      userId: session.userId,
      provider,
      status,
      durationMs: Date.now() - startedAt,
      reason,
    },
    log,
  )
  return json({ error: reason }, status)
}

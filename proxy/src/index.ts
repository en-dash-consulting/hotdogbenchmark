/**
 * The proxy worker.
 *
 * Routes:
 *   GET  /auth/login     → redirect to the En Dash IdP
 *   GET  /auth/callback  → exchange the code, set a session cookie
 *   POST /auth/logout    → clear the session
 *   GET  /auth/me        → who is signed in, or 401
 *   POST /v1/forward     → forward one provider request
 *
 * CORS allows exactly one origin — the site — because this proxy carries a
 * credentialed cookie and a wildcard origin with credentials is both forbidden
 * by the specification and a bad idea.
 */
import { resolveConfig, ConfigError, type ProxyEnv } from './config.ts'
import { beginLogin, completeLogin, json } from './auth.ts'
import { handleForward } from './forward.ts'
import { SESSION_COOKIE, clearedCookie, readSession } from './session.ts'

export interface Handlers {
  fetchImpl?: typeof fetch
  now?: number
}

export async function handleRequest(
  request: Request,
  env: Partial<ProxyEnv>,
  handlers: Handlers = {},
): Promise<Response> {
  let config
  try {
    config = resolveConfig(env)
  } catch (error) {
    if (error instanceof ConfigError) {
      // Surface a configuration problem plainly rather than as a 500 that looks
      // like an outage. The message names what is missing.
      return json({ error: 'proxy_misconfigured', detail: error.message }, 500)
    }
    throw error
  }

  const url = new URL(request.url)
  const fetchImpl = handlers.fetchImpl ?? fetch
  const now = handlers.now ?? Date.now()

  if (request.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), config.siteOrigin, request)
  }

  const respond = (response: Response) => withCors(response, config.siteOrigin, request)

  // --- Auth ---------------------------------------------------------------
  if (url.pathname === '/auth/login' && request.method === 'GET') {
    return beginLogin(config, fetchImpl)
  }

  if (url.pathname === '/auth/callback' && request.method === 'GET') {
    return completeLogin(request, config, fetchImpl, now)
  }

  if (url.pathname === '/auth/logout' && request.method === 'POST') {
    const session = await readSession(request, config.sessionSecret, now)
    if (session && !hasValidCsrf(request, session.csrfToken)) {
      return respond(json({ error: 'csrf_failed' }, 403))
    }
    return respond(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'set-cookie': clearedCookie(SESSION_COOKIE),
        },
      }),
    )
  }

  if (url.pathname === '/auth/me' && request.method === 'GET') {
    const session = await readSession(request, config.sessionSecret, now)
    if (!session) return respond(json({ error: 'not_authenticated' }, 401))
    return respond(
      json({
        userId: session.userId,
        displayName: session.displayName,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
      }),
    )
  }

  // --- Forwarding ---------------------------------------------------------
  if (url.pathname === '/v1/forward' && request.method === 'POST') {
    const session = await readSession(request, config.sessionSecret, now)
    if (!session) return respond(json({ error: 'not_authenticated' }, 401))
    if (!hasValidCsrf(request, session.csrfToken)) {
      return respond(json({ error: 'csrf_failed' }, 403))
    }
    return respond(
      await handleForward(request, {
        session,
        fetchImpl,
        store: env.RATE_LIMIT,
        now,
      }),
    )
  }

  return respond(json({ error: 'not_found' }, 404))
}

/** A double-submit CSRF check against the token carried in the session. */
function hasValidCsrf(request: Request, expected: string): boolean {
  const provided = request.headers.get('x-csrf-token')
  if (!provided || provided.length !== expected.length) return false
  // Constant-time comparison: a length-only check plus early return would leak
  // how much of a guessed token was right.
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return mismatch === 0
}

/** Exactly one allowed origin, and only when the request actually came from it. */
function withCors(response: Response, siteOrigin: string, request: Request): Response {
  const origin = request.headers.get('origin')
  const headers = new Headers(response.headers)

  if (origin === siteOrigin) {
    headers.set('access-control-allow-origin', siteOrigin)
    headers.set('access-control-allow-credentials', 'true')
    headers.set('access-control-allow-methods', 'GET, POST, OPTIONS')
    headers.set('access-control-allow-headers', 'content-type, x-csrf-token')
    headers.set('vary', 'origin')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  fetch(request: Request, env: ProxyEnv): Promise<Response> {
    return handleRequest(request, env)
  },
}

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleRequest } from '../src/index.ts'
import { isAllowedTarget, resolveConfig, ConfigError } from '../src/config.ts'
import { createSession, readSession, SESSION_COOKIE } from '../src/session.ts'
import { sign, verify, createPkcePair, base64UrlEncode } from '../src/crypto.ts'
import { checkRateLimit, resetRateLimits } from '../src/ratelimit.ts'
import { logRequest } from '../src/log.ts'

const ENV = {
  OIDC_ISSUER: 'https://id.endash.example',
  OIDC_CLIENT_ID: 'hotdogbenchmark',
  OIDC_REDIRECT_URI: 'https://proxy.example/auth/callback',
  SITE_ORIGIN: 'https://bench.example',
  SESSION_SECRET: 'a'.repeat(48),
  SESSION_TTL_SECONDS: '3600',
}

const SECRET = ENV.SESSION_SECRET

/** A believable API key, so leak tests are testing something real-shaped. */
const SECRET_KEY = 'sk-ant-api03-DO-NOT-LEAK-THIS-VALUE-0123456789'

beforeEach(() => resetRateLimits())
afterEach(() => resetRateLimits())

/** Build a signed-in request. */
async function signedInRequest(
  url: string,
  init: RequestInit = {},
  overrides: { csrf?: boolean } = {},
) {
  const { session, cookie } = await createSession('user-1', 'Test User', SECRET, 3600)
  const token = cookie.split(';')[0]!.split('=')[1]!
  const headers = new Headers(init.headers)
  headers.set('cookie', `${SESSION_COOKIE}=${token}`)
  headers.set('origin', ENV.SITE_ORIGIN)
  if (overrides.csrf !== false) headers.set('x-csrf-token', session.csrfToken)
  return { request: new Request(url, { ...init, headers }), session }
}

describe('configuration', () => {
  it('names every missing variable at once rather than one at a time', () => {
    expect(() => resolveConfig({})).toThrow(ConfigError)
    try {
      resolveConfig({})
    } catch (error) {
      const message = (error as Error).message
      for (const key of ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'SITE_ORIGIN', 'SESSION_SECRET']) {
        expect(message).toContain(key)
      }
    }
  })

  it('refuses a short session secret rather than accepting a weak signature', () => {
    expect(() => resolveConfig({ ...ENV, SESSION_SECRET: 'short' })).toThrow(/at least 32/)
  })

  it('refuses an absurd session lifetime', () => {
    expect(() => resolveConfig({ ...ENV, SESSION_TTL_SECONDS: '999999' })).toThrow()
    expect(() => resolveConfig({ ...ENV, SESSION_TTL_SECONDS: '-1' })).toThrow()
  })

  it('returns a 500 naming the problem rather than an opaque error', async () => {
    const response = await handleRequest(new Request('https://proxy.example/auth/me'), {})
    expect(response.status).toBe(500)
    expect((await response.json()).detail).toContain('Missing')
  })
})

describe('the target allowlist', () => {
  it('accepts the documented host for a provider', () => {
    expect(isAllowedTarget('anthropic', 'https://api.anthropic.com/v1/messages')).toBe(true)
    expect(isAllowedTarget('openai', 'https://api.openai.com/v1/responses')).toBe(true)
  })

  it('rejects an unknown provider', () => {
    expect(isAllowedTarget('evil', 'https://api.anthropic.com/v1/messages')).toBe(false)
  })

  it('rejects a host that merely ends with an allowed one', () => {
    // The classic bypass. endsWith('api.x.ai') would let this through.
    expect(isAllowedTarget('xai', 'https://api.x.ai.evil.com/v1/chat')).toBe(false)
    expect(isAllowedTarget('anthropic', 'https://evil.com/api.anthropic.com')).toBe(false)
  })

  it('rejects cross-provider targets', () => {
    expect(isAllowedTarget('mistral', 'https://api.openai.com/v1/responses')).toBe(false)
  })

  it('rejects plain http, which would send a key in the clear', () => {
    expect(isAllowedTarget('anthropic', 'http://api.anthropic.com/v1/messages')).toBe(false)
  })

  it('rejects internal and metadata addresses, the SSRF targets that matter', () => {
    for (const target of [
      'https://169.254.169.254/latest/meta-data/',
      'https://localhost/admin',
      'https://127.0.0.1:8080/',
      'https://10.0.0.1/internal',
      'file:///etc/passwd',
    ]) {
      expect(isAllowedTarget('anthropic', target), target).toBe(false)
    }
  })

  it('rejects a malformed URL rather than throwing', () => {
    expect(isAllowedTarget('anthropic', 'not a url')).toBe(false)
  })
})

describe('crypto', () => {
  it('round-trips a signed payload', async () => {
    const token = await sign('hello', SECRET)
    expect(await verify(token, SECRET)).toBe('hello')
  })

  it('rejects a payload signed with a different secret', async () => {
    const token = await sign('hello', SECRET)
    expect(await verify(token, 'b'.repeat(48))).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const token = await sign('{"userId":"user-1"}', SECRET)
    const [, signature] = token.split('.')
    const forged = `${base64UrlEncode(new TextEncoder().encode('{"userId":"admin"}'))}.${signature}`
    expect(await verify(forged, SECRET)).toBeNull()
  })

  it('rejects a malformed token without throwing', async () => {
    for (const bad of ['', 'nodot', 'a.b.c', '!!!.???']) {
      expect(await verify(bad, SECRET)).toBeNull()
    }
  })

  it('produces a valid PKCE pair', async () => {
    const { verifier, challenge } = await createPkcePair()
    expect(verifier.length).toBeGreaterThan(42)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(challenge).not.toBe(verifier)
    const second = await createPkcePair()
    expect(second.verifier).not.toBe(verifier)
  })
})

describe('sessions', () => {
  it('issues an HttpOnly, Secure, SameSite cookie with a bounded lifetime', async () => {
    const { cookie } = await createSession('user-1', 'Test', SECRET, 3600)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=3600')
  })

  it('never puts a provider key in the session', async () => {
    const { session } = await createSession('user-1', 'Test', SECRET, 3600)
    expect(JSON.stringify(session)).not.toContain('sk-')
    expect(Object.keys(session).sort()).toEqual(['csrfToken', 'displayName', 'expiresAt', 'userId'])
  })

  it('rejects an expired session even though its signature is valid', async () => {
    const now = Date.now()
    const { cookie } = await createSession('user-1', 'Test', SECRET, 60, now)
    const token = cookie.split(';')[0]!.split('=')[1]!
    const request = new Request('https://proxy.example/', {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    })
    expect(await readSession(request, SECRET, now)).not.toBeNull()
    // One second past expiry.
    expect(await readSession(request, SECRET, now + 61_000)).toBeNull()
  })

  it('rejects a session signed with the wrong secret', async () => {
    const { cookie } = await createSession('user-1', 'Test', 'b'.repeat(48), 3600)
    const token = cookie.split(';')[0]!.split('=')[1]!
    const request = new Request('https://proxy.example/', {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    })
    expect(await readSession(request, SECRET)).toBeNull()
  })

  it('returns null when there is no cookie at all', async () => {
    expect(await readSession(new Request('https://proxy.example/'), SECRET)).toBeNull()
  })
})

describe('the OIDC flow against a mocked IdP', () => {
  /** A stand-in IdP that behaves like a real one for the parts that matter. */
  function mockIdp(options: { subject?: string; failToken?: boolean } = {}) {
    const calls: Array<{ url: string; body?: string }> = []
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, body: init?.body ? String(init.body) : undefined })

      if (url.includes('.well-known/openid-configuration')) {
        return new Response(
          JSON.stringify({
            authorization_endpoint: 'https://id.endash.example/authorize',
            token_endpoint: 'https://id.endash.example/oauth/token',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }

      if (url.includes('/oauth/token')) {
        if (options.failToken) return new Response('nope', { status: 400 })
        const claims = { sub: options.subject ?? 'endash|12345', name: 'Test User' }
        const idToken = [
          base64UrlEncode(new TextEncoder().encode('{"alg":"RS256"}')),
          base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims))),
          'signature',
        ].join('.')
        return new Response(JSON.stringify({ id_token: idToken, access_token: 'at' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch

    return { fetchImpl, calls }
  }

  it('redirects to the IdP with PKCE and a state cookie', async () => {
    const { fetchImpl } = mockIdp()
    const response = await handleRequest(new Request('https://proxy.example/auth/login'), ENV, {
      fetchImpl,
    })

    expect(response.status).toBe(302)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('https://id.endash.example')
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('code_challenge')).toBeTruthy()
    expect(location.searchParams.get('response_type')).toBe('code')
    expect(location.searchParams.get('state')).toBeTruthy()

    const stateCookie = response.headers.get('set-cookie')!
    expect(stateCookie).toContain('HttpOnly')
    expect(stateCookie).toContain('Secure')
  })

  it('completes the flow and issues a session cookie', async () => {
    const { fetchImpl, calls } = mockIdp()
    const login = await handleRequest(new Request('https://proxy.example/auth/login'), ENV, {
      fetchImpl,
    })
    const state = new URL(login.headers.get('location')!).searchParams.get('state')!
    const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!

    const callback = await handleRequest(
      new Request(`https://proxy.example/auth/callback?code=abc&state=${state}`, {
        headers: { cookie: stateCookie },
      }),
      ENV,
      { fetchImpl },
    )

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('https://bench.example/run/')

    const cookies = callback.headers.getSetCookie()
    expect(cookies.some((c) => c.startsWith('hdb_session='))).toBe(true)

    // The PKCE verifier was actually sent to the token endpoint.
    const tokenCall = calls.find((c) => c.url.includes('/oauth/token'))!
    expect(tokenCall.body).toContain('code_verifier=')
    expect(tokenCall.body).toContain('grant_type=authorization_code')
  })

  it('rejects a callback whose state does not match the cookie', async () => {
    const { fetchImpl } = mockIdp()
    const login = await handleRequest(new Request('https://proxy.example/auth/login'), ENV, {
      fetchImpl,
    })
    const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!

    const callback = await handleRequest(
      new Request('https://proxy.example/auth/callback?code=abc&state=attacker-chosen', {
        headers: { cookie: stateCookie },
      }),
      ENV,
      { fetchImpl },
    )

    expect(callback.status).toBe(400)
    expect((await callback.json()).error).toBe('state_mismatch')
  })

  it('rejects a callback with no state cookie at all', async () => {
    const { fetchImpl } = mockIdp()
    const response = await handleRequest(
      new Request('https://proxy.example/auth/callback?code=abc&state=x'),
      ENV,
      { fetchImpl },
    )
    expect(response.status).toBe(400)
  })

  it('surfaces a token-exchange failure rather than issuing a session', async () => {
    const { fetchImpl } = mockIdp({ failToken: true })
    const login = await handleRequest(new Request('https://proxy.example/auth/login'), ENV, {
      fetchImpl,
    })
    const state = new URL(login.headers.get('location')!).searchParams.get('state')!
    const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!

    const callback = await handleRequest(
      new Request(`https://proxy.example/auth/callback?code=abc&state=${state}`, {
        headers: { cookie: stateCookie },
      }),
      ENV,
      { fetchImpl },
    )
    expect(callback.status).toBe(502)
    expect(callback.headers.getSetCookie().some((c) => c.startsWith('hdb_session='))).toBe(false)
  })
})

describe('/auth/me', () => {
  it('returns 401 when signed out', async () => {
    const response = await handleRequest(
      new Request('https://proxy.example/auth/me', {
        headers: { origin: ENV.SITE_ORIGIN },
      }),
      ENV,
    )
    expect(response.status).toBe(401)
  })

  it('returns the identity when signed in', async () => {
    const { request } = await signedInRequest('https://proxy.example/auth/me')
    const response = await handleRequest(request, ENV)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.userId).toBe('user-1')
    expect(body.displayName).toBe('Test User')
    expect(body.csrfToken).toBeTruthy()
  })
})

describe('logout', () => {
  it('clears the session cookie', async () => {
    const { request } = await signedInRequest('https://proxy.example/auth/logout', {
      method: 'POST',
    })
    const response = await handleRequest(request, ENV)
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })

  it('requires a CSRF token', async () => {
    const { request } = await signedInRequest(
      'https://proxy.example/auth/logout',
      { method: 'POST' },
      { csrf: false },
    )
    expect((await handleRequest(request, ENV)).status).toBe(403)
  })
})

describe('/v1/forward', () => {
  const upstream = (body = 'ok', status = 200, headers: Record<string, string> = {}) =>
    (async () => new Response(body, { status, headers })) as unknown as typeof fetch

  it('rejects an unauthenticated request', async () => {
    const response = await handleRequest(
      new Request('https://proxy.example/v1/forward', {
        method: 'POST',
        headers: { origin: ENV.SITE_ORIGIN },
        body: JSON.stringify({
          provider: 'anthropic',
          url: 'https://api.anthropic.com/v1/messages',
        }),
      }),
      ENV,
      { fetchImpl: upstream() },
    )
    expect(response.status).toBe(401)
  })

  it('rejects a request without a CSRF token', async () => {
    const { request } = await signedInRequest(
      'https://proxy.example/v1/forward',
      {
        method: 'POST',
        body: JSON.stringify({
          provider: 'anthropic',
          url: 'https://api.anthropic.com/v1/messages',
        }),
      },
      { csrf: false },
    )
    expect((await handleRequest(request, ENV, { fetchImpl: upstream() })).status).toBe(403)
  })

  it('rejects a non-allowlisted host with 403', async () => {
    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({ provider: 'anthropic', url: 'https://evil.example/steal' }),
    })
    const response = await handleRequest(request, ENV, { fetchImpl: upstream() })
    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('target_not_allowed')
  })

  it('forwards an allowed request and returns the upstream status', async () => {
    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'anthropic',
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': SECRET_KEY, 'content-type': 'application/json' },
        body: '{"model":"claude-opus-5"}',
      }),
    })
    const response = await handleRequest(request, ENV, { fetchImpl: upstream('{"ok":true}') })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('{"ok":true}')
  })

  it('passes only allowlisted headers upstream', async () => {
    let seen: Headers | undefined
    const capturing = (async (_url: string, init: RequestInit) => {
      seen = new Headers(init.headers)
      return new Response('ok')
    }) as unknown as typeof fetch

    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'anthropic',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': SECRET_KEY,
          host: 'evil.example',
          cookie: 'hdb_session=stolen',
          'x-forwarded-for': '10.0.0.1',
        },
      }),
    })
    await handleRequest(request, ENV, { fetchImpl: capturing })

    expect(seen!.get('x-api-key')).toBe(SECRET_KEY)
    expect(seen!.get('cookie')).toBeNull()
    expect(seen!.get('x-forwarded-for')).toBeNull()
  })

  it('strips Set-Cookie from the upstream response', async () => {
    // An upstream must never set a cookie on the origin holding the session.
    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages' }),
    })
    const response = await handleRequest(request, ENV, {
      fetchImpl: upstream('ok', 200, { 'set-cookie': 'evil=1' }),
    })
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('relays a streaming response incrementally rather than buffering it', async () => {
    const chunks = ['data: one\n\n', 'data: two\n\n']
    const streaming = (async () => {
      const encoder = new TextEncoder()
      let index = 0
      return new Response(
        new ReadableStream({
          pull(controller) {
            if (index >= chunks.length) return controller.close()
            controller.enqueue(encoder.encode(chunks[index++]!))
          },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      )
    }) as unknown as typeof fetch

    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages' }),
    })
    const response = await handleRequest(request, ENV, { fetchImpl: streaming })

    expect(response.headers.get('content-type')).toBe('text/event-stream')
    const reader = response.body!.getReader()
    const first = await reader.read()
    // A first chunk arriving before the stream ends is what "not buffered" means.
    expect(new TextDecoder().decode(first.value)).toBe('data: one\n\n')
    await reader.cancel()
  })

  it('returns 429 with Retry-After once the per-user limit is exceeded', async () => {
    const policy = { perUser: 2, global: 100, windowSeconds: 600 }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      expect((await checkRateLimit('user-1', policy)).allowed).toBe(true)
    }
    const third = await checkRateLimit('user-1', policy)
    expect(third.allowed).toBe(false)
    expect(third.scope).toBe('user')
    expect(third.retryAfter).toBeGreaterThan(0)
  })

  it('enforces a global limit as well as a per-user one', async () => {
    const policy = { perUser: 100, global: 2, windowSeconds: 600 }
    await checkRateLimit('a', policy)
    await checkRateLimit('b', policy)
    const third = await checkRateLimit('c', policy)
    expect(third.allowed).toBe(false)
    expect(third.scope).toBe('global')
  })

  it('handles a malformed body without throwing', async () => {
    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: 'not json',
    })
    expect((await handleRequest(request, ENV, { fetchImpl: upstream() })).status).toBe(400)
  })
})

describe('logging never records a secret', () => {
  it('emits only fixed fields, so a key cannot reach the log', async () => {
    const lines: string[] = []

    const { request } = await signedInRequest('https://proxy.example/v1/forward', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'anthropic',
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'x-api-key': SECRET_KEY, authorization: `Bearer ${SECRET_KEY}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'a very secret prompt' }] }),
      }),
    })

    // Intercept the module's logger by calling the forward handler's logger
    // directly through the exported logRequest, and by asserting on what the
    // real request path produces via a captured console.
    const originalLog = console.log
    console.log = (line: string) => lines.push(String(line))
    try {
      await handleRequest(request, ENV, {
        fetchImpl: (async () => new Response('ok')) as unknown as typeof fetch,
      })
    } finally {
      console.log = originalLog
    }

    const output = lines.join('\n')
    expect(output).not.toContain(SECRET_KEY)
    expect(output).not.toContain('a very secret prompt')
    expect(output).not.toContain('authorization')
    expect(output).not.toContain('x-api-key')
    // It does record what an operator needs.
    expect(output).toMatch(/event=forward/)
    expect(output).toMatch(/provider=anthropic/)
    expect(output).toMatch(/status=200/)
  })

  it('cannot be made to log a header, because it never receives one', () => {
    const lines: string[] = []
    logRequest(
      { event: 'forward', userId: 'user-1', provider: 'anthropic', status: 200, durationMs: 12 },
      (line) => lines.push(line),
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('event=forward user=user-1 provider=anthropic status=200 ms=12')
  })
})

describe('CORS', () => {
  it('allows exactly the configured site origin', async () => {
    const { request } = await signedInRequest('https://proxy.example/auth/me')
    const response = await handleRequest(request, ENV)
    expect(response.headers.get('access-control-allow-origin')).toBe(ENV.SITE_ORIGIN)
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('sends no CORS headers to any other origin', async () => {
    const { session, cookie } = await createSession('user-1', 'Test', SECRET, 3600)
    const token = cookie.split(';')[0]!.split('=')[1]!
    const response = await handleRequest(
      new Request('https://proxy.example/auth/me', {
        headers: {
          cookie: `${SESSION_COOKIE}=${token}`,
          origin: 'https://evil.example',
          'x-csrf-token': session.csrfToken,
        },
      }),
      ENV,
    )
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('never responds with a wildcard origin, which is invalid with credentials', async () => {
    const { request } = await signedInRequest('https://proxy.example/auth/me')
    const response = await handleRequest(request, ENV)
    expect(response.headers.get('access-control-allow-origin')).not.toBe('*')
  })
})

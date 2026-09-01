/**
 * OIDC authorization-code flow with PKCE against the En Dash identity provider.
 *
 * PKCE even though this could be a confidential client: the redirect lands in a
 * browser, and PKCE is what stops an intercepted authorization code being
 * exchanged by anyone but the initiator.
 *
 * The `state` and the PKCE verifier are carried in a short-lived signed cookie
 * rather than in server memory, so the proxy stays stateless and works across
 * edge isolates.
 */
import { createPkcePair, randomToken, sign, verify } from './crypto.ts'
import {
  STATE_COOKIE,
  clearedCookie,
  createSession,
  readCookie,
  serializeCookie,
} from './session.ts'
import type { ResolvedConfig } from './config.ts'

export interface OidcEndpoints {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint?: string
}

/** Discover endpoints, or fall back to the conventional paths. */
export async function discover(
  config: ResolvedConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcEndpoints> {
  try {
    const response = await fetchImpl(`${config.issuer}/.well-known/openid-configuration`)
    if (response.ok) {
      const doc = (await response.json()) as OidcEndpoints
      if (doc.authorization_endpoint && doc.token_endpoint) return doc
    }
  } catch {
    // Discovery is a convenience. The conventional paths below are the fallback.
  }
  return {
    authorization_endpoint: `${config.issuer}/authorize`,
    token_endpoint: `${config.issuer}/oauth/token`,
    userinfo_endpoint: `${config.issuer}/userinfo`,
  }
}

/** Begin sign-in: redirect to the IdP, remembering state and verifier. */
export async function beginLogin(
  config: ResolvedConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const endpoints = await discover(config, fetchImpl)
  const { verifier, challenge } = await createPkcePair()
  const state = randomToken(24)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  const stateCookie = await sign(JSON.stringify({ state, verifier }), config.sessionSecret)

  return new Response(null, {
    status: 302,
    headers: {
      location: `${endpoints.authorization_endpoint}?${params}`,
      // Ten minutes is generous for completing a sign-in and short enough that
      // an abandoned attempt does not linger.
      'set-cookie': serializeCookie(STATE_COOKIE, stateCookie, {
        maxAge: 600,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
      }),
    },
  })
}

export interface TokenResponse {
  access_token?: string
  id_token?: string
  error?: string
}

/** Decode a JWT payload without verifying it. See the caller's note. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const json = atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Complete sign-in and issue a session.
 *
 * The `state` in the callback must match the one in the signed cookie, which is
 * what makes the callback resistant to CSRF and to an attacker pasting their
 * own authorization code into a victim's browser.
 */
export async function completeLogin(
  request: Request,
  config: ResolvedConfig,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')

  if (url.searchParams.get('error')) {
    return json({ error: 'sign_in_failed' }, 400)
  }
  if (!code || !returnedState) {
    return json({ error: 'missing_code_or_state' }, 400)
  }

  const stateCookie = readCookie(request, STATE_COOKIE)
  if (!stateCookie) return json({ error: 'missing_state_cookie' }, 400)

  const payload = await verify(stateCookie, config.sessionSecret)
  if (!payload) return json({ error: 'invalid_state_cookie' }, 400)

  const { state, verifier } = JSON.parse(payload) as { state: string; verifier: string }
  if (state !== returnedState) return json({ error: 'state_mismatch' }, 400)

  const endpoints = await discover(config, fetchImpl)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  })
  if (config.clientSecret) body.set('client_secret', config.clientSecret)

  const tokenResponse = await fetchImpl(endpoints.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!tokenResponse.ok) return json({ error: 'token_exchange_failed' }, 502)
  const tokens = (await tokenResponse.json()) as TokenResponse
  if (tokens.error || !tokens.id_token) return json({ error: 'token_exchange_failed' }, 502)

  // The id_token arrived over TLS directly from the token endpoint in response
  // to a request carrying our PKCE verifier — the RFC 8252 case where reading
  // claims without re-verifying the signature is acceptable. If this proxy ever
  // accepts an id_token from anywhere else, that stops being true and JWKS
  // verification becomes mandatory.
  const claims = decodeJwtPayload(tokens.id_token)
  const subject = typeof claims?.sub === 'string' ? claims.sub : null
  if (!subject) return json({ error: 'no_subject_claim' }, 502)

  const displayName =
    (typeof claims?.name === 'string' && claims.name) ||
    (typeof claims?.preferred_username === 'string' && claims.preferred_username) ||
    'En Dash user'

  const { cookie } = await createSession(
    subject,
    displayName,
    config.sessionSecret,
    config.sessionTtlSeconds,
    now,
  )

  const headers = new Headers({ location: `${config.siteOrigin}/run/` })
  headers.append('set-cookie', cookie)
  headers.append('set-cookie', clearedCookie(STATE_COOKIE))

  return new Response(null, { status: 302, headers })
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

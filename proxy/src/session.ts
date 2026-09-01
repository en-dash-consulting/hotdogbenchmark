/**
 * Sessions, as a signed cookie.
 *
 * No server-side session store. The session is a signed payload the client
 * carries, holding a user id, a display name, a CSRF token and an expiry —
 * and nothing else. In particular it never holds a provider API key: those
 * live in the browser's session storage and arrive per request.
 *
 * The cookie is HttpOnly (so a script cannot read it), Secure, and
 * SameSite=Lax (so a cross-site form post cannot ride on it).
 */
import { randomToken, sign, verify } from './crypto.ts'

export const SESSION_COOKIE = 'hdb_session'
export const STATE_COOKIE = 'hdb_oidc_state'

export interface Session {
  /** Subject claim from the IdP. */
  userId: string
  displayName: string
  /** Compared against the X-CSRF-Token header on state-changing requests. */
  csrfToken: string
  /** Unix seconds. */
  expiresAt: number
}

export async function createSession(
  userId: string,
  displayName: string,
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
): Promise<{ session: Session; cookie: string }> {
  const session: Session = {
    userId,
    displayName,
    csrfToken: randomToken(24),
    expiresAt: Math.floor(now / 1000) + ttlSeconds,
  }
  const token = await sign(JSON.stringify(session), secret)
  return {
    session,
    cookie: serializeCookie(SESSION_COOKIE, token, {
      maxAge: ttlSeconds,
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
    }),
  }
}

/** Read and verify the session cookie, or null. */
export async function readSession(
  request: Request,
  secret: string,
  now = Date.now(),
): Promise<Session | null> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null

  const payload = await verify(token, secret)
  if (!payload) return null

  let session: Session
  try {
    session = JSON.parse(payload) as Session
  } catch {
    return null
  }

  // A valid signature over an expired session is still expired. Checking the
  // signature without checking the expiry would make the TTL decorative.
  if (typeof session.expiresAt !== 'number' || session.expiresAt * 1000 <= now) return null
  if (!session.userId) return null

  return session
}

/** A cookie that clears the session. */
export function clearedCookie(name: string): string {
  return serializeCookie(name, '', {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  })
}

export interface CookieOptions {
  maxAge: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  path?: string
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${value}`, `Max-Age=${options.maxAge}`, `Path=${options.path ?? '/'}`]
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`)
  return parts.join('; ')
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=')
    if (index === -1) continue
    if (pair.slice(0, index).trim() === name) return pair.slice(index + 1).trim()
  }
  return null
}

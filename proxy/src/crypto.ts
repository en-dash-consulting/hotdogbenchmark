/**
 * Signing and PKCE, using Web Crypto only.
 *
 * Web Crypto rather than a Node builtin so the same code runs in a Cloudflare
 * Worker, in Node for the tests, and in any other edge runtime — the same
 * portability constraint the benchmark adapters follow.
 */

const encoder = new TextEncoder()

/** URL-safe base64 without padding, which is what OAuth and JWT-ish tokens use. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/** Cryptographically random bytes, base64url encoded. */
export function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** Sign a payload as `<base64url payload>.<base64url signature>`. */
export async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${base64UrlEncode(encoder.encode(payload))}.${base64UrlEncode(new Uint8Array(signature))}`
}

/**
 * Verify and unwrap a signed token, or return null.
 *
 * Verification uses `crypto.subtle.verify`, which is constant-time. Comparing
 * signature strings with `===` would leak timing information about how much of
 * a forged signature was correct.
 */
export async function verify(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encodedPayload, encodedSignature] = parts as [string, string]

  let payload: string
  try {
    payload = new TextDecoder().decode(base64UrlDecode(encodedPayload))
  } catch {
    return null
  }

  try {
    const key = await hmacKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(encodedSignature) as unknown as ArrayBuffer,
      encoder.encode(payload),
    )
    return valid ? payload : null
  } catch {
    return null
  }
}

/** A PKCE verifier and its S256 challenge. */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(64)
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier))
  return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) }
}

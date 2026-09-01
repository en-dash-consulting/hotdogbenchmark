/**
 * Proxy configuration, all from environment bindings.
 *
 * Nothing here has a default that would work in production by accident. A
 * missing value is a startup error, not a silent fallback — a proxy that
 * starts with no session secret is worse than one that refuses to start.
 */
export interface ProxyEnv {
  /** En Dash OIDC issuer, e.g. https://id.endash.example */
  OIDC_ISSUER: string
  OIDC_CLIENT_ID: string
  /** Confidential-client secret. Optional: PKCE alone is fine for a public client. */
  OIDC_CLIENT_SECRET?: string
  /** Must exactly match a redirect URI registered with the IdP. */
  OIDC_REDIRECT_URI: string
  /** The single origin allowed to call this proxy. Not a list, and never "*". */
  SITE_ORIGIN: string
  /** 32+ random bytes, base64. Signs session and state cookies. */
  SESSION_SECRET: string
  /** Session lifetime in seconds. Short by design; re-authenticating is cheap. */
  SESSION_TTL_SECONDS?: string
  /** Optional KV namespace for rate limiting. Falls back to in-memory. */
  RATE_LIMIT?: KVLike
}

/** The slice of a Workers KV binding this proxy uses. */
export interface KVLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

export interface ResolvedConfig {
  issuer: string
  clientId: string
  clientSecret: string | null
  redirectUri: string
  siteOrigin: string
  sessionSecret: string
  sessionTtlSeconds: number
}

export class ConfigError extends Error {}

/** Validate the environment, or throw naming every missing variable at once. */
export function resolveConfig(env: Partial<ProxyEnv>): ResolvedConfig {
  const required = [
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_REDIRECT_URI',
    'SITE_ORIGIN',
    'SESSION_SECRET',
  ] as const

  const missing = required.filter((key) => !env[key])
  if (missing.length > 0) {
    throw new ConfigError(
      `Proxy is not configured. Missing: ${missing.join(', ')}. See docs/proxy.md.`,
    )
  }

  // A short secret is a weak signature. Refuse rather than accept it.
  if (env.SESSION_SECRET!.length < 32) {
    throw new ConfigError('SESSION_SECRET must be at least 32 characters.')
  }

  const ttl = Number(env.SESSION_TTL_SECONDS ?? 3600)
  if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 86_400) {
    throw new ConfigError('SESSION_TTL_SECONDS must be a positive number up to 86400.')
  }

  return {
    issuer: env.OIDC_ISSUER!.replace(/\/$/, ''),
    clientId: env.OIDC_CLIENT_ID!,
    clientSecret: env.OIDC_CLIENT_SECRET ?? null,
    redirectUri: env.OIDC_REDIRECT_URI!,
    siteOrigin: env.SITE_ORIGIN!.replace(/\/$/, ''),
    sessionSecret: env.SESSION_SECRET!,
    sessionTtlSeconds: ttl,
  }
}

/**
 * Hosts this proxy will forward to, per provider.
 *
 * An **allowlist, not a blocklist**. Without it, an authenticated user could
 * point the `url` field at any host on the internet and use this proxy as an
 * SSRF gadget against the platform's internal network. This is the single most
 * important line in the proxy.
 */
export const PROVIDER_HOSTS: Record<string, string> = {
  anthropic: 'api.anthropic.com',
  openai: 'api.openai.com',
  gemini: 'generativelanguage.googleapis.com',
  xai: 'api.x.ai',
  mistral: 'api.mistral.ai',
  deepseek: 'api.deepseek.com',
  'llama-hosted': 'api.together.xyz',
}

/** Whether a URL is one this proxy is willing to forward to for a provider. */
export function isAllowedTarget(provider: string, target: string): boolean {
  const host = PROVIDER_HOSTS[provider]
  if (!host) return false
  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return false
  }
  // https only, exact host match. No subdomain wildcards: "api.x.ai.evil.com"
  // passes a naive endsWith check and is not xAI.
  return parsed.protocol === 'https:' && parsed.hostname === host
}

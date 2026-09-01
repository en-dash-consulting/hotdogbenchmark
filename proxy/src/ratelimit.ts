/**
 * Per-user and global rate limiting.
 *
 * A fixed window rather than a sliding one: it is a few lines, it is
 * comprehensible, and the failure mode (up to 2x the limit across a window
 * boundary) is acceptable for what this protects. A user who wants to run more
 * benchmarks than this can run the CLI, which costs them their own money
 * rather than this proxy's compute budget.
 *
 * Backed by KV when available and by an in-memory map otherwise. The in-memory
 * fallback is per-isolate and therefore approximate under load — stated here
 * because an approximate limiter presented as exact is worse than none.
 */
import type { KVLike } from './config.ts'

export interface RateLimitPolicy {
  /** Requests allowed per user per window. */
  perUser: number
  /** Requests allowed across all users per window. */
  global: number
  windowSeconds: number
}

export const DEFAULT_RATE_LIMIT: RateLimitPolicy = {
  perUser: 60,
  global: 600,
  windowSeconds: 600,
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the current window ends. */
  retryAfter: number
  scope: 'user' | 'global' | null
}

const memory = new Map<string, { count: number; resetAt: number }>()

async function bump(
  key: string,
  windowSeconds: number,
  store: KVLike | undefined,
  now: number,
): Promise<number> {
  const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds
  const windowKey = `${key}:${windowStart}`

  if (store) {
    const current = Number((await store.get(windowKey)) ?? 0)
    const next = current + 1
    await store.put(windowKey, String(next), { expirationTtl: windowSeconds * 2 })
    return next
  }

  const entry = memory.get(windowKey)
  if (entry && entry.resetAt > now) {
    entry.count += 1
    return entry.count
  }
  memory.set(windowKey, { count: 1, resetAt: (windowStart + windowSeconds) * 1000 })
  // Bound the map so a long-lived isolate does not accumulate windows forever.
  if (memory.size > 5000) {
    for (const [existing, value] of memory) {
      if (value.resetAt <= now) memory.delete(existing)
    }
  }
  return 1
}

export async function checkRateLimit(
  userId: string,
  policy: RateLimitPolicy = DEFAULT_RATE_LIMIT,
  store?: KVLike,
  now = Date.now(),
): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / 1000 / policy.windowSeconds) * policy.windowSeconds
  const retryAfter = Math.max(1, windowStart + policy.windowSeconds - Math.floor(now / 1000))

  const userCount = await bump(`user:${userId}`, policy.windowSeconds, store, now)
  if (userCount > policy.perUser) {
    return { allowed: false, retryAfter, scope: 'user' }
  }

  const globalCount = await bump('global', policy.windowSeconds, store, now)
  if (globalCount > policy.global) {
    return { allowed: false, retryAfter, scope: 'global' }
  }

  return { allowed: true, retryAfter: 0, scope: null }
}

/** Reset all in-memory counters. Tests only. */
export function resetRateLimits(): void {
  memory.clear()
}

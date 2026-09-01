/**
 * Provider keys in the browser.
 *
 * **sessionStorage, never localStorage, never a cookie.** sessionStorage is
 * scoped to the tab and cleared when it closes, which is the shortest lifetime
 * available without asking the user to retype a key on every request. A cookie
 * would be sent automatically to the origin on every request, including ones
 * that have nothing to do with running a benchmark.
 *
 * Keys are namespaced so `clearKeys()` cannot miss one, and so nothing else on
 * the origin collides with them.
 */
const PREFIX = 'hdb:key:'

/** Every storage access is guarded: sessionStorage throws outright in some privacy modes. */
function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function setKey(provider: string, value: string): void {
  const store = storage()
  if (!store) return
  const trimmed = value.trim()
  if (trimmed) store.setItem(PREFIX + provider, trimmed)
  else store.removeItem(PREFIX + provider)
}

export function getKey(provider: string): string | null {
  return storage()?.getItem(PREFIX + provider) ?? null
}

export function configuredProviders(): string[] {
  const store = storage()
  if (!store) return []
  const found: string[] = []
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index)
    if (key?.startsWith(PREFIX)) found.push(key.slice(PREFIX.length))
  }
  return found.sort()
}

/**
 * Remove every key.
 *
 * Called on sign-out and by the explicit "clear keys" control. Iterates a
 * snapshot of the key list because removing during iteration reindexes the
 * store and would skip entries.
 */
export function clearKeys(): void {
  const store = storage()
  if (!store) return
  const toRemove: string[] = []
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index)
    if (key?.startsWith(PREFIX)) toRemove.push(key)
  }
  for (const key of toRemove) store.removeItem(key)
}

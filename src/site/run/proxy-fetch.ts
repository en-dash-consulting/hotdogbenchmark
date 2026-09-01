/**
 * A `fetch` that routes provider calls through the proxy.
 *
 * This is the only reason the adapters take an injected `fetch`. They are
 * handed this function and behave exactly as they do in the CLI — the adapter
 * code has no idea a proxy exists.
 *
 * The provider key travels in the request body to the proxy, over TLS, and is
 * never stored anywhere but the tab's sessionStorage.
 */
export interface ProxyFetchOptions {
  proxyOrigin: string
  provider: string
  csrfToken: string
}

export function createProxyFetch(options: ProxyFetchOptions): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    // Flatten headers into a plain object; the proxy allowlists which of them
    // it will actually forward upstream.
    const headers: Record<string, string> = {}
    new Headers(init.headers).forEach((value, name) => {
      headers[name] = value
    })

    const body =
      typeof init.body === 'string' ? init.body : init.body ? String(init.body) : undefined

    return fetch(`${options.proxyOrigin}/v1/forward`, {
      method: 'POST',
      // The session cookie must ride along, hence credentials: 'include'.
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': options.csrfToken,
      },
      body: JSON.stringify({
        provider: options.provider,
        url,
        method: init.method ?? 'POST',
        headers,
        body,
      }),
      signal: init.signal ?? null,
    })
  }) as typeof globalThis.fetch
}

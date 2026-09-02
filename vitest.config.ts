import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'proxy/tests/**/*.test.ts'],
    environment: 'node',
    // The end-to-end tests spawn the CLI and build the site; the 5 s default is
    // for unit tests. The site builders set longer per-suite timeouts still.
    testTimeout: 30_000,
  },
})

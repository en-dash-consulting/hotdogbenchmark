import { afterAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The Run Your Own page must be genuinely absent when its flag is off — not
 * hidden with CSS, not a 404 page, simply not built.
 *
 * This test builds the site twice, which is slow, and is worth it: the first
 * implementation used a static `run.astro`, whose getStaticPaths Astro ignores
 * entirely, so the page shipped unconditionally. Nothing short of inspecting
 * the built output would have caught that.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))

/**
 * Its own output directory, not dist/. Test files run in parallel and another
 * suite asserts over dist/; sharing it means one test deletes the directory
 * the other is reading.
 */
const DIST = join(ROOT, 'dist-feature-flag-test')

/** Every built page, so a per-page assertion cannot miss one. */
function htmlFiles(dir = DIST): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return htmlFiles(full)
    return name.endsWith('.html') ? [full] : []
  })
}

function buildWith(env: NodeJS.ProcessEnv) {
  rmSync(DIST, { recursive: true, force: true })
  execFileSync('npm', ['run', 'build:site'], {
    cwd: ROOT,
    env: { ...process.env, ASTRO_OUT_DIR: DIST, ...env },
    stdio: 'ignore',
  })
}

describe('RUN_YOUR_OWN_ENABLED', () => {
  it('omits the page and the nav entry when unset', () => {
    buildWith({ RUN_YOUR_OWN_ENABLED: '' })
    expect(existsSync(join(DIST, 'run')), '/run/ was emitted with the flag off').toBe(false)
    const home = readFileSync(join(DIST, 'index.html'), 'utf8')
    expect(home, 'nav shows Run your own with the flag off').not.toContain('Run your own')
  }, 180_000)

  it('emits the page and the nav entry when true', () => {
    buildWith({ RUN_YOUR_OWN_ENABLED: 'true' })
    expect(existsSync(join(DIST, 'run', 'index.html'))).toBe(true)

    const page = readFileSync(join(DIST, 'run', 'index.html'), 'utf8')
    // The key-handling commitments are the point of the stub.
    expect(page).toMatch(/session storage/i)
    expect(page).toMatch(/Cleared on sign-out/i)
    expect(page).toMatch(/never logged/i)
    expect(page).toMatch(/never written to/i)
    // The working form, with the controls the flow needs.
    expect(page).toContain('id="run-form"')
    expect(page).toContain('id="sign-in"')
    expect(page).toContain('id="key-fields"')
    expect(page).toContain('id="prompt-preview"')
    // A live region for progress, since a run takes seconds.
    expect(page).toMatch(/aria-live="polite"/)
    // And a pointer to the thing that needs no proxy at all.
    expect(page).toContain('npm run bench')

    const home = readFileSync(join(DIST, 'index.html'), 'utf8')
    expect(home).toContain('Run your own')
  }, 180_000)
})

afterAll(() => {
  rmSync(DIST, { recursive: true, force: true })
})

describe('PUBLIC_GA_MEASUREMENT_ID', () => {
  it('ships no analytics markup when unset', () => {
    buildWith({ PUBLIC_GA_MEASUREMENT_ID: '' })
    for (const file of htmlFiles()) {
      const html = readFileSync(file, 'utf8')
      expect(html, file).not.toContain('googletagmanager')
      expect(html, file).not.toContain('data-analytics')
    }
  })

  it('tags every page with the ID when set, and ignores a malformed one', () => {
    buildWith({ PUBLIC_GA_MEASUREMENT_ID: 'G-TEST12345' })
    for (const file of htmlFiles()) {
      const html = readFileSync(file, 'utf8')
      expect(html, file).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST12345')
      expect(html, file).toContain("gtag('config','G-TEST12345'")
    }
    buildWith({ PUBLIC_GA_MEASUREMENT_ID: '<script>alert(1)</script>' })
    for (const file of htmlFiles()) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('googletagmanager')
    }
  })
})

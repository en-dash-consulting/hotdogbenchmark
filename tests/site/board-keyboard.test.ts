import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { rmSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from 'playwright'

/**
 * The answer board, driven by keyboard alone.
 *
 * Builds the site into its own directory, serves it, and walks the board the
 * way a keyboard user would: the question tabs move with arrow keys and
 * follow the WAI-ARIA tablist pattern, the framing buttons are a radio group,
 * and one polite live region carries every announcement. Reduced motion is
 * on so the replay lands immediately and the test does not wait on timers.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DIST = join(ROOT, 'dist-board-test')
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
}

let server: Server
let port: number
let browser: Browser

beforeAll(async () => {
  rmSync(DIST, { recursive: true, force: true })
  execFileSync('npx', ['astro', 'build'], {
    cwd: ROOT,
    env: { ...process.env, ASTRO_OUT_DIR: DIST },
    stdio: 'ignore',
  })
  server = createServer(async (request, response) => {
    try {
      let path = join(DIST, decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname))
      const info = await stat(path).catch(() => null)
      if (info?.isDirectory()) path = join(path, 'index.html')
      response.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'text/plain' })
      response.end(await readFile(path))
    } catch {
      response.writeHead(404).end()
    }
  })
  port = await new Promise<number>((done) =>
    server.listen(0, () => done((server.address() as { port: number }).port)),
  )
  browser = await chromium.launch()
}, 180_000)

afterAll(async () => {
  await browser?.close()
  server?.close()
  rmSync(DIST, { recursive: true, force: true })
})

async function open() {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  return page
}

describe('the answer board by keyboard', () => {
  it('marks the question tabs and framing radios with the right roles and states', async () => {
    const page = await open()
    expect(await page.locator('[role="tablist"] [role="tab"]').count()).toBeGreaterThan(1)
    expect(await page.locator('[role="tab"][aria-selected="true"]').count()).toBe(1)
    expect(await page.locator('[role="radiogroup"] [role="radio"]').count()).toBeGreaterThan(1)
    expect(await page.locator('[role="radio"][aria-checked="true"]').count()).toBe(1)
    // Exactly one live region on the board, and the tally is not one.
    expect(await page.locator('[data-board] [aria-live]').count()).toBe(1)
    await page.close()
  })

  it('moves between questions with arrow keys, roving the tab stop', async () => {
    const page = await open()
    const first = page.locator('[role="tab"]').first()
    await first.focus()
    await page.keyboard.press('ArrowRight')
    const second = page.locator('[role="tab"]').nth(1)
    expect(await second.getAttribute('aria-selected')).toBe('true')
    expect(await second.getAttribute('tabindex')).toBe('0')
    expect(await first.getAttribute('tabindex')).toBe('-1')
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe(
      (await second.textContent())?.trim(),
    )
    const heading = await page.locator('#board-question').textContent()
    expect(heading).toContain('hamburger')
    await page.close()
  })

  it('switches framing from the radio group and announces the change once', async () => {
    const page = await open()
    const radios = page.locator('[role="radio"]')
    await radios.first().focus()
    await page.keyboard.press('ArrowRight')
    expect(await radios.nth(1).getAttribute('aria-checked')).toBe('true')
    await page.waitForTimeout(100)
    const announced = await page.locator('[data-announce]').textContent()
    expect(announced).toMatch(/system prompt/i)
    expect(announced).toMatch(/changed their mind/)
    // The flipped stamps are decorative and hidden from assistive technology.
    const stamps = await page
      .locator('.stamp')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-hidden')))
    expect(stamps.every((v) => v === 'true')).toBe(true)
    await page.close()
  })

  it('reaches every control with Tab and keeps focus off hidden elements', async () => {
    const page = await open()
    const seen: string[] = []
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return {
          text: el.textContent?.trim().slice(0, 30) ?? '',
          visible: rect.width > 0 && rect.height > 0,
          hidden: el.hidden,
        }
      })
      if (!info) break
      expect(info.visible, `focus landed on an invisible element: ${info.text}`).toBe(true)
      expect(info.hidden).toBe(false)
      seen.push(info.text)
    }
    expect(seen.some((t) => /Replay the week/.test(t))).toBe(true)
    await page.close()
  })
})

describe('the ask-a-question block by keyboard', () => {
  it('keeps the visitor on the page and prefills both routes with what they typed', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(`http://localhost:${port}/reports/`, { waitUntil: 'networkidle' })
    const input = page.locator('#ask-text')
    await input.focus()
    await page.keyboard.type('Is a "po\' boy" & a hoagie the same thing?')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    // Still here: no navigation happened on Enter.
    expect(new URL(page.url()).pathname).toBe('/reports/')
    expect(await page.locator('[data-ask-preview]').textContent()).toBe(
      'Is a "po\' boy" & a hoagie the same thing? One word answer.',
    )
    const github = new URL((await page.locator('[data-ask-github]').getAttribute('href'))!)
    expect(github.searchParams.get('template')).toBe('add_question.yml')
    expect(github.searchParams.get('text')).toBe(
      'Is a "po\' boy" & a hoagie the same thing? One word answer.',
    )
    const contact = await page.locator('[data-ask-contact]').getAttribute('href')
    expect(contact).toBeTruthy()
    expect(new URL(contact!).searchParams.get('contactMessage')).toContain("po' boy")
    // Focus moved to the primary route, so Enter again files the issue.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-ask-github'))).toBe(
      '',
    )
    await page.close()
  })
})

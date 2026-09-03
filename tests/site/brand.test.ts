import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The site names itself from site.json and nowhere else.
 *
 * A fork that changes one file must be a fork. Any literal of the upstream's
 * name, publisher or repository in the site's source is a place a fork would
 * keep calling itself the Hotdog Benchmark, so none is allowed outside
 * comments. The README, the registries and the tests may say who this is.
 */
const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SITE = join(ROOT, 'src/site')

const BRAND = [
  /Hotdog Benchmark/,
  /HOTDOG BENCHMARK/,
  /En Dash/,
  /endash\.us/,
  /en-dash-consulting/,
  /n-dx\.dev/,
]

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })

/** Source lines that are not comments: the ones a browser would render. */
function codeLines(text: string): string[] {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\{\/\*)/.test(line))
}

describe('the site source', () => {
  it('carries no literal of the upstream name, publisher or repository', () => {
    const offenders: string[] = []
    for (const file of walk(SITE)) {
      if (!/\.(astro|ts|css)$/.test(file)) continue
      const lines = codeLines(readFileSync(file, 'utf8'))
      for (const [index, line] of lines.entries()) {
        for (const pattern of BRAND) {
          if (pattern.test(line))
            offenders.push(`${file.slice(ROOT.length)}:${index + 1}: ${line.trim()}`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

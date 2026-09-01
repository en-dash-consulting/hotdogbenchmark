import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// A deliberately trivial test so that `npm test` is meaningful from the very
// first commit: the toolchain works and the package metadata is coherent.
describe('project scaffold', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

  it('declares the scripts every later epic relies on', () => {
    for (const script of ['dev', 'build', 'bench', 'test', 'lint', 'format', 'typecheck']) {
      expect(pkg.scripts, `missing script: ${script}`).toHaveProperty(script)
    }
  })

  it('pins the same Node major in .nvmrc and engines', () => {
    const nvmrc = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim()
    expect(pkg.engines.node).toContain(nvmrc)
  })
})

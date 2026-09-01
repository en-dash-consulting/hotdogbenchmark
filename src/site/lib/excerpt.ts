/**
 * Pulling code excerpts out of real source files at build time.
 *
 * The How It Works page shows the actual `ProviderAdapter` interface and the
 * actual Anthropic adapter. Pasting them into the page would guarantee they
 * drift within a month — the excerpt would still look plausible while
 * describing code that no longer exists, which is worse than showing nothing.
 *
 * Instead each excerpt is delimited in the source by a marker comment, and the
 * build **fails** if a marker goes missing. Deleting the code the page depends
 * on therefore breaks the build rather than silently producing a lying page.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from '../../data/registries.ts'

/** Marker format: `// #region <name>` … `// #endregion <name>` */
export function excerpt(relativePath: string, region: string): string {
  const source = readFileSync(join(REPO_ROOT, relativePath), 'utf8')

  const start = source.indexOf(`#region ${region}`)
  const end = source.indexOf(`#endregion ${region}`)

  if (start === -1 || end === -1) {
    throw new Error(
      `Excerpt region "${region}" not found in ${relativePath}. ` +
        `The How It Works page depends on it. Either restore the marker comments ` +
        `or update the page — do not leave the page describing code that is gone.`,
    )
  }

  const body = source.slice(source.indexOf('\n', start) + 1, source.lastIndexOf('\n', end))

  // Strip the common indentation so the excerpt reads as its own snippet.
  const lines = body.split('\n')
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^\s*/)![0].length)
  const dedent = indents.length > 0 ? Math.min(...indents) : 0

  return lines
    .map((line) => line.slice(dedent))
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
}

/** Read a whole source file, for line counts and similar. */
export function sourceLineCount(relativePath: string): number {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8').split('\n').length
}

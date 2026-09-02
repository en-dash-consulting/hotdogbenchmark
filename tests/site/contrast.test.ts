import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * WCAG contrast, verified rather than asserted.
 *
 * "Meets AA" is a claim this project makes on its accessibility page, so it is
 * checked by parsing the actual token file and computing the actual ratios. A
 * palette tweak that breaks a pair fails here rather than in an audit.
 *
 * Thresholds: 4.5:1 for body text, 3:1 for large text and UI boundaries.
 */
const css = readFileSync(new URL('../../src/site/styles/tokens.css', import.meta.url), 'utf8')

/** Pull the `--name: value` declarations out of one selector block. */
function tokensIn(blockMatcher: RegExp): Record<string, string> {
  const match = blockMatcher.exec(css)
  if (!match) throw new Error(`token block not found: ${blockMatcher}`)
  const tokens: Record<string, string> = {}
  for (const line of match[1]!.split('\n')) {
    const declaration = /^\s*--([\w-]+)\s*:\s*([^;]+);/.exec(line)
    if (declaration) tokens[declaration[1]!] = declaration[2]!.trim()
  }
  return tokens
}

/** Resolve `var(--x)` chains down to a literal hex value. */
function resolve(tokens: Record<string, string>, name: string, depth = 0): string {
  const value = tokens[name]
  if (value === undefined) throw new Error(`undefined token: --${name}`)
  if (depth > 10) throw new Error(`circular token reference at --${name}`)
  const reference = /^var\(--([\w-]+)\)$/.exec(value)
  return reference ? resolve(tokens, reference[1]!, depth + 1) : value
}

function toRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex color: "${hex}"`)
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

/** Relative luminance, per the WCAG definition. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const s = channel / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (lighter + 0.05) / (darker + 0.05)
}

/** sRGB to CIE Lab, for measuring perceptual difference rather than contrast. */
function toLab(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const s = channel / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]

  // sRGB D65 to XYZ, then XYZ to Lab.
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

/** CIE76 color difference. Roughly: below 20 two swatches read as the same family. */
function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = toLab(a)
  const [l2, a2, b2] = toLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const light = tokensIn(/:root\s*\{([\s\S]*?)\n\}/)
const dark = tokensIn(/:root\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/)

/** Dark only redefines semantic roles, so fall back to light for the scales. */
const darkResolved: Record<string, string> = { ...light, ...dark }

const THEMES = [
  { name: 'light', tokens: light },
  { name: 'dark', tokens: darkResolved },
]

/** Pairs that must reach 4.5:1 — normal-size body text. */
const TEXT_PAIRS: Array<[string, string]> = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-sunken'],
  ['text-strong', 'bg'],
  ['text-strong', 'surface'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['faint', 'bg'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['on-primary', 'primary'],
  ['verdict-yes', 'verdict-yes-bg'],
  ['verdict-no', 'verdict-no-bg'],
  ['verdict-other', 'verdict-other-bg'],
  ['error', 'error-bg'],
  ['verdict-yes', 'surface'],
  ['verdict-no', 'surface'],
  ['verdict-other', 'surface'],
  ['error', 'surface'],
]

/**
 * Pairs that must reach 3:1 — UI components and meaningful graphics.
 *
 * Note what is deliberately *not* here: `--rule` and `--rule-strong`. WCAG
 * 1.4.11 covers components a user must identify to operate, and graphics that
 * carry information. A hairline between table rows is neither — it is
 * decorative structure, and SC 1.4.11 explicitly exempts decoration. Holding
 * dividers to 3:1 would mean near-black lines everywhere, which is the
 * opposite of how a printed report looks.
 *
 * The focus ring, by contrast, absolutely is a UI indicator and is checked.
 */
const UI_PAIRS: Array<[string, string]> = [
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['chart-axis', 'bg'],
  ['chart-1', 'surface'],
  ['chart-2', 'surface'],
  ['chart-3', 'surface'],
  ['chart-4', 'surface'],
  ['chart-5', 'surface'],
  ['chart-6', 'surface'],
]

describe.each(THEMES)('$name theme contrast', ({ tokens }) => {
  it.each(TEXT_PAIRS)('--%s on --%s meets 4.5:1 for body text', (fg, bg) => {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg))
    expect(
      Number(ratio.toFixed(2)),
      `--${fg} on --${bg} is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5)
  })

  it.each(UI_PAIRS)('--%s on --%s meets 3:1 for UI', (fg, bg) => {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg))
    expect(
      Number(ratio.toFixed(2)),
      `--${fg} on --${bg} is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(3)
  })
})

describe('the categorical chart palette', () => {
  it.each(THEMES)('$name has six series', ({ tokens }) => {
    for (let index = 1; index <= 6; index += 1) {
      expect(() => resolve(tokens, `chart-${index}`)).not.toThrow()
    }
  })

  it.each(THEMES)('$name keeps every pair of series perceptually distinct', ({ tokens }) => {
    // Measured as CIE76 dE in Lab space, not as a luminance contrast ratio.
    // Two colors can differ wildly in hue while sharing a luminance — a navy
    // and an ochre of the same lightness are obviously different to look at
    // and score about 1.07:1 on contrast. Contrast is the right tool for
    // foreground-on-background legibility and the wrong one for telling two
    // categories apart.
    //
    // This is a floor on top of, never a substitute for, the rule that charts
    // carry direct labels or patterns and never encode by hue alone.
    const series = Array.from({ length: 6 }, (_, i) => resolve(tokens, `chart-${i + 1}`))
    for (let a = 0; a < series.length; a += 1) {
      for (let b = a + 1; b < series.length; b += 1) {
        const distance = deltaE(series[a]!, series[b]!)
        expect(
          distance,
          `chart-${a + 1} vs chart-${b + 1} differ by only dE ${distance.toFixed(1)}`,
        ).toBeGreaterThan(20)
      }
    }
  })
})

describe('the token file', () => {
  it('defines every semantic role in both themes', () => {
    const semantic = [
      'bg',
      'surface',
      'text',
      'muted',
      'accent',
      'verdict-yes',
      'verdict-no',
      'verdict-other',
      'error',
    ]
    for (const name of semantic) {
      expect(light, `light theme missing --${name}`).toHaveProperty(name)
      expect(dark, `dark theme missing --${name}`).toHaveProperty(name)
    }
  })

  it('guards the media-query dark block so an explicit light choice wins', () => {
    expect(css).toContain(":root:not([data-theme='light'])")
  })

  it('defines the dark palette for the manual toggle as well as the media query', () => {
    // Only redefining under prefers-color-scheme would leave the toggle unable
    // to force dark on a light-preferring system.
    expect(css).toContain(":root[data-theme='dark']")
  })

  it('contains no color value that failed to parse', () => {
    // A typo in a hex value fails silently in CSS: the declaration is dropped
    // and the token falls back, which is easy to miss in review.
    for (const [name, value] of Object.entries({ ...light, ...dark })) {
      if (!name.includes('font') && !name.includes('space') && !name.includes('step')) {
        if (value.startsWith('#')) {
          expect(() => toRgb(value), `--${name}: ${value}`).not.toThrow()
        }
      }
    }
  })
})

/**
 * Chart scales and SVG path construction.
 *
 * Pure arithmetic, no dependencies, no client JavaScript. Every chart on this
 * site is an SVG generated at build time; a charting library would cost more
 * bytes than the entire rest of the page.
 *
 * All coordinates are in SVG user units, with y increasing downward — the
 * inversion from "higher value is higher on the page" happens here so that no
 * chart component has to remember it.
 */

export interface Bounds {
  /** Inclusive lower bound of the data range. */
  min: number
  /** Inclusive upper bound. */
  max: number
}

export interface Box {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

/** The drawable area inside a box's padding. */
export function plotArea(box: Box): { x: number; y: number; width: number; height: number } {
  return {
    x: box.padding.left,
    y: box.padding.top,
    width: Math.max(0, box.width - box.padding.left - box.padding.right),
    height: Math.max(0, box.height - box.padding.top - box.padding.bottom),
  }
}

/**
 * Data bounds for a series, with a little headroom.
 *
 * Always includes zero for value axes: a bar chart whose axis starts at 400
 * exaggerates differences, which is the oldest trick in misleading dataviz and
 * not one this project is going to play accidentally.
 */
export function boundsOf(values: number[], includeZero = true): Bounds {
  const usable = values.filter((value) => Number.isFinite(value))
  if (usable.length === 0) return { min: 0, max: 1 }

  let min = Math.min(...usable)
  const max = Math.max(...usable)
  if (includeZero) min = Math.min(min, 0)

  // A flat series would divide by zero; give it an arbitrary but sane range.
  if (min === max) {
    if (max === 0) return { min: 0, max: 1 }
    return { min: includeZero ? 0 : min - Math.abs(min) * 0.1, max: max + Math.abs(max) * 0.1 }
  }
  return { min, max }
}

/** Map a value onto a pixel position along an axis. */
export function scaleLinear(
  value: number,
  bounds: Bounds,
  range: { start: number; end: number },
): number {
  if (bounds.max === bounds.min) return range.start
  const t = (value - bounds.min) / (bounds.max - bounds.min)
  return range.start + t * (range.end - range.start)
}

/** Evenly spaced band centres, for categorical axes like weeks. */
export function bandCentres(count: number, start: number, end: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [(start + end) / 2]
  const step = (end - start) / count
  return Array.from({ length: count }, (_, index) => start + step * (index + 0.5))
}

/** Band width for a categorical axis, with a gap between bands. */
export function bandWidth(count: number, start: number, end: number, gapRatio = 0.25): number {
  if (count <= 0) return 0
  return ((end - start) / count) * (1 - gapRatio)
}

/**
 * An SVG path through a series of points.
 *
 * Null values break the line rather than interpolating across them. A model
 * that was absent for a week should show a gap; drawing straight through it
 * would invent data that was never collected.
 */
export function linePath(points: Array<{ x: number; y: number } | null>): string {
  const commands: string[] = []
  let penDown = false

  for (const point of points) {
    if (point === null) {
      penDown = false
      continue
    }
    commands.push(`${penDown ? 'L' : 'M'}${round(point.x)} ${round(point.y)}`)
    penDown = true
  }

  return commands.join(' ')
}

/** A polygon path, used for radar charts. */
export function polygonPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  return (
    points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
      .join(' ') + ' Z'
  )
}

/** A point on a circle, for radar axes. Angle 0 is straight up. */
export function polarPoint(
  centre: { x: number; y: number },
  radius: number,
  index: number,
  total: number,
): { x: number; y: number } {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return {
    x: round(centre.x + Math.cos(angle) * radius),
    y: round(centre.y + Math.sin(angle) * radius),
  }
}

/**
 * Round to two decimals.
 *
 * Keeps generated SVG deterministic and small — floating point noise in path
 * data would make every snapshot test brittle and every diff unreadable.
 */
export function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Choose about `count` readable tick values covering the bounds.
 *
 * Snaps to 1, 2, 5 or 10 times a power of ten, which is what makes an axis read
 * as deliberate rather than computed.
 */
export function ticks(bounds: Bounds, count = 4): number[] {
  const span = bounds.max - bounds.min
  if (span <= 0) return [bounds.min]

  const rawStep = span / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceStep =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude

  const result: number[] = []
  for (
    let value = Math.ceil(bounds.min / niceStep) * niceStep;
    value <= bounds.max + niceStep * 1e-9;
    value += niceStep
  ) {
    result.push(round(value))
  }
  return result
}

import { expect } from 'vitest'

/** Decode fixture numbers ("Infinity", "-Infinity", "NaN" are strings in JSON). */
export function fx(v: unknown): number {
  if (typeof v === 'number') return v
  if (v === 'Infinity') return Infinity
  if (v === '-Infinity') return -Infinity
  if (v === 'NaN' || v === null || v === undefined) return NaN
  throw new Error(`fixture: unexpected value ${String(v)}`)
}

/**
 * Assert |actual − expected| ≤ abs + rel·|expected|. Infinities must match exactly; a NaN expectation
 * is skipped (SciPy returned NaN for an input we define, e.g. geom p = 1, k = 0).
 */
export function close(actual: number, expected: number, rel = 1e-12, abs = 1e-300, label = ''): void {
  if (Number.isNaN(expected)) return
  if (!Number.isFinite(expected)) {
    expect(actual, label).toBe(expected)
    return
  }
  const err = Math.abs(actual - expected)
  const tol = abs + rel * Math.abs(expected)
  if (!(err <= tol)) {
    throw new Error(`${label ? label + ': ' : ''}expected ${expected}, got ${actual} (err ${err.toExponential(3)} > tol ${tol.toExponential(3)})`)
  }
}

export function label(o: Record<string, unknown>): string {
  return Object.entries(o)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ')
}

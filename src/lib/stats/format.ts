/**
 * Display formatting. AP convention: carry full precision through the computation; round once,
 * at the end, for presentation. These helpers are the only place rounding should happen.
 */

/** Round to `digits` decimal places (half away from zero, matching calculator behavior). */
export function round(x: number, digits = 2): number {
  const f = 10 ** digits
  return Math.sign(x) * Math.round(Math.abs(x) * f + Number.EPSILON) / f
}

/** Round to `sig` significant figures. */
export function roundSig(x: number, sig = 3): number {
  if (x === 0) return 0
  const d = Math.ceil(Math.log10(Math.abs(x)))
  const power = sig - d
  const f = 10 ** power
  return Math.round(x * f) / f
}

/** Fixed-decimal string, with "−" for negatives (typographically correct on instrument displays). */
export function fmt(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return '—'
  const s = Math.abs(x).toFixed(digits)
  return (x < 0 ? '−' : '') + s
}

/** Format a p-value AP-style: 4 decimals, "< 0.0001" below that. */
export function fmtP(p: number): string {
  if (!Number.isFinite(p)) return '—'
  if (p < 0.0001) return '< 0.0001'
  return p.toFixed(4)
}

/** Percentage with given decimals (input as a proportion). */
export function fmtPct(p: number, digits = 1): string {
  return fmt(100 * p, digits) + '%'
}

/** Thousands separators for counts. */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

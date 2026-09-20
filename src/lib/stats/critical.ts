/**
 * Critical values and P-value helpers (AP conventions).
 *   zStar(0.95)                → 1.959963984540054
 *   tStar(0.95, 14)            → 2.1447866879169277
 *   chi2Star(0.05, 3)          → 7.814727903251179   (right-tail critical value at α)
 *   pValueZ(2.1, 'two-sided')  → 0.0357…
 *   pValueT(-1.8, 12, 'less')  → 0.0485…
 *
 * `confidence` is a fraction in (0, 1); values in [50, 100) are treated as percents (95 → 0.95).
 */
import { normal, t, chi2 } from './distributions'

export type Alternative = 'two-sided' | 'less' | 'greater'

/** Normalize 95 → 0.95; throws unless the result is in (0, 1). */
export function asConfidence(c: number): number {
  const v = c >= 50 && c < 100 ? c / 100 : c
  if (!(v > 0 && v < 1)) throw new RangeError(`confidence must be a fraction in (0, 1) or a percent in [50, 100), got ${c}`)
  return v
}

/** z* for a C% confidence interval: the z with central area C. */
export function zStar(confidence: number): number {
  const c = asConfidence(confidence)
  return normal.standardQuantile((1 + c) / 2)
}

/** t* for a C% interval with df degrees of freedom. */
export function tStar(confidence: number, df: number): number {
  const c = asConfidence(confidence)
  return t.quantile((1 + c) / 2, df)
}

/** χ² critical value with right-tail area α. */
export function chi2Star(alpha: number, df: number): number {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError(`chi2Star: alpha must be in (0, 1), got ${alpha}`)
  return chi2.isf(alpha, df)
}

/** z critical value for a significance test at level α (one-tailed: z_{1−α}; two-tailed: z_{1−α/2}). */
export function zCritical(alpha: number, alt: Alternative = 'two-sided'): number {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError(`zCritical: alpha must be in (0, 1), got ${alpha}`)
  return normal.standardQuantile(alt === 'two-sided' ? 1 - alpha / 2 : 1 - alpha)
}

/** t critical value for a significance test at level α. */
export function tCritical(alpha: number, df: number, alt: Alternative = 'two-sided'): number {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError(`tCritical: alpha must be in (0, 1), got ${alpha}`)
  return t.quantile(alt === 'two-sided' ? 1 - alpha / 2 : 1 - alpha, df)
}

/** P-value for a z statistic. two-sided = 2·P(Z ≥ |z|). */
export function pValueZ(z: number, alt: Alternative = 'two-sided'): number {
  if (alt === 'less') return normal.cdf(z)
  if (alt === 'greater') return normal.sf(z)
  return 2 * normal.sf(Math.abs(z))
}

/** P-value for a t statistic with df degrees of freedom. */
export function pValueT(tStat: number, df: number, alt: Alternative = 'two-sided'): number {
  if (alt === 'less') return t.cdf(tStat, df)
  if (alt === 'greater') return t.sf(tStat, df)
  return 2 * t.sf(Math.abs(tStat), df)
}

/** P-value for a χ² statistic (always right-tailed). */
export function pValueChi2(stat: number, df: number): number {
  return chi2.sf(stat, df)
}

/** AP decision: reject H0 when P < α. */
export function reject(pValue: number, alpha = 0.05): boolean {
  return pValue < alpha
}

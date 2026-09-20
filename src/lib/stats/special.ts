/**
 * Special functions — the numerical foundation under every distribution in `@/lib/stats`.
 *
 *  erf / erfc                W. J. Cody's rational Chebyshev approximations (≈1e-16 relative).
 *  lgamma / gammaFn          Lanczos (g = 7, 9 terms) with reflection for x < 0.5 (≈1e-15).
 *  gammaP / gammaQ           Regularized incomplete gamma P(a, x) and Q(a, x) = 1 − P(a, x)
 *                            (series for x < a + 1, modified Lentz continued fraction otherwise).
 *  betaInc                   Regularized incomplete beta I_x(a, b) via Lentz continued fraction with the
 *                            symmetry switch at x > (a + 1)/(a + b + 2).
 *  invertMonotone            Safeguarded Newton/bisection inverse used by every continuous quantile.
 *
 * All routines are pure, allocation-free in the hot path, and tested against SciPy fixtures in
 * tests/fixtures/special.json (relative tolerance 1e-12 in normal ranges).
 */

export const SQRT2 = Math.SQRT2
export const SQRT_2PI = 2.5066282746310005024
export const LN_SQRT_2PI = 0.91893853320467274178
export const INV_SQRT_PI = 0.56418958354775628695

const EPS = 2.220446049250313e-16
const FPMIN = Number.MIN_VALUE / EPS
const MAX_ITER = 200000

// ─── erf / erfc (Cody, 1969) ───────────────────────────────────────────────────────────────────
const ERF_A = [3.1611237438705656, 113.864154151050156, 377.485237685302021, 3209.37758913846947, 0.185777706184603153]
const ERF_B = [23.6012909523441209, 244.024637934444173, 1282.61652607737228, 2844.23683343917062]
const ERF_C = [0.564188496988670089, 8.88314979438837594, 66.1191906371416295, 298.635138197400131, 881.95222124176909, 1712.04761263407058, 2051.07837782607147, 1230.33935479799725, 2.15311535474403846e-8]
const ERF_D = [15.7449261107098347, 117.693950891312499, 537.181101862009858, 1621.38957456669019, 3290.79923573345963, 4362.61909014324716, 3439.36767414372164, 1230.33935480374942]
const ERF_P = [0.305326634961232344, 0.360344899949804439, 0.125781726111229246, 0.0160837851487422766, 6.58749161529837803e-4, 0.0163153871373020978]
const ERF_Q = [2.56852019228982242, 1.87295284992346725, 0.527905102951428412, 0.0605183413124413191, 2.33520497626869185e-3]

/** Core of Cody's CALERF. Returns erfc(|x|) for |x| > 0.46875, erf(x) otherwise (flag in `.isErf`). */
function codyErfc(y: number): number {
  // y = |x| > 0.46875
  let xnum: number
  let xden: number
  let result: number
  if (y <= 4) {
    xnum = ERF_C[8] * y
    xden = y
    for (let i = 0; i < 7; i++) {
      xnum = (xnum + ERF_C[i]) * y
      xden = (xden + ERF_D[i]) * y
    }
    result = (xnum + ERF_C[7]) / (xden + ERF_D[7])
  } else {
    if (y >= 26.7) return 0 // erfc underflows below ~1e-300
    const ysq = 1 / (y * y)
    xnum = ERF_P[5] * ysq
    xden = ysq
    for (let i = 0; i < 4; i++) {
      xnum = (xnum + ERF_P[i]) * ysq
      xden = (xden + ERF_Q[i]) * ysq
    }
    result = (ysq * (xnum + ERF_P[4])) / (xden + ERF_Q[4])
    result = (INV_SQRT_PI - result) / y
  }
  const ysq = Math.trunc(y * 16) / 16
  const del = (y - ysq) * (y + ysq)
  return Math.exp(-ysq * ysq) * Math.exp(-del) * result
}

function codyErfSmall(x: number): number {
  // |x| <= 0.46875
  const ysq = x * x
  let xnum = ERF_A[4] * ysq
  let xden = ysq
  for (let i = 0; i < 3; i++) {
    xnum = (xnum + ERF_A[i]) * ysq
    xden = (xden + ERF_B[i]) * ysq
  }
  return (x * (xnum + ERF_A[3])) / (xden + ERF_B[3])
}

/** Error function erf(x) = (2/√π) ∫₀ˣ e^{−t²} dt. */
export function erf(x: number): number {
  if (Number.isNaN(x)) return NaN
  const y = Math.abs(x)
  if (y <= 0.46875) return codyErfSmall(x)
  const c = codyErfc(y)
  return x < 0 ? c - 1 : 1 - c
}

/** Complementary error function erfc(x) = 1 − erf(x), accurate in the far tail. */
export function erfc(x: number): number {
  if (Number.isNaN(x)) return NaN
  const y = Math.abs(x)
  if (y <= 0.46875) return 1 - codyErfSmall(x)
  const c = codyErfc(y)
  return x < 0 ? 2 - c : c
}

// ─── Gamma family ───────────────────────────────────────────────────────────────────────────────
const LANCZOS_G = 7
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
]

/** log Γ(x) for x > 0 (reflection for 0 < x < 0.5; poles at non-positive integers give +∞). */
export function lgamma(x: number): number {
  if (Number.isNaN(x)) return NaN
  if (x <= 0 && Number.isInteger(x)) return Infinity
  if (x < 0.5) {
    // Reflection: Γ(x)Γ(1−x) = π / sin(πx)
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x)
  }
  // Exact zeros at 1 and 2 keep small-integer factorials clean.
  if (x === 1 || x === 2) return 0
  const xm = x - 1
  let a = LANCZOS[0]
  const t = xm + LANCZOS_G + 0.5
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (xm + i)
  return LN_SQRT_2PI + (xm + 0.5) * Math.log(t) - t + Math.log(a)
}

/** Γ(x). Exact for integers 1..23 via a factorial table. */
export function gammaFn(x: number): number {
  if (Number.isInteger(x) && x >= 1 && x <= 23) return factorial(x - 1)
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x))
  return Math.exp(lgamma(x))
}

const FACTORIALS: number[] = [1]
for (let i = 1; i <= 170; i++) FACTORIALS[i] = FACTORIALS[i - 1] * i

/** n! (exact for n ≤ 22; double precision to 170; Infinity beyond). */
export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`factorial: n must be a non-negative integer, got ${n}`)
  return n <= 170 ? FACTORIALS[n] : Infinity
}

/** log n! */
export function logFactorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`logFactorial: n must be a non-negative integer, got ${n}`)
  return n <= 170 ? Math.log(FACTORIALS[n]) : lgamma(n + 1)
}

/** log C(n, k); −∞ when k < 0 or k > n. Uses the beta-function form for large n to avoid cancellation. */
export function lchoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity
  if (k === 0 || k === n) return 0
  if (n <= 170) return logFactorial(n) - logFactorial(k) - logFactorial(n - k)
  return -Math.log(n + 1) - lbeta(n - k + 1, k + 1)
}

// Stirling correction: lgamma(x) = (x − ½)·ln x − x + ½·ln(2π) + stirlingCorrection(x), x ≥ 10.
const STIRLING = [1 / 12, -1 / 360, 1 / 1260, -1 / 1680, 1 / 1188, -691 / 360360, 1 / 156, -3617 / 122400]
function stirlingCorrection(x: number): number {
  const inv = 1 / x
  const inv2 = inv * inv
  let term = inv
  let s = 0
  for (let i = 0; i < STIRLING.length; i++) {
    s += STIRLING[i] * term
    term *= inv2
  }
  return s
}

/**
 * lgamma(a + b) − lgamma(a) for a ≥ 10 and b ≥ 0, computed without forming two large log-gammas
 * (their difference would carry the absolute rounding error of ~|lgamma(a)|·ε).
 */
export function lgammaDiff(a: number, b: number): number {
  if (a < 10) return lgamma(a + b) - lgamma(a)
  return (a - 0.5) * Math.log1p(b / a) + b * Math.log(a + b) - b + stirlingCorrection(a + b) - stirlingCorrection(a)
}

/** Binomial coefficient C(n, k). Exact (integer arithmetic) while the result fits in 2^53. */
export function choose(n: number, k: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(k)) throw new RangeError('choose: n and k must be integers')
  if (k < 0 || k > n) return 0
  k = Math.min(k, n - k)
  if (k === 0) return 1
  if (n <= 1029) {
    // Multiplicative formula: each partial product is an integer C(n−k+i, i).
    let r = 1
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
    if (r < 9007199254740992) return Math.round(r)
  }
  return Math.exp(lchoose(n, k))
}

/** log B(a, b) = lgamma(a) + lgamma(b) − lgamma(a + b), accurate for large arguments (R's `lbeta` scheme). */
export function lbeta(a: number, b: number): number {
  const p = Math.min(a, b)
  const q = Math.max(a, b)
  if (!(p > 0)) return p === 0 ? Infinity : NaN
  if (q < 10) return lgamma(p) + lgamma(q) - lgamma(p + q)
  // lgamma(p) − [lgamma(q + p) − lgamma(q)]
  return lgamma(p) - lgammaDiff(q, p)
}

/** B(a, b). */
export function betaFn(a: number, b: number): number {
  return Math.exp(lbeta(a, b))
}

function gammaSeries(a: number, x: number): number {
  // P(a, x) by its power series (x < a + 1).
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let n = 0; n < MAX_ITER; n++) {
    ap += 1
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * EPS) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a))
}

function gammaContinuedFraction(a: number, x: number): number {
  // Q(a, x) by modified Lentz continued fraction (x ≥ a + 1).
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i < MAX_ITER; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h
}

/** Regularized lower incomplete gamma P(a, x) = γ(a, x)/Γ(a), a > 0, x ≥ 0. */
export function gammaP(a: number, x: number): number {
  if (Number.isNaN(a) || Number.isNaN(x)) return NaN
  if (a <= 0) throw new RangeError(`gammaP: a must be positive, got ${a}`)
  if (x <= 0) return 0
  if (x === Infinity) return 1
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x)
}

/** Regularized upper incomplete gamma Q(a, x) = 1 − P(a, x), accurate in the far tail. */
export function gammaQ(a: number, x: number): number {
  if (Number.isNaN(a) || Number.isNaN(x)) return NaN
  if (a <= 0) throw new RangeError(`gammaQ: a must be positive, got ${a}`)
  if (x <= 0) return 1
  if (x === Infinity) return 0
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaContinuedFraction(a, x)
}

// ─── Incomplete beta ────────────────────────────────────────────────────────────────────────────
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m < MAX_ITER; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

/**
 * Regularized incomplete beta I_x(a, b), 0 ≤ x ≤ 1, a, b > 0.
 * Callers that know x = u/(u + v) exactly may pass `xc = 1 − x`, `logX` and `logXc` computed
 * directly (the t and F cdfs do), so the a·log x factor is not amplified by rounding in x.
 */
export function betaInc(x: number, a: number, b: number, xc = 1 - x, logX = Math.log(x), logXc = Math.log1p(-x)): number {
  if (Number.isNaN(x) || Number.isNaN(a) || Number.isNaN(b)) return NaN
  if (a <= 0 || b <= 0) throw new RangeError(`betaInc: a and b must be positive, got a=${a}, b=${b}`)
  if (x <= 0) return 0
  if (x >= 1 || xc <= 0) return 1
  const front = Math.exp(a * logX + b * logXc - lbeta(a, b))
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(a, b, x)) / a
  return 1 - (front * betaContinuedFraction(b, a, xc)) / b
}

/** Complement 1 − I_x(a, b) = I_{1−x}(b, a), computed without cancellation. */
export function betaIncC(x: number, a: number, b: number, xc = 1 - x, logX = Math.log(x), logXc = Math.log1p(-x)): number {
  return betaInc(xc, b, a, x, logXc, logX)
}

// ─── Inversion ──────────────────────────────────────────────────────────────────────────────────
export interface InvertOptions {
  /** Derivative f′(x) for Newton steps; omitted → bisection only. */
  derivative?: (x: number) => number
  /** Initial guess (must be within [lo, hi] if given). */
  guess?: number
  /** Relative tolerance on x. */
  tol?: number
  maxIter?: number
}

/**
 * Solve f(x) = target for a monotone-increasing f on [lo, hi] (bounds may be ±Infinity — they are
 * shrunk to a finite bracket by geometric expansion from `guess`). Newton steps are accepted only
 * when they stay inside the current bracket; otherwise the step bisects. Converges to ~1e-13 relative.
 */
export function invertMonotone(f: (x: number) => number, target: number, lo: number, hi: number, opts: InvertOptions = {}): number {
  const tol = opts.tol ?? 1e-14
  const maxIter = opts.maxIter ?? 200
  let a = lo
  let b = hi
  // Establish a finite bracket.
  let x = opts.guess ?? (Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : Number.isFinite(a) ? a + 1 : Number.isFinite(b) ? b - 1 : 0)
  if (!Number.isFinite(a)) {
    let step = 1 + Math.abs(x)
    a = x - step
    while (f(a) > target) {
      step *= 2
      a = x - step
      if (!Number.isFinite(a)) return -Infinity
    }
  }
  if (!Number.isFinite(b)) {
    let step = 1 + Math.abs(x)
    b = x + step
    while (f(b) < target) {
      step *= 2
      b = x + step
      if (!Number.isFinite(b)) return Infinity
    }
  }
  if (x < a || x > b) x = (a + b) / 2
  let fx = f(x) - target
  for (let i = 0; i < maxIter; i++) {
    if (fx === 0) return x
    if (fx < 0) a = x
    else b = x
    let next = NaN
    if (opts.derivative) {
      const d = opts.derivative(x)
      if (d > 0 && Number.isFinite(d)) next = x - fx / d
    }
    if (!(next > a && next < b)) next = (a + b) / 2
    const dx = Math.abs(next - x)
    x = next
    fx = f(x) - target
    // Relative tolerance only (no absolute floor), so roots near zero — e.g. χ² quantiles at p ≈ 1e-12 —
    // are resolved to full relative precision rather than stopping at |x| ≈ 1e-14.
    const scale = Math.abs(x) + 1e-300
    if (dx <= tol * scale || b - a <= tol * scale) return x
  }
  return x
}

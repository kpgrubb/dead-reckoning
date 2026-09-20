# `@/lib/stats` — API reference and conventions

The single numeric source of truth for DEAD RECKONING. Every drill answer, worked example, mission-beat
answer and checkpoint item calls these functions. Nothing here rounds; round once at display with
`format.ts`. Everything is tested against SciPy 1.18 / NumPy 2.4 fixtures in `tests/fixtures/*.json`
(regenerate with `python scripts/gen-fixtures.py`).

```ts
import { mean, normal, t, onePropTest, linearRegression } from '@/lib/stats'
```

Distributions are namespaced (`normal.cdf(...)`, `binomial.pmf(...)`); everything else is a flat export.

---

## Conventions (state these in module text where they matter)

| Topic | Convention |
|---|---|
| Rounding | Functions return full precision. Round only in display via `fmt(x, d)`, `fmtP(p)`, `round(x, d)`. Never feed a rounded number into another computation. |
| Sample sd / variance | Divisor n − 1 (`sd`, `variance`). Population forms are `popSd`, `popVariance`. |
| Quartiles | AP / TI-84 rule: Q1 = median of the lower half, Q3 = median of the upper half, **excluding** the overall median when n is odd. |
| Percentiles | `percentile(xs, p)` default `'linear'` = Hyndman–Fan type 7 (NumPy/Excel `PERCENTILE.INC`). `'nearest-rank'` = smallest value with at least p% of data at or below it. `percentileRank` counts strictly below by default (`inclusive = true` for at-or-below). |
| Outliers | 1.5 × IQR fences. |
| Skewness | Adjusted Fisher–Pearson G1 (SciPy `skew(bias=False)`). |
| Histogram bins | `[lo, hi)` except the last bin `[lo, hi]` (NumPy). Sturges: ⌈log₂ n⌉ + 1 bins. |
| Geometric | **Trials up to and including the first success**, support 1, 2, 3, … (SciPy `geom`, TI `geometpdf`). |
| Discrete quantile | Smallest k with cdf(k) ≥ p (equality within 1e-12 counts). |
| Logs in regression transforms | Base 10 (TI convention) unless `{ base: 'e' }`. |
| One-prop z-test SE | √(p₀(1 − p₀)/n) — hypothesized p₀. Interval SE uses p̂. |
| Two-prop z-test SE | **Pooled** p̂c = (x₁ + x₂)/(n₁ + n₂). Interval SE is **unpooled**. |
| Large Counts | Interval: successes and failures ≥ 10. 1-prop test: np₀, n(1 − p₀) ≥ 10. 2-prop test: n₁p̂c, n₁(1 − p̂c), n₂p̂c, n₂(1 − p̂c) ≥ 10. |
| Two-sample t df | **Welch** (calculator default) unless `dfMethod: 'conservative'` = min(n₁ − 1, n₂ − 1). Never pooled. |
| Paired t | `pairedTTest(first, second)` uses d = first − second. |
| Normal/Large Sample | n ≥ 30 passes; n < 30 with data: no 1.5×IQR outliers and \|G1\| ≤ 1 (heuristic for "no strong skew or outliers"); n < 30 without data: assumed. |
| Chi-square | Expected counts ≥ 5 flagged; no Yates correction (SciPy `correction=False`). Independence = one sample; homogeneity = separate samples (same arithmetic, different conditions/hypotheses). |
| Slope inference | t = (b − β₀)/SE(b), df = n − 2; s = √(SSE/(n − 2)); SE(b) = s/√Sxx. |
| Power | z-based (σ known / proportion). Power for a t-test is not provided (out of AP scope). |
| Sample size | n = ⌈p⋆(1 − p⋆)(z⋆/m)²⌉ and ⌈(z⋆σ/m)²⌉. |
| Bootstrap CI | Percentile method (linear-interpolated quantiles of the resampled statistics). |
| Permutation P-value | (# resamples at least as extreme)/reps, no +1 correction; two-sided uses \|stat\| ≥ \|observed\|. |
| Confidence argument | A fraction in (0, 1), or a percent in [50, 100) (`zStar(95)` = `zStar(0.95)`). |
| Alternatives | `'two-sided' | 'less' | 'greater'`. |
| Design conditions | `random` and `populationSize` are pass-through; if omitted the condition is reported as `met: true, assumed: true` with a detail telling the learner what must be stated. |

---

## Which function for which AP procedure

| AP procedure (CED) | Call |
|---|---|
| Describe one-variable data (1.x) | `describe`, `fiveNumber`, `outliers`, `bins`, `frequencyTable`, `skewness`, `modes` |
| Normal calculations (1.9–1.10) | `normal.cdf/sf/between/quantile`, `zScore` |
| Effects of transformations (1.x) | `linearTransformSummary`, `linearTransform` |
| Two-way tables (2.2–2.3) | `twoWay`, `conditional`, `maxConditionalDifference` |
| Correlation / LSRL (2.4–2.9) | `correlation`, `linearRegression`, `regressionFromSummary`, `residualsForLine`, `sseForLine`, `transformedRegression`, `compareTransforms` |
| Probability rules (4.x) | `binomial`, `geometric`, `discreteRV`, `rvProb` |
| Random variables (4.7–4.9) | `expectedValue`, `rvVariance`, `linearTransformRV`, `sumRV`, `differenceRV`, `combineRV`, `convolve`, `diceSumRV` |
| Binomial / geometric (4.10–4.12) | `binomial.pmf/cdf/atLeast/between`, `geometric.*`, `binomialMoments`, `geometricMoments` |
| Sampling distributions (5.x) | `samplingSdMean`, `samplingSdProportion`, `meanOfIid`, `sumOfIid`; simulation tasks `sample-mean`, `sample-proportion`, `ci-capture` |
| 1-prop z-interval / test (6.2–6.6) | `onePropInterval`, `onePropTest`, `sampleSizeForProportion` |
| 2-prop z-interval / test (6.8–6.11) | `twoPropInterval`, `twoPropTest` |
| Type I/II, power (6.7) | `powerZTestMean`, `powerZTestProportion`, `powerCurve`, `typeIIError` |
| 1-sample t (7.2–7.5) | `oneMeanInterval`, `oneMeanTest`, `sampleSizeForMean`, `marginOfErrorMean` |
| Paired t (7.x) | `pairedTInterval`, `pairedTTest`, `pairedDifferences` |
| 2-sample t (7.6–7.9) | `twoMeanInterval`, `twoMeanTest`, `welchDf`, `conservativeDf` |
| χ² GOF (8.2–8.3) | `chiSquareGOF` |
| χ² independence / homogeneity (8.4–8.7) | `chiSquareIndependence`, `chiSquareHomogeneity`, `expectedCounts` |
| Slope t-interval / test (9.2–9.5) | `slopeInterval`, `slopeTest`, `slopeTestFromComputerOutput`, `slopeIntervalFromOutput` |
| Simulation-based inference | `bootstrap*`, `permutationTest*`, `simulatedPValue` |
| Critical values / P-values | `zStar`, `tStar`, `chi2Star`, `zCritical`, `tCritical`, `pValueZ`, `pValueT`, `pValueChi2`, `reject` |

---

## Uniform inference result

```ts
interface InferenceResult {
  procedure: string           // 'one-proportion z-test', 'two-sample t-interval (welch df)', …
  statistic: number           // z, t or χ²; NaN for pure intervals
  df?: number
  pValue?: number
  ci?: [number, number]
  se: number                  // the SE the procedure used (see conventions)
  estimate: number            // p̂, x̄, p̂₁ − p̂₂, x̄₁ − x̄₂, d̄, b
  criticalValue?: number      // z* / t* for intervals
  marginOfError?: number
  confidence?: number
  alternative?: Alternative
  hypotheses?: { null: string; alt: string }
  conditions: { name: string; met: boolean; detail: string; assumed?: boolean }[]
  summary: string             // "z = 2.14, P = 0.0324" — technical, not a conclusion in context
}
```
Chi-square results add `observed`, `expected`, `contributions`, `largestContributor` (+ `table`, `expectedTable`,
`contributionTable`, `rowTotals`, `colTotals`, `total` for tables). Slope results add `b`, `seB`, `n`.
`allConditionsMet(result)` is the one-liner gate for generators (`retry` until conditions hold, unless the
failure is the lesson).

---

## API by module

### `descriptive.ts`
| Export | Example |
|---|---|
| `sum(xs)` | `sum([1,2,3]) → 6` |
| `mean(xs)`, `median(xs)` | `mean([2,4,9]) → 5` |
| `variance(xs)`, `sd(xs)` (n − 1) | `sd([2,4,4,4,5,5,7,9]) → 2.138…` |
| `popVariance(xs)`, `popSd(xs)` (N) | `popSd([2,4,4,4,5,5,7,9]) → 2` |
| `min`, `max`, `range`, `sorted` | `range([3,9,1]) → 8` |
| `quartiles(xs)` → `{q1,q2,q3}` | `quartiles([1,2,3,4,5]) → {1.5, 3, 4.5}` |
| `iqr(xs)`, `fiveNumber(xs)` | `fiveNumber(xs).q3` |
| `outliers(xs)` → `{lowFence, highFence, values}` | `outliers([1,…,8,30]).values → [30]` |
| `zScore(x, mu, sigma)` | `zScore(70, 65, 3.5) → 1.428…` |
| `percentileRank(xs, x, inclusive=false)` | `percentileRank(xs, 35) → 0.4` |
| `percentile(xs, p, method='linear')` | `percentile([15,20,35,40,50], 40) → 29` |
| `skewness(xs)` (G1) | `skewness(skewedData) → 2.1…` |
| `modes(xs)` (all tied maxima; `[]` if none) | `modes([1,2,2,3,3]) → [2,3]` |
| `weightedMean(xs, ws)` | `weightedMean([80,90,70],[1,2,1]) → 82.5` |
| `meanAbsoluteDeviation(xs)` | `meanAbsoluteDeviation([1,2,3,4]) → 1` |
| `standardize(xs)` | z-scores using sample sd |
| `frequencyTable(xs)` → rows `{value,count,relFreq,cumCount,cumRelFreq}` | |
| `countBy(labels, order?)` | categorical version |
| `cumulativeRelativeFrequency(xs)` | ogive points |
| `bins(xs, {method:'sturges'} \| {method:'width', width, start?} \| {method:'count', count})` → `{bins, edges, width}` | `bins(xs, {method:'width', width: 5})` |
| `linearTransformSummary(summary, a, b)` | `{mean:10, sd:2} → a·mean+b, |a|·sd` |
| `linearTransform(xs, a, b)` | `linearTransform(c, 1.8, 32)` |
| `describe(xs)` → n, mean, sd, variance, five-number, iqr, range | |
| `sumSquaredDeviations(xs)` | Σ(x − x̄)² |

### `format.ts`
`round(x, digits)`, `roundSig(x, sig)`, `fmt(x, digits)` (typographic minus), `fmtP(p)` (4 dp, "< 0.0001"), `fmtPct(p, digits)`, `fmtInt(n)`.

### `special.ts`
`erf`, `erfc`, `lgamma`, `gammaFn`, `factorial`, `logFactorial`, `choose`, `lchoose`, `lbeta`, `betaFn`, `lgammaDiff(a, b)` (= lgamma(a+b) − lgamma(a), cancellation-free), `gammaP(a, x)`, `gammaQ(a, x)`, `betaInc(x, a, b)`, `betaIncC(x, a, b)`, `invertMonotone(f, target, lo, hi, {derivative, guess, tol})`, constants `SQRT2`, `SQRT_2PI`, `LN_SQRT_2PI`, `INV_SQRT_PI`.

### `distributions/` (namespaces `normal`, `t`, `chi2`, `f`, `binomial`, `geometric`, `uniform`, `exponential`, `poisson`)
Every namespace: `pdf`/`pmf`, `cdf`, `sf` (upper tail), `between(lo, hi, …)`, `quantile(p, …)`, `mean`, `variance`, `sd`, `sample(rng, n, …)`.
| Namespace | Signature (params after the point) | Extras |
|---|---|---|
| `normal` | `(x, mu = 0, sigma = 1)` | `standardQuantile(p)`, `isf(p)` |
| `t` | `(x, df)` — real df allowed; df ≥ 1e7 → normal | `isf(p, df)` |
| `chi2` | `(x, df)` | `isf(p, df)` (right-tail critical value) |
| `f` | `(x, d1, d2)` | |
| `binomial` | `(k, n, p)` | `atLeast(k, n, p)`, `table(n, p)` |
| `geometric` | `(k, p)` support 1, 2, … | `atLeast(k, p)`, `table(p, kMax)` |
| `uniform` | `(x, a = 0, b = 1)` | |
| `exponential` | `(x, rate = 1)` | |
| `poisson` | `(k, lambda)` | `atLeast(k, lambda)` |

Examples: `normal.between(-1, 1) → 0.6827`; `t.quantile(0.975, 15) → 2.1314`; `chi2.sf(7.81, 3) → 0.0500`; `binomial.atLeast(3, 10, 0.3) → 0.6172`; `geometric.sf(3, 0.2) → 0.512`.

### `critical.ts`
`asConfidence(c)`, `zStar(C)`, `tStar(C, df)`, `chi2Star(alpha, df)`, `zCritical(alpha, alt)`, `tCritical(alpha, df, alt)`, `pValueZ(z, alt)`, `pValueT(t, df, alt)`, `pValueChi2(stat, df)`, `reject(p, alpha = 0.05)`, type `Alternative`.

### `twoWay.ts`
`twoWay(table, {rows, cols})` → `{table, rows, cols, rowTotals, colTotals, total, joint, marginalRows, marginalCols, rowConditional, colConditional, expected}`; `rowTotals`, `colTotals`, `grandTotal`, `expectedCounts`, `conditional(table, 'row'|'col', i)`, `maxConditionalDifference`.

### `random-variables.ts`
`discreteRV(values, probs)` → `{values, probs, mean, variance, sd}`; `expectedValue`, `rvVariance`, `rvSd`, `rvCdf(rv, x)`, `rvProb(rv, pred)`, `checkProbabilities`, `probabilitiesValid`, `linearTransformRV(rv|moments, a, b)`, `sumRV`, `differenceRV`, `combineRV(rvs, coeffs)`, `sumOfIid(x, n)`, `meanOfIid(x, n)`, `convolve(x, y)`, `dieRV(sides)`, `diceSumRV(count, sides)`, `binomialRV(n, p)`, `binomialMoments`, `geometricMoments`, `bernoulliMoments`.

### `regression.ts`
`linearRegression(xs, ys)` → `RegressionFit` (`slope, intercept, r, r2, xMean, yMean, sx, sy, sxx, syy, sxy, sse, sst, s, seSlope, seIntercept, fitted, residuals, leverage, standardizedResiduals, cooks, flags{highLeverage, influential, outliers}, predict(x), equation(digits)`); `correlation`, `residualsForLine`, `sseForLine`, `regressionFromSummary({r, sx, sy, xMean, yMean})`, `slopeFromR`, `rFromSlope`, `transformedRegression(xs, ys, 'none'|'logx'|'logy'|'loglog', {base})` → `{fit, tx, ty, predict (original scale), residuals (transformed scale), model, r2}`, `compareTransforms`.
Flags: leverage > 4/n, Cook's D > 4/n, |standardized residual| > 2.

### `inference.ts`
Proportions: `onePropInterval({x, n, confidence, random?, populationSize?})`, `onePropTest({x, n, p0, alt})`, `twoPropInterval({x1, n1, x2, n2, confidence})`, `twoPropTest({x1, n1, x2, n2, alt})` (adds `pooled`).
Means (`MeanSample` = `number[]` or `{mean, sd, n}`): `oneMeanInterval(s, {confidence})`, `oneMeanTest(s, {mu0, alt})`, `pairedTTest(first, second, {mu0, alt})`, `pairedTInterval(first, second, {confidence})`, `pairedDifferences`, `twoMeanInterval(a, b, {confidence, dfMethod})`, `twoMeanTest(a, b, {alt, delta0, dfMethod})`, `welchDf`, `conservativeDf`.
Chi-square: `chiSquareGOF({observed, probs | expected, categories?})`, `chiSquareIndependence(table)`, `chiSquareHomogeneity(table, {populationSizes?})`.
Slope: `slopeInterval(xs, ys, {confidence})`, `slopeTest(xs, ys, {alt, beta0})`, `slopeTestFromComputerOutput({b, seB, n, alt, beta0})`, `slopeIntervalFromOutput({b, seB, n, confidence})`.
Power/size: `powerZTestMean({mu0, muA, sigma, n, alpha, alt})`, `powerZTestProportion({p0, pA, n, alpha, alt})`, `powerCurve(base, alternatives)`, `typeIError`, `typeIIError`, `sampleSizeForProportion({moe, confidence, pGuess})`, `sampleSizeForMean({moe, confidence, sigma})`, `marginOfErrorProportion`, `marginOfErrorMean`.
Conditions: `randomCondition`, `tenPercentCondition`, `largeCountsCondition`, `successFailureCondition`, `normalLargeSampleCondition`, `expectedCountsCondition`, `allConditionsMet`.
Helpers: `seMean`, `seProportion`, `samplingSdMean`, `samplingSdProportion`, `tailArea`.

### `resampling.ts`
All take `{ rng, reps = 1000, confidence = 0.95 }` and return the resampled `stats` array.
`bootstrap(xs, statistic, opts)`, `bootstrapMean`, `bootstrapMedian`, `bootstrapSd`, `bootstrapProportion(x, n, opts)`, `bootstrapDifferenceInMeans(a, b, opts)`, `bootstrapDifferenceInProportions({x1,n1,x2,n2}, opts)`, `bootstrapSlope(xs, ys, opts)` → `{estimate, stats, ci, se, reps, confidence}`;
`permutationTest(a, b, {statistic: 'mean-diff'|'median-diff'|'prop-diff'|fn, alt})`, `permutationTestProportions`, `permutationPValue(stats, observed, alt)`, `simulatedPValue(simulate, observed, {alt, center})` → `{observed, stats, pValue, alternative, reps}`.

---

## Simulation tasks (`@/lib/sim`)

`runSimulation({task, params, seed, n, onProgress, onDone})` streams from the Web Worker; `simulate(task, params, seed, n)` runs synchronously (tests, mission-beat answers). Parents for `sample-mean`/`sample-sd`/`sample-median`/`sample-max`/`ci-capture`/`t-under-h0`: `normal {mu, sigma}`, `uniform {a, b}`, `exponential {rate}`, `skewed {shape, scale}`, `bimodal {mu1, mu2, sigma, w}`, `discrete {values, probs}`, `bernoulli {p}`.

| Task | Params | Returns |
|---|---|---|
| `normal-sample-mean` | `{n, mu, sigma}` | x̄ |
| `sample-proportion` | `{n, p}` | p̂ |
| `sample-mean` / `sample-sd` / `sample-median` / `sample-max` | `{parent, n, …}` | statistic |
| `ci-capture` | `{kind: 'mean-t'\|'mean-z'\|'proportion', n, confidence, parent…\|p}` | 1/0 |
| `sample-slope` | `{n, slope, intercept, sigma, xMin, xMax}` or `{xs, …}` | b |
| `permutation-diff` | `{a: number[], b: number[]}` | permuted x̄ₐ − x̄_b |
| `bootstrap-mean` | `{data}` | resampled mean |
| `binomial-count` | `{n, p}` | X |
| `geometric-trials` | `{p}` | trials to first success |
| `dice-sum` | `{dice, sides}` | sum |
| `rv-sum` | `{values, probs, k}` | sum of k draws |
| `detection-while-cold` | `{n, p, heatRate}` | detections in n pings |
| `pings-until-detected` | `{p, heatRate, maxPings}` | first detection ping |
| `chi2-under-h0` | `{probs, n}` or `{rowProbs, colProbs, n}` | χ² under H₀ |
| `t-under-h0` | `{parent, n, mu0}` | t |
| `z-under-h0` | `{n, p}` | z |

---

## Accuracy

Verified against SciPy fixtures: erf/erfc 1e-13; lgamma 1e-13; incomplete gamma 1e-11; incomplete beta 1e-10;
normal cdf/sf/quantile 1e-12 (|z| ≤ 37; beyond that the tail underflows to 0 exactly as SciPy does);
t/χ²/F cdf 1e-11 and quantiles 1e-10 for df ≤ 5000; binomial/geometric/Poisson pmf/cdf 1e-11 with exact
discrete quantiles; inference statistics 1e-12 and P-values 1e-10.

Limits: for t with df ≥ 1e5 the tail cdf carries ~2e-11 relative error (continued fraction near x = 1);
df ≥ 1e7 delegates to the normal. For probabilities within ~1e-15 of 1 use the survival forms (`sf`, `isf`,
`atLeast`) rather than `1 − cdf`. `chi2.pdf(0, df < 2)` is `Infinity`.

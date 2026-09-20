/**
 * `@/lib/stats` — the single source of numeric truth for DEAD RECKONING.
 *
 * CONTRACT (see CLAUDE.md §9):
 *  - No hand-computed answers anywhere. Drills, mission beats, worked examples and checkpoints
 *    compute their numbers by calling these functions.
 *  - Functions return full precision; round only at display time via `format.ts`.
 *  - Every function is unit-tested against SciPy/NumPy reference fixtures in tests/fixtures/.
 *
 * Module map (see README.md in this directory for the full API reference and AP conventions):
 *  descriptive.ts        mean, median, sd, quartiles (TI-84 rule), fiveNumber, outliers, zScore, percentile,
 *                        skewness, modes, frequencyTable, bins, describe, linearTransformSummary …
 *  format.ts             round, roundSig, fmt, fmtP, fmtPct, fmtInt
 *  special.ts            erf/erfc, lgamma, incomplete gamma/beta, choose, invertMonotone
 *  distributions/        normal, t, chi2, f, binomial, geometric, uniform, exponential, poisson (namespaced)
 *  critical.ts           zStar, tStar, chi2Star, zCritical, tCritical, pValueZ/T/Chi2
 *  twoWay.ts             twoWay, expectedCounts, conditional, marginals
 *  random-variables.ts   discreteRV, expectedValue, linearTransformRV, sumRV, differenceRV, convolve, diceSumRV
 *  regression.ts         linearRegression, correlation, regressionFromSummary, transformedRegression
 *  inference.ts          onePropInterval/Test, twoPropInterval/Test, oneMeanInterval/Test, pairedT*, twoMean*,
 *                        chiSquareGOF/Independence/Homogeneity, slopeTest/Interval(+FromComputerOutput),
 *                        powerZTest*, sampleSizeFor*, condition checkers
 *  resampling.ts         bootstrap*, permutationTest*, simulatedPValue
 */
export * from './descriptive'
export * from './format'
export * from './special'
export * from './distributions'
export * from './critical'
export * from './twoWay'
export * from './random-variables'
export * from './regression'
export * from './inference'
export * from './resampling'

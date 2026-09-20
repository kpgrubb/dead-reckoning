/**
 * `@/lib/stats` — the single source of numeric truth for DEAD RECKONING.
 *
 * CONTRACT (see CLAUDE.md §9):
 *  - No hand-computed answers anywhere. Drills, mission beats, worked examples and checkpoints
 *    compute their numbers by calling these functions.
 *  - Functions return full precision; round only at display time via `format.ts`.
 *  - Every function is unit-tested against SciPy/R reference fixtures in tests/fixtures/.
 *
 * Module map (Simulation & Stats Engine agent implements the not-yet-written ones):
 *  descriptive.ts   mean, median, sd, quartiles, fiveNumber, outliers, zScore …      [baseline present]
 *  format.ts        rounding/formatting helpers (AP conventions)                       [baseline present]
 *  distributions/   normal, t, chi2, binomial, geometric: pdf/pmf, cdf, inverse cdf   [TODO]
 *  regression.ts    least squares, r, r², residuals, SE of slope, transformations     [TODO]
 *  inference.ts     z/t procedures for proportions & means (1-, 2-sample, paired),
 *                   chi-square GOF/independence/homogeneity, slope t-test, CIs         [TODO]
 *  resampling.ts    bootstrap, permutation/randomization tests                         [TODO]
 *  random-variables.ts  discrete RV mean/variance, linear combos, binomial/geometric moments [TODO]
 *  special.ts       erf, gamma, beta, incomplete beta/gamma (numerical foundations)   [TODO]
 */
export * from './descriptive'
export * from './format'

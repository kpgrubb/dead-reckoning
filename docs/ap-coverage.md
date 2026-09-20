# DEAD RECKONING — Book One · AP Statistics CED Coverage Matrix

Owner: Curriculum Architect. One row per College Board AP Statistics CED topic (all nine units, 80 topics). **Teaches** = module ids whose `ap_topics` include the code and whose Briefing/Instrument/Drills address it. **Assesses** = checkpoint item ids (see `docs/curriculum-map.md` §5). **Status** is `planned` until the Act Team ships the module and the Pedagogy Reviewer confirms coverage, then `built` / `verified`.

Rule: every topic maps to at least one teaching module and at least one checkpoint item. Topics flagged **light** in the last column are covered by one module and one checkpoint item, or are "Introducing Statistics" framing topics taught primarily through the module's Situation scene; the Pedagogy Reviewer should check these first.

Skill categories (CED): 1 Selecting Statistical Methods · 2 Data Analysis · 3 Using Probability and Simulation · 4 Statistical Argumentation.

---

## Unit 1 · Exploring One-Variable Data (15–23%) — Act I "Signatures"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Introducing Statistics: What Can We Learn from Data? | 1 | act-0-01, act-0-03, act-1-01 | act-1-cp q1 | planned | Framing topic; taught across the prologue and act-1-01 (population/sample, parameter/statistic, variation). |
| 1.2 | The Language of Variation: Variables | 1, 2 | act-0-02, act-1-01 | act-1-cp q2 | planned | |
| 1.3 | Representing a Categorical Variable with Tables | 2 | act-0-03, act-1-01 | act-1-cp q3 | planned | |
| 1.4 | Representing a Categorical Variable with Graphs | 2, 4 | act-1-02 | act-1-cp q4 | planned | **light** (one module, one item) — but the display-integrity instrument gives it a full module. |
| 1.5 | Representing a Quantitative Variable with Graphs | 2 | act-1-03 | act-1-cp q5 | planned | Stemplots covered via the builder's stemplot view. |
| 1.6 | Describing the Distribution of a Quantitative Variable | 2, 4 | act-1-03 | act-1-cp q5 | planned | Rubric drill `describe-distribution`. |
| 1.7 | Summary Statistics for a Quantitative Variable | 2, 4 | act-1-04 | act-1-cp q6, q7 | planned | Mean, median, range, IQR, SD, resistance. |
| 1.8 | Graphical Representations of Summary Statistics | 2 | act-1-05 | act-1-cp q8 | planned | Five-number summary, boxplot, 1.5 × IQR. |
| 1.9 | Comparing Distributions of a Quantitative Variable | 2, 4 | act-1-06 | act-1-cp q9 | planned | Rubric drill `compare-distributions`. |
| 1.10 | The Normal Distribution | 2, 3 | act-1-07 (revisited act-5-02) | act-1-cp q10, q11 | planned | Includes z-scores, percentiles, linear transformations, empirical rule, normal areas. |

## Unit 2 · Exploring Two-Variable Data (5–7%) — Act II "Manifests"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Introducing Statistics: Are Variables Related? | 1 | act-2-01 | act-2-cp q2 | planned | **light** — framing topic; carried by act-2-01's Situation and the association drill. |
| 2.2 | Representing Two Categorical Variables | 2 | act-2-01 | act-2-cp q1 | planned | Two-way tables, side-by-side / segmented / mosaic bars. |
| 2.3 | Statistics for Two Categorical Variables | 2, 4 | act-2-01 | act-2-cp q1, q2 | planned | Joint, marginal, conditional relative frequencies. |
| 2.4 | Representing the Relationship Between Two Quantitative Variables | 2, 4 | act-2-02 | act-2-cp q3 | planned | |
| 2.5 | Correlation | 2, 4 | act-2-02 | act-2-cp q4 | planned | Correlation ≠ causation drilled here and in act-3-05, act-8-04, act-9-03. |
| 2.6 | Linear Regression Models | 2, 4 | act-2-03 | act-2-cp q5, q6 | planned | Rubric drill `interpret-slope`. |
| 2.7 | Residuals | 2, 4 | act-2-04 | act-2-cp q5, q7 | planned | |
| 2.8 | Least Squares Regression | 2, 4 | act-2-03 (principle, formulas), act-2-05 (r², s, output, influence) | act-2-cp q8, q9 | planned | Split across two modules; both halves assessed. |
| 2.9 | Analyzing Departures from Linearity | 1, 2, 4 | act-2-06 | act-2-cp q10 | planned | **light** (one module, one item) — log/power transformations; the checkpoint item bundles model choice and back-transformation. |

## Unit 3 · Collecting Data (12–15%) — Act III "Testimony"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 3.1 | Introducing Statistics: Do the Data We Collected Tell the Truth? | 1 | act-3-01 | act-3-cp q1 | planned | **light** — framing topic; carried by act-3-01's Situation. |
| 3.2 | Introduction to Planning a Study | 1, 4 | act-3-01 | act-3-cp q1 | planned | Survey vs observational study vs experiment; population/sample/frame. |
| 3.3 | Random Sampling and Data Collection | 1, 3 | act-3-02 | act-3-cp q2, q3 | planned | SRS, stratified, cluster, systematic; random-digit implementation. |
| 3.4 | Potential Problems with Sampling | 1, 3, 4 | act-3-03 | act-3-cp q4, q5 | planned | Rubric drill `name-the-bias`. |
| 3.5 | Introduction to Experimental Design | 1, 4 | act-3-04 | act-3-cp q6, q7 | planned | Units, treatments, factors, levels, control, random assignment, replication, blinding, confounding. |
| 3.6 | Selecting an Experimental Design | 1, 4 | act-3-04 | act-3-cp q8 | planned | Completely randomized, randomized block, matched pairs. |
| 3.7 | Inference and Experiments | 3, 4 | act-3-05 (revisited act-9-04) | act-3-cp q9, q10; act-9-cp q9 | planned | Randomization distribution; scope of inference. Rubric drill `scope-of-inference`. |

## Unit 4 · Probability, Random Variables, and Probability Distributions (10–20%) — Act IV "Running Cold"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 4.1 | Introducing Statistics: Random and Non-Random Patterns? | 3 | act-4-01 | act-4-cp q1 | planned | Framing topic; the clustering simulator makes it substantive. |
| 4.2 | Estimating Probabilities Using Simulation | 3, 4 | act-4-01 | act-4-cp q1 | planned | Model / one trial / statistic discipline. |
| 4.3 | Introduction to Probability | 3 | act-4-02 | act-4-cp q2 | planned | Sample space, long-run relative frequency, complement. |
| 4.4 | Mutually Exclusive Events | 3 | act-4-02 | act-4-cp q2 | planned | Addition rule for mutually exclusive events. |
| 4.5 | Conditional Probability | 3, 4 | act-4-03 (revisited act-10-02) | act-4-cp q3, q4 | planned | Two-way tables, trees, general multiplication rule, reversed conditionals. |
| 4.6 | Independent Events and Unions of Events | 3, 4 | act-4-04 | act-4-cp q5, q6 | planned | Independence checks, multiplication rule for independent events, general addition rule. |
| 4.7 | Introduction to Random Variables and Probability Distributions | 3 | act-4-05 | act-4-cp q7 | planned | Discrete distributions; continuous as area under a density (calc: density-vs-mass). |
| 4.8 | Mean and Standard Deviation of Random Variables | 3, 4 | act-4-06 | act-4-cp q8 | planned | Rubric drill `interpret-expected-value`. |
| 4.9 | Combining Random Variables | 3, 4 | act-4-07 | act-4-cp q9 | planned | Linear transformations; sums/differences of independent RVs. |
| 4.10 | Introduction to the Binomial Distribution | 3 | act-4-08 | act-4-cp q10 | planned | |
| 4.11 | Parameters for a Binomial Distribution | 3, 4 | act-4-09 | act-4-cp q11 | planned | Mean, SD, shape; 10% condition. |
| 4.12 | The Geometric Distribution | 3, 4 | act-4-10 | act-4-cp q12 | planned | AP convention: trials up to and including the first success. |

## Unit 5 · Sampling Distributions (7–12%) — Act V "Noise Floor"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 5.1 | Introducing Statistics: Why Is My Sample Not Like Yours? | 1, 3 | act-5-01 | act-5-cp q1, q9 | planned | Framing topic with its own instrument (sampling-distribution builder). |
| 5.2 | The Normal Distribution, Revisited | 3 | act-5-02 (builds on act-1-07) | act-5-cp q3 | planned | Both directions; normal probability plot for model assessment. |
| 5.3 | The Central Limit Theorem | 3, 4 | act-5-03 | act-5-cp q4, q9 | planned | Misconception "the CLT makes the population normal" drilled explicitly. |
| 5.4 | Biased and Unbiased Point Estimates | 3, 4 | act-5-01 | act-5-cp q2 | planned | Bias vs variability of an estimator (contrast with act-3-03 sampling bias). |
| 5.5 | Sampling Distributions for Sample Proportions | 3, 4 | act-5-04 | act-5-cp q6 | planned | Mean, SD, large-counts and 10% conditions. |
| 5.6 | Sampling Distributions for Differences in Sample Proportions | 3, 4 | act-5-04 | act-5-cp q7 | planned | **light** (shares a module with 5.5; one item). Reinforced by act-6-07/08. |
| 5.7 | Sampling Distributions for Sample Means | 3, 4 | act-5-03 | act-5-cp q5 | planned | Taught with the CLT; μ, σ/√n, normality conditions. |
| 5.8 | Sampling Distributions for Differences in Sample Means | 3, 4 | act-5-05 | act-5-cp q8 | planned | **light** (one module, one item). Reinforced by act-7-05/06. |

## Unit 6 · Inference for Categorical Data: Proportions (12–15%) — Act VI "Accusation"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 6.1 | Introducing Statistics: Why Be Normal? | 1, 3 | act-6-01 | act-6-cp q2 | planned | Framing topic; carried by the capture simulator and the confidence-level interpretation. |
| 6.2 | Constructing a Confidence Interval for a Population Proportion | 1, 3, 4 | act-6-01 (logic, conditions, z*), act-6-02 (computation, margin, n) | act-6-cp q1, q2, q3, q5 | planned | Rubric drills `interpret-confidence-level`, `interpret-interval`. |
| 6.3 | Justifying a Claim Based on a Confidence Interval for a Population Proportion | 4 | act-6-02 | act-6-cp q4 | planned | |
| 6.4 | Setting Up a Test for a Population Proportion | 1, 4 | act-6-03 | act-6-cp q6 | planned | Hypotheses in parameter language; conditions with p0. |
| 6.5 | Interpreting p-Values | 3, 4 | act-6-04 | act-6-cp q7, q12 | planned | Rubric drill `interpret-p-value` with forbidden phrasings. |
| 6.6 | Concluding a Test for a Population Proportion | 4 | act-6-05 | act-6-cp q8 | planned | Rubric drill `conclude-test`; CI/test duality. |
| 6.7 | Potential Errors When Performing Tests | 3, 4 | act-6-06 (revisited act-10-01) | act-6-cp q9 | planned | Type I / II, power and its factors. |
| 6.8 | Confidence Intervals for the Difference of Two Proportions | 1, 3, 4 | act-6-07 | act-6-cp q10 | planned | |
| 6.9 | Justifying a Claim About the Difference of Two Proportions Based on a Confidence Interval | 4 | act-6-07 | act-6-cp q10 | planned | **light** (shares module and item with 6.8); the module's rubric drill targets it directly. |
| 6.10 | Setting Up a Test for the Difference of Two Population Proportions | 1, 4 | act-6-08 | act-6-cp q11 | planned | Pooled proportion under H0. |
| 6.11 | Carrying Out a Test for the Difference of Two Population Proportions | 3, 4 | act-6-08 | act-6-cp q11 | planned | |

## Unit 7 · Inference for Quantitative Data: Means (10–18%) — Act VII "Refit"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 7.1 | Introducing Statistics: Should I Worry About Error? | 1, 3 | act-7-01 | act-7-cp q1 | planned | Framing topic with its own instrument (t vs normal comparator). |
| 7.2 | Constructing a Confidence Interval for a Population Mean | 1, 3, 4 | act-7-01 (t, df, conditions), act-7-02 (computation), act-7-04 (mean difference, paired) | act-7-cp q2, q7 | planned | |
| 7.3 | Justifying a Claim About a Population Mean Based on a Confidence Interval | 4 | act-7-02 | act-7-cp q3 | planned | |
| 7.4 | Setting Up a Test for a Population Mean | 1, 4 | act-7-03, act-7-04 (paired) | act-7-cp q4, q6 | planned | |
| 7.5 | Carrying Out a Test for a Population Mean | 3, 4 | act-7-03, act-7-04 (paired) | act-7-cp q5, q7 | planned | Matched pairs analyzed as one sample of differences (CED "mean or mean difference"). |
| 7.6 | Confidence Intervals for the Difference of Two Means | 1, 3, 4 | act-7-05 | act-7-cp q8, q11 | planned | df via technology or conservative rule. |
| 7.7 | Justifying a Claim About the Difference of Two Means Based on a Confidence Interval | 4 | act-7-05 | act-7-cp q8 | planned | |
| 7.8 | Setting Up a Test for the Difference of Two Population Means | 1, 4 | act-7-06 | act-7-cp q6, q9 | planned | |
| 7.9 | Carrying Out a Test for the Difference of Two Population Means | 3, 4 | act-7-06 | act-7-cp q9 | planned | Rubric drill `conclude-test`. |
| 7.10 | Skills Focus: Selecting, Implementing, and Communicating Inference Procedures | 1, 4 | act-7-07 | act-7-cp q10, q11 | planned | Procedure selector; four-step write-up; bootstrap as robustness check. |

## Unit 8 · Inference for Categorical Data: Chi-Square (2–5%) — Act VIII "Ledger"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 8.1 | Introducing Statistics: Are My Results Unexpected? | 1, 3 | act-8-01 | act-8-cp q9 | planned | Framing topic; carried by the observed-vs-expected instrument. |
| 8.2 | Setting Up a Chi-Square Goodness of Fit Test | 1, 3 | act-8-01 | act-8-cp q1, q2, q9 | planned | Expected counts n·p_i; conditions; df = k − 1. |
| 8.3 | Carrying Out a Chi-Square Test for Goodness of Fit | 3, 4 | act-8-02 | act-8-cp q2, q3 | planned | Rubric drill `conclude-test` (chi-square variant, includes largest contributor). |
| 8.4 | Expected Counts in Two-Way Tables | 3 | act-8-03 | act-8-cp q4 | planned | |
| 8.5 | Setting Up a Chi-Square Test for Homogeneity or Independence | 1, 3 | act-8-03 | act-8-cp q5 | planned | Homogeneity vs independence by data-collection design; df = (r − 1)(c − 1). |
| 8.6 | Carrying Out a Chi-Square Test for Homogeneity or Independence | 3, 4 | act-8-04 | act-8-cp q6, q7 | planned | |
| 8.7 | Skills Focus: Selecting an Appropriate Inference Procedure for Categorical Data | 1, 4 | act-8-04 | act-8-cp q8 | planned | **light** (shares a module with 8.6; one item). Procedure selector, categorical mode. |

## Unit 9 · Inference for Quantitative Data: Slopes (2–5%) — Act IX "Intent"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 9.1 | Introducing Statistics: Do Those Points Align? | 1, 2, 3 | act-9-01 | act-9-cp q1, q2 | planned | Framing topic with its own instrument; sampling distribution of b; conditions; SE of the slope. |
| 9.2 | Confidence Intervals for the Slope of a Regression Model | 1, 3, 4 | act-9-02 | act-9-cp q3 | planned | df = n − 2; from computer output. |
| 9.3 | Justifying a Claim About the Slope of a Regression Model Based on a Confidence Interval | 4 | act-9-02 | act-9-cp q4 | planned | |
| 9.4 | Setting Up a Test for the Slope of a Regression Model | 1, 4 | act-9-03 | act-9-cp q5 | planned | Includes a non-zero null (a physically required slope). |
| 9.5 | Carrying Out a Test for the Slope of a Regression Model | 3, 4 | act-9-03 | act-9-cp q6, q7 | planned | Rubric drill `conclude-test`; "does not prove cause". |
| 9.6 | Skills Focus: Selecting an Appropriate Inference Procedure | 1, 4 | act-9-04 | act-9-cp q8, q9 | planned | Unified procedure selector across Units 6–9; evidence board; limitations. |

---

## Totals

| Unit | Topics | Topics with ≥1 teaching module | Topics with ≥1 checkpoint item | Flagged light |
|---|---|---|---|---|
| 1 | 10 | 10 | 10 | 1.4 |
| 2 | 9 | 9 | 9 | 2.1, 2.9 |
| 3 | 7 | 7 | 7 | 3.1 |
| 4 | 12 | 12 | 12 | — |
| 5 | 8 | 8 | 8 | 5.6, 5.8 |
| 6 | 11 | 11 | 11 | 6.9 |
| 7 | 10 | 10 | 10 | — |
| 8 | 7 | 7 | 7 | 8.7 |
| 9 | 6 | 6 | 6 | — |
| **All** | **80** | **80** | **80** | **9 flagged** |

Coverage is complete at the planning level: every one of the 80 topics has at least one teaching module and at least one checkpoint item. The nine flagged topics are either framing topics (2.1, 3.1) or topics sharing a module with a sibling topic (2.9 stands alone but has a single item; 5.6, 5.8, 6.9, 8.7 share a module). Each flagged topic is reinforced downstream (2.9 in act-9-01's condition checks; 5.6/5.8 in Acts VI–VII; 6.9 by act-6-07's rubric drill; 8.7 by act-9-04's unified selector). The Pedagogy Reviewer should confirm those reinforcements are real once modules are built.

## Skill-category balance (by module count, from the Act tables in `docs/curriculum-map.md`; checkpoints tag all four)

| Skill | Teaching modules | + checkpoints | Notes |
|---|---|---|---|
| 1 Selecting Statistical Methods | 23 | 32 | Four of five Act III modules; every "setting up" inference module; the three skills-focus modules. |
| 2 Data Analysis | 17 | 26 | Prologue, all of Acts I–II, act-9-01. |
| 3 Using Probability and Simulation | 38 | 47 | All of Acts IV–V; every "carrying out" inference module; act-3-02/03/05. |
| 4 Statistical Argumentation | 46 | 55 | Every rubric-drill module; the conclusion-in-context discipline. |

Skill 4 is the most-tagged category by design: the learner earned a 5 once and the failure mode for an adult returning to this material is computation without argument.

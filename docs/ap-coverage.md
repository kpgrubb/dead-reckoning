# DEAD RECKONING — Book One · AP Statistics CED Coverage Matrix

Owner: Curriculum Architect. One row per College Board AP Statistics CED topic (all nine units, 80 topics). **Teaches** = module ids whose `ap_topics` include the code and whose Briefing/Instrument/Drills address it. **Assesses** = the checkpoint items whose generator carries the code in its own `ap_topics` (see `docs/curriculum-map.md` §5 for the blueprints and generator ids). `act-N-cp` abbreviates `act-N-checkpoint`.

Rule: every topic maps to at least one teaching module and at least one checkpoint item.

**Status.** Every row reads `verified`. Two things were checked, both against the build rather than against a plan:

1. **Teaching.** The **Teaches** column is the `ap_topics` frontmatter of the shipped modules, re-extracted from `content/act-*/**.mdx` and compared row by row; it matches exactly. (Entries in parentheses — "revisited act-5-02", "revisited act-9-04" — are reinforcement, not frontmatter claims.) `docs/reviews/pedagogy.md` §1a read all 62 modules and confirmed no module claims a topic its Briefing does not teach, and that all 80 topics are taught.
2. **Assessment.** The **Assesses** column was rebuilt by unioning each checkpoint item's generator `ap_topics` per Act and comparing the union against that Act's CED unit. **All ten checkpoints cover every topic in their unit; there are no gaps and no out-of-unit topics except the deliberate 3.7 at `act-9-cp q9`.** The five holes `docs/reviews/pedagogy.md` §1b found (4.1, 4.4, 6.9, 6.11, 7.8) are closed; the trade-offs that closed them are recorded in `docs/curriculum-map.md` §5 and in the act-4, act-6 and act-7 spec headers.

Topics flagged **light** in the last column are covered by one module and one checkpoint item, or are "Introducing Statistics" framing topics taught primarily through the module's Situation scene. The Pedagogy Reviewer checked all of them and found every one to be real teaching, not framing — the flags are kept as a reading aid, not as an open question.

Skill categories (CED): 1 Selecting Statistical Methods · 2 Data Analysis · 3 Using Probability and Simulation · 4 Statistical Argumentation.

---

## Unit 1 · Exploring One-Variable Data (15–23%) — Act I "Signatures"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 1.1 | Introducing Statistics: What Can We Learn from Data? | 1 | act-0-01, act-0-03, act-1-01 | act-0-cp q1, q2, q3, q7, q9, q10; act-1-cp q1 | verified | Framing topic; taught across the prologue and act-1-01 (population/sample, parameter/statistic, variation). |
| 1.2 | The Language of Variation: Variables | 1, 2 | act-0-02, act-1-01 | act-0-cp q4, q5; act-1-cp q2 | verified | |
| 1.3 | Representing a Categorical Variable with Tables | 2 | act-0-03, act-1-01 | act-0-cp q6, q7, q8; act-1-cp q1, q3 | verified | |
| 1.4 | Representing a Categorical Variable with Graphs | 2, 4 | act-1-02 | act-1-cp q4 | verified | **light** (one module, one item) — but the display-integrity instrument gives it a full module. |
| 1.5 | Representing a Quantitative Variable with Graphs | 2 | act-1-03 | act-1-cp q5 | verified | Stemplots covered via the builder's stemplot view. |
| 1.6 | Describing the Distribution of a Quantitative Variable | 2, 4 | act-1-03 | act-1-cp q5 | verified | Rubric drill `describe-distribution`. |
| 1.7 | Summary Statistics for a Quantitative Variable | 2, 4 | act-1-04 | act-1-cp q6, q7 | verified | Mean, median, range, IQR, SD, resistance. |
| 1.8 | Graphical Representations of Summary Statistics | 2 | act-1-05 | act-1-cp q8 | verified | Five-number summary, boxplot, 1.5 × IQR. |
| 1.9 | Comparing Distributions of a Quantitative Variable | 2, 4 | act-1-06 | act-1-cp q9 | verified | Rubric drill `compare-distributions`. |
| 1.10 | The Normal Distribution | 2, 3 | act-1-07 (revisited act-5-02) | act-1-cp q10, q11 | verified | Includes z-scores, percentiles, linear transformations, empirical rule, normal areas. |

## Unit 2 · Exploring Two-Variable Data (5–7%) — Act II "Manifests"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 2.1 | Introducing Statistics: Are Variables Related? | 1 | act-2-01 | act-2-cp q1 | verified | **light** — framing topic; carried by act-2-01's Situation and the association drill. |
| 2.2 | Representing Two Categorical Variables | 2 | act-2-01 | act-2-cp q1, q2 | verified | Two-way tables, side-by-side / segmented / mosaic bars. |
| 2.3 | Statistics for Two Categorical Variables | 2, 4 | act-2-01 | act-2-cp q2 | verified | Joint, marginal, conditional relative frequencies. |
| 2.4 | Representing the Relationship Between Two Quantitative Variables | 2, 4 | act-2-02 | act-2-cp q3 | verified | |
| 2.5 | Correlation | 2, 4 | act-2-02 | act-2-cp q3, q4 | verified | Correlation ≠ causation drilled here and in act-3-05, act-8-04, act-9-03. |
| 2.6 | Linear Regression Models | 2, 4 | act-2-03 | act-2-cp q5, q6 | verified | Rubric drill `interpret-slope`. |
| 2.7 | Residuals | 2, 4 | act-2-04 | act-2-cp q5, q7 | verified | |
| 2.8 | Least Squares Regression | 2, 4 | act-2-03 (principle, formulas), act-2-05 (r², s, output, influence) | act-2-cp q8, q9 | verified | Split across two modules; both halves assessed. |
| 2.9 | Analyzing Departures from Linearity | 1, 2, 4 | act-2-06 | act-2-cp q10 | verified | **light** (one module, one item) — log/power transformations; the checkpoint item bundles model choice and back-transformation. |

## Unit 3 · Collecting Data (12–15%) — Act III "Testimony"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 3.1 | Introducing Statistics: Do the Data We Collected Tell the Truth? | 1 | act-3-01 | act-3-cp q1 | verified | **light** — framing topic; carried by act-3-01's Situation. |
| 3.2 | Introduction to Planning a Study | 1, 4 | act-3-01 | act-3-cp q1 | verified | Survey vs observational study vs experiment; population/sample/frame. |
| 3.3 | Random Sampling and Data Collection | 1, 3 | act-3-02 | act-3-cp q2, q3 | verified | SRS, stratified, cluster, systematic; random-digit implementation. |
| 3.4 | Potential Problems with Sampling | 1, 3, 4 | act-3-03 | act-3-cp q4, q5 | verified | Rubric drill `name-the-bias`. |
| 3.5 | Introduction to Experimental Design | 1, 4 | act-3-04 | act-3-cp q6, q7 | verified | Units, treatments, factors, levels, control, random assignment, replication, blinding, confounding. |
| 3.6 | Selecting an Experimental Design | 1, 4 | act-3-04 | act-3-cp q7, q8 | verified | Completely randomized, randomized block, matched pairs. |
| 3.7 | Inference and Experiments | 3, 4 | act-3-05 (revisited act-9-04) | act-3-cp q9, q10; act-9-cp q9 | verified | Randomization distribution; scope of inference. Rubric drill `scope-of-inference`. |

## Unit 4 · Probability, Random Variables, and Probability Distributions (10–20%) — Act IV "Running Cold"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 4.1 | Introducing Statistics: Random and Non-Random Patterns? | 3 | act-4-01 | act-4-cp q1 | verified | Framing topic; the clustering simulator makes it substantive. |
| 4.2 | Estimating Probabilities Using Simulation | 3, 4 | act-4-01 | act-4-cp q2 | verified | Model / one trial / statistic discipline. |
| 4.3 | Introduction to Probability | 3 | act-4-02 | act-4-cp q3 | verified | Sample space, long-run relative frequency, complement. |
| 4.4 | Mutually Exclusive Events | 3 | act-4-02 | act-4-cp q3 | verified | Addition rule for mutually exclusive events. |
| 4.5 | Conditional Probability | 3, 4 | act-4-03 (revisited act-10-02) | act-4-cp q4, q5 | verified | Two-way tables, trees, general multiplication rule, reversed conditionals. |
| 4.6 | Independent Events and Unions of Events | 3, 4 | act-4-04 | act-4-cp q6 | verified | Independence checks, multiplication rule for independent events, general addition rule. |
| 4.7 | Introduction to Random Variables and Probability Distributions | 3 | act-4-05 | act-4-cp q7 | verified | Discrete distributions; continuous as area under a density (calc: density-vs-mass). |
| 4.8 | Mean and Standard Deviation of Random Variables | 3, 4 | act-4-06 | act-4-cp q8 | verified | Rubric drill `interpret-expected-value`. |
| 4.9 | Combining Random Variables | 3, 4 | act-4-07 | act-4-cp q9 | verified | Linear transformations; sums/differences of independent RVs. |
| 4.10 | Introduction to the Binomial Distribution | 3 | act-4-08 | act-4-cp q10 | verified | |
| 4.11 | Parameters for a Binomial Distribution | 3, 4 | act-4-09 | act-4-cp q11 | verified | Mean, SD, shape; 10% condition. |
| 4.12 | The Geometric Distribution | 3, 4 | act-4-10 | act-4-cp q12 | verified | AP convention: trials up to and including the first success. |

## Unit 5 · Sampling Distributions (7–12%) — Act V "Noise Floor"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 5.1 | Introducing Statistics: Why Is My Sample Not Like Yours? | 1, 3 | act-5-01 | act-5-cp q1, q9 | verified | Framing topic with its own instrument (sampling-distribution builder). |
| 5.2 | The Normal Distribution, Revisited | 3 | act-5-02 (builds on act-1-07) | act-5-cp q3 | verified | Both directions; normal probability plot for model assessment. |
| 5.3 | The Central Limit Theorem | 3, 4 | act-5-03 | act-5-cp q4 | verified | Misconception "the CLT makes the population normal" drilled explicitly. |
| 5.4 | Biased and Unbiased Point Estimates | 3, 4 | act-5-01 | act-5-cp q2, q9 | verified | Bias vs variability of an estimator (contrast with act-3-03 sampling bias). |
| 5.5 | Sampling Distributions for Sample Proportions | 3, 4 | act-5-04 | act-5-cp q6 | verified | Mean, SD, large-counts and 10% conditions. |
| 5.6 | Sampling Distributions for Differences in Sample Proportions | 3, 4 | act-5-04 | act-5-cp q7 | verified | **light** (shares a module with 5.5; one item). Reinforced by act-6-07/08. |
| 5.7 | Sampling Distributions for Sample Means | 3, 4 | act-5-03 | act-5-cp q5 | verified | Taught with the CLT; μ, σ/√n, normality conditions. |
| 5.8 | Sampling Distributions for Differences in Sample Means | 3, 4 | act-5-05 | act-5-cp q8 | verified | **light** (one module, one item). Reinforced by act-7-05/06. |

## Unit 6 · Inference for Categorical Data: Proportions (12–15%) — Act VI "Accusation"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 6.1 | Introducing Statistics: Why Be Normal? | 1, 3 | act-6-01 | act-6-cp q1 | verified | Framing topic; carried by the capture simulator and the confidence-level interpretation. |
| 6.2 | Constructing a Confidence Interval for a Population Proportion | 1, 3, 4 | act-6-01 (logic, conditions, z*), act-6-02 (computation, margin, n) | act-6-cp q2 | verified | Rubric drills `interpret-confidence-level`, `interpret-interval`. |
| 6.3 | Justifying a Claim Based on a Confidence Interval for a Population Proportion | 4 | act-6-02 | act-6-cp q3 | verified | |
| 6.4 | Setting Up a Test for a Population Proportion | 1, 4 | act-6-03 | act-6-cp q4 | verified | Hypotheses in parameter language; conditions with p0. |
| 6.5 | Interpreting p-Values | 3, 4 | act-6-04 | act-6-cp q5, q12 | verified | Rubric drill `interpret-p-value` with forbidden phrasings. |
| 6.6 | Concluding a Test for a Population Proportion | 4 | act-6-05 | act-6-cp q6 | verified | Rubric drill `conclude-test`; CI/test duality. |
| 6.7 | Potential Errors When Performing Tests | 3, 4 | act-6-06 (revisited act-10-01) | act-6-cp q7 | verified | Type I / II, power and its factors. |
| 6.8 | Confidence Intervals for the Difference of Two Proportions | 1, 3, 4 | act-6-07 | act-6-cp q8 | verified | |
| 6.9 | Justifying a Claim About the Difference of Two Proportions Based on a Confidence Interval | 4 | act-6-07 | act-6-cp q9 | verified | **light** (one module, one item) — but it now has its own checkpoint item: q8 takes the endpoints and q9 asks what an interval containing 0 licenses. act-6-07 also drills it directly. |
| 6.10 | Setting Up a Test for the Difference of Two Population Proportions | 1, 4 | act-6-08 | act-6-cp q10 | verified | Pooled proportion under H0. |
| 6.11 | Carrying Out a Test for the Difference of Two Population Proportions | 3, 4 | act-6-08 | act-6-cp q11 | verified | |

## Unit 7 · Inference for Quantitative Data: Means (10–18%) — Act VII "Halden Reach"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 7.1 | Introducing Statistics: Should I Worry About Error? | 1, 3 | act-7-01 | act-7-cp q1 | verified | Framing topic with its own instrument (t vs normal comparator). |
| 7.2 | Constructing a Confidence Interval for a Population Mean | 1, 3, 4 | act-7-01 (t, df, conditions), act-7-02 (computation), act-7-04 (mean difference, paired) | act-7-cp q1, q2 | verified | |
| 7.3 | Justifying a Claim About a Population Mean Based on a Confidence Interval | 4 | act-7-02 | act-7-cp q2, q3 | verified | |
| 7.4 | Setting Up a Test for a Population Mean | 1, 4 | act-7-03, act-7-04 (paired) | act-7-cp q4, q5, q6 | verified | |
| 7.5 | Carrying Out a Test for a Population Mean | 3, 4 | act-7-03, act-7-04 (paired) | act-7-cp q4, q6 | verified | Matched pairs analyzed as one sample of differences (CED "mean or mean difference"). |
| 7.6 | Confidence Intervals for the Difference of Two Means | 1, 3, 4 | act-7-05 | act-7-cp q5, q7, q11 | verified | df via technology or conservative rule. |
| 7.7 | Justifying a Claim About the Difference of Two Means Based on a Confidence Interval | 4 | act-7-05 | act-7-cp q7 | verified | |
| 7.8 | Setting Up a Test for the Difference of Two Population Means | 1, 4 | act-7-06 | act-7-cp q8 | verified | |
| 7.9 | Carrying Out a Test for the Difference of Two Population Means | 3, 4 | act-7-06 | act-7-cp q9 | verified | Rubric drill `conclude-test`. |
| 7.10 | Skills Focus: Selecting, Implementing, and Communicating Inference Procedures | 1, 4 | act-7-07 | act-7-cp q10 | verified | Procedure selector; four-step write-up; bootstrap as robustness check. |

## Unit 8 · Inference for Categorical Data: Chi-Square (2–5%) — Act VIII "Kettle"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 8.1 | Introducing Statistics: Are My Results Unexpected? | 1, 3 | act-8-01 | act-8-cp q1, q9 | verified | Framing topic; carried by the observed-vs-expected instrument. |
| 8.2 | Setting Up a Chi-Square Goodness of Fit Test | 1, 3 | act-8-01 | act-8-cp q2, q9 | verified | Expected counts n·p_i; conditions; df = k − 1. |
| 8.3 | Carrying Out a Chi-Square Test for Goodness of Fit | 3, 4 | act-8-02 | act-8-cp q3 | verified | Rubric drill `conclude-test` (chi-square variant, includes largest contributor). |
| 8.4 | Expected Counts in Two-Way Tables | 3 | act-8-03 | act-8-cp q4 | verified | |
| 8.5 | Setting Up a Chi-Square Test for Homogeneity or Independence | 1, 3 | act-8-03 | act-8-cp q5 | verified | Homogeneity vs independence by data-collection design; df = (r − 1)(c − 1). |
| 8.6 | Carrying Out a Chi-Square Test for Homogeneity or Independence | 3, 4 | act-8-04 | act-8-cp q6, q7, q8 | verified | |
| 8.7 | Skills Focus: Selecting an Appropriate Inference Procedure for Categorical Data | 1, 4 | act-8-04 | act-8-cp q6, q7, q8 | verified | No longer light: shares act-8-04 with 8.6, but three checkpoint items carry it (q6, q7, q8). Procedure selector, categorical mode. |

## Unit 9 · Inference for Quantitative Data: Slopes (2–5%) — Act IX "Intent"

| Topic | Name | Skills | Teaches | Assesses | Status | Notes |
|---|---|---|---|---|---|---|
| 9.1 | Introducing Statistics: Do Those Points Align? | 1, 2, 3 | act-9-01 | act-9-cp q1, q2 | verified | Framing topic with its own instrument; sampling distribution of b; conditions; SE of the slope. |
| 9.2 | Confidence Intervals for the Slope of a Regression Model | 1, 3, 4 | act-9-02 | act-9-cp q3 | verified | df = n − 2; from computer output. |
| 9.3 | Justifying a Claim About the Slope of a Regression Model Based on a Confidence Interval | 4 | act-9-02 | act-9-cp q4 | verified | |
| 9.4 | Setting Up a Test for the Slope of a Regression Model | 1, 4 | act-9-03 | act-9-cp q5 | verified | Includes a non-zero null (a physically required slope). |
| 9.5 | Carrying Out a Test for the Slope of a Regression Model | 3, 4 | act-9-03 | act-9-cp q6, q7 | verified | Rubric drill `conclude-test`; "does not prove cause". |
| 9.6 | Skills Focus: Selecting an Appropriate Inference Procedure | 1, 4 | act-9-04 | act-9-cp q8, q9 | verified | Unified procedure selector across Units 6–9; evidence board; limitations. |

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
| 8 | 7 | 7 | 7 | — |
| 9 | 6 | 6 | 6 | — |
| **All** | **80** | **80** | **80** | **7 flagged** |

Coverage is complete as built: every one of the 80 topics has at least one teaching module and at least one checkpoint item, confirmed by unioning the checkpoint generators' `ap_topics` against each CED unit. The seven flagged topics are either framing topics (2.1, 3.1) or topics sharing a module with a sibling topic (2.9 stands alone but has a single item; 5.6, 5.8 and 6.9 share a module). Each is reinforced downstream (2.9 in act-9-01's condition checks; 5.6/5.8 in Acts VI–VII; 6.9 by act-6-07's rubric drill as well as `act-6-cp q9`). 8.7 is no longer flagged: it carries three checkpoint items (`act-8-cp q6, q7, q8`) as well as act-9-04's unified selector. `docs/reviews/pedagogy.md` §1a checked each flagged topic and found all of them to be real teaching.

One known assessment gap is **not** a topic gap and is not shown above: `docs/reviews/pedagogy.md` GAP-1 — CED 2.6 requires interpreting the slope **and the y-intercept**, and the intercept is taught in act-2-03 but practised nowhere. The generator `act-2/intercept-meaning` exists and passes its sweep but is referenced by no module and no checkpoint. 2.6 itself is taught and assessed (`act-2-cp q5, q6`), so the row stays `verified`.

## Skill-category balance (by module count, from the Act tables in `docs/curriculum-map.md`; checkpoints tag all four)

| Skill | Teaching modules | + checkpoints | Notes |
|---|---|---|---|
| 1 Selecting Statistical Methods | 23 | 33 | Four of five Act III modules; every "setting up" inference module; the three skills-focus modules. |
| 2 Data Analysis | 17 | 27 | Prologue, all of Acts I–II, act-9-01. |
| 3 Using Probability and Simulation | 38 | 48 | All of Acts IV–V; every "carrying out" inference module; act-3-02/03/05. |
| 4 Statistical Argumentation | 46 | 56 | Every rubric-drill module; the conclusion-in-context discipline. |

(Counts re-derived from the Act tables in `docs/curriculum-map.md`: 62 teaching rows and 10 checkpoint rows, each checkpoint tagged 1–4. `act-0-00` carries no skill tag.)

Skill 4 is the most-tagged category by design: the learner earned a 5 once and the failure mode for an adult returning to this material is computation without argument.

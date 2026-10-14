# Math Audit — Book One

Reviewer: Math Auditor. Scope: all eleven Acts (62 modules + 10 checkpoints), every `<Briefing>`,
`<Formula>`, `<Calculator>` panel, mission beat, checkpoint and generator under
`src/lib/problems/generators/`.

Baseline: `npm test` — 86 files, 2,139 tests, all passing, before and after this review. Nothing was
edited. Throwaway scripts and tests used to compute the figures below were deleted.

**14 CONFIRMED defects, 4 SUSPECTED.** Ordered most severe first.

## Fix these first

1. **§1 — `act-9/03`'s P-value beat accepts the exact error it is built to catch.** One line.
2. **§2 — `act-5/05` prints a gated beat's answer, at the asked precision, in the Briefing above it.**
3. **§3 — `act-8/04`'s χ² instrument prints the gated beat's answer in its opening caption.**

Everything below §6 is prose, label and robustness work and can wait.

---

## 1. CONFIRMED · `content/act-9/03-the-fuel-to-reach-kettle.mdx:282` — tolerance accepts the wrong method

```
<MissionBeat id="act-9-03-p" kind="numeric" answer={KETTLE_TEST_ZERO.pValue} answerKind="pValue" …
  prompt={`… The output table prints a P beside the slope. Decide what that printed figure is before
  you use it, and report the P-value for H₀: β = 0 against Hₐ: β > 0 …`}
  hint="Software prints a two-sided test against zero. This alternative names one side …"
```

`answerKind="pValue"` takes the project default tolerance of **0.0005**
(`src/lib/problems/grade.ts:26`), and the beat sets neither `tolerance` nor `allowInequality`.

Computed: `KETTLE_TEST_ZERO` = { t = 4.7485, df = 17, p = **0.00009304** }.

The beat's entire pedagogical point is halving the software's two-sided P. The two-sided value is
0.00018608, and |0.00018608 − 0.00009304| = 0.000093 — **well inside 0.0005, so failing to halve is
graded correct.** So are 0, 0.0001, 0.0004 and 0.0005: any sufficiently small number passes,
including ones produced by no method at all.

Correction: follow `act-4/09-binomial-parameters.mdx:230`, which solves the same problem —
`digits={6} tolerance={0.000003} allowInequality={{ max: 0.0001 }}`. A tolerance of about `3e-5`
(or `1e-5`) rejects the un-halved answer while still admitting honest rounding.

This is the only pValue beat in the book exposed this way. The other six either carry
`allowInequality` (`act-5/03:178`, `act-6/04:219`, `act-7/06:261`, `act-8/02:258`, `act-8/04:416`)
or have a p near 0.9 where 0.0005 is tight (`act-9/03:316`, p = 0.9018). `act-6/04`'s p = 0.000782
would also be vulnerable, but its two-sided partner (0.001563) sits 0.00078 away — outside the
tolerance by a whisker — and it carries `allowInequality` anyway.

## 2. CONFIRMED · `content/act-5/05-differences-in-means.mdx:119` — answer leakage above the gate

`<Briefing.Caution>`, 54 lines above the gate, renders:

> …the honest spread of the difference between {fmtInt(NINETEEN_N)} and {fmtInt(SURVIVING_PERRINE_N)}
> is **{fmt(SD_DIFF_MEANS_SMALL, 3)} d**…

`act-5-05-sd-small` (line 173, gated at line 248) is `answer={SD_DIFF_MEANS_SMALL} digits={3}` — the
same value at the same precision. The Caution hands over the answer verbatim before the learner is
asked for it. Same class as the already-fixed `act-4/07` leak.

Correction: the Caution's argument (subtracting SEs gives a spread smaller than measuring the
nineteen alone) survives intact if the three figures are replaced by the comparison —
"…is larger than either piece; subtracting the two standard errors instead gives a figure *less than*
measuring the nineteen on their own." Keep `WRONG_SUBTRACTED` and `SE_19_ALONE` if the contrast needs
numbers; `SD_DIFF_MEANS_SMALL` is the one that must go. `act-4/09` documents the pattern.

## 3. CONFIRMED · `content/act-8/04-dacres-stamp.mdx:308` — instrument prints the gated beat's answer

```
<ChiSquareTail statistic={BENEFICIARY_TEST.statistic} df={BENEFICIARY_TEST.df}
  caseName="the beneficiary table" alpha={ALPHA} />
```

`src/instruments/act-8/ChiSquareTail.tsx:79` renders, on first paint:

> `Opened on the beneficiary table: χ² = 10.00 on 1 degrees of freedom, P = 0.0016.`

`act-8-04-chisq` (line 357, gated at line 452) asks: *"What is the **χ² statistic**? Give it to two
decimal places"*, `answer={BENEFICIARY_TEST.statistic}`. Computed: χ² = 10.0027, df 1, p = 0.001563.
The panel prints `fmt(statistic, 2)` = **10.00** — the answer, to the asked precision, 49 lines
above the question. The follow-up conclusion beat's P-value is given away with it.

Correction: open the instrument on a neutral statistic (pass a value that is not the module's own),
or move the panel below `<Gated>`. Note `src/instruments/act-8/ChiSquareTail.tsx:79` also prints
"1 degrees of freedom"; worth singularising while the line is open.

## 4. CONFIRMED · `src/lib/problems/generators/act-8/gof-setup.ts:295, 305` — a distractor equal to the answer

```ts
const df = k - 1
const wrongTwoWay = (k - 1) * (2 - 1)       // ← identical to df
```

rendered in the solution text:

> It is {k} − 1, not the $(r-1)(c-1) = {wrongTwoWay}$ that belongs to a two-way table.

`(k − 1)(2 − 1) = k − 1 = df`. For a four-class context the learner reads *"It is 4 − 1, not the
(r−1)(c−1) = 3 that belongs to a two-way table"* — the solution declares its own answer wrong. Swept
over 200 seeds, every instance renders this contradiction.

Correction: the contrast the sentence wants is a df the learner would actually produce by mistake —
`k · 2 − 1`, or `n − 1`, or the 0 that `(1−1)(k−1)` gives for a single row of k classes. The
`misconception` field two lines down already names "n − 1, or reaching for (rows − 1)(columns − 1)";
pick one of those and compute it.

## 5. CONFIRMED · `content/act-9/01-the-slope-has-a-spread.mdx:181` — wrong TESTS menu label

> Item `F`, below **`E:LinRegTInt`**'s neighbours and above `G:LinRegTInt`.

On the TI-84 Plus CE, item **E is `2-SampFTest`**. `LinRegTInt` is item G, named correctly at the end
of the same sentence — so the line puts the same procedure at two menu letters. The clause
"below E's neighbours" is also garbled.

The book gets this right elsewhere: `content/act-8/01-volatiles.mdx:188` reads "Item **D**, below
`C:χ²-Test` and above `E:2-SampFTest`."

Correction: "Item `F`, below `E:2-SampFTest` and above `G:LinRegTInt`."

This is the same failure mode as the three already shipped (`2nd STO▸`/`RCL`, and `act-7/05` and
`act-7/07` calling item 9 `2-PropZInt`).

## 6. CONFIRMED · `content/act-9/02-one-tonne-per-tonne.mdx:197` — G is not the last TESTS entry

> Item `G`, directly below `F:LinRegTTest`. **It is the last entry on the `TESTS` menu on most
> operating systems, so scroll past `H:` if your list runs on.**

`H:ANOVA(` is present on every TI-84 Plus and TI-84 Plus CE operating system, so `G:LinRegTInt` is
never the last entry, and the sentence contradicts itself inside one clause (last entry / scroll
past H). Correction: "Item `G`, directly below `F:LinRegTTest` and above `H:ANOVA(`."

## 7. CONFIRMED · `content/act-9/02-one-tonne-per-tonne.mdx:185` — answer leakage above the gate

`<Briefing.Caution>` renders `{fmt(nineteenLo, 2)}` and `{fmt(nineteenHi, 2)}` 59 lines above
`act-9-02-interval` (line 244, gated at 290), whose `answer={nineteenLo}` at `digits={3}`.

Lower severity than §2 because the leak is one digit short of what the beat asks for, but it pins
the answer to ±0.005 against a tolerance of 0.0005, so the learner needs only the third decimal and
knows immediately whether they have it.

Correction: the Caution is about what an interval *is not* a statement about; it does not need the
module's own endpoints. Replace with generic symbols, or move the sentence below the gate.

## 8. CONFIRMED · `content/act-7/04-before-and-after.mdx:195` — df stated as n − 2 in words

```
<Calculator.Watch>**The df on the paired screen is $n - 1$ pairs minus one**, so {beaconN} markers
give {beaconN - 1}.
```

As written the sentence says df = (n − 1) − 1 = n − 2. The rendered number is right (n − 1 = 6), and
the Briefing at line 138 states it correctly ("The degrees of freedom are $n - 1$, where $n$ counts
**pairs**"), so this is a prose-only defect — but it sits inside the Watch block whose entire job is
the off-by-one, directly above the line that says "It is not {2n − 2}".

Correction: "The df on the paired screen is the number of **pairs** minus one, so {beaconN} markers
give {beaconN − 1}."

## 9. CONFIRMED · `content/act-4/02-rules-of-chance.mdx:204` — instrument caption prints the beat's answer

`<EventSpacePanel mode="window" perSweepP={P_SWEEP_DETECTS} … />` at line 204.
`src/instruments/act-4/EventSpacePanel.tsx:160` writes the window-mode data-table caption:

> `Per-sweep detection probability p = ${fmt(p, 4)}.`

`act-4-02-detects` (line 226, gated at 241) is `answer={P_SWEEP_DETECTS} answerKind="proportion"`.

Mild, and arguably by design: the beat explicitly instructs the learner to take the complement off
the *nothing* column, and that column's relative frequency is on screen anyway. But the caption
states the answer in the answer's own words, so a learner never has to do the subtraction.

Correction: the window panel does not need to open on the module's own p. Open it on a round value
(0.25, say) and let the learner dial in the one they computed — which is the better instrument
anyway.

## 10. CONFIRMED · `content/act-10/01-consequences.mdx:130` — hand-written numbers in a Formula legend

```
<Formula tex={picketTex} terms={{ '0.75': 'a wrecker at Kettle at all …',
                                  '0.40': 'cold on picket in the approach quarter …' }} … />
```

`picketTex` interpolates `fmt(PICKET.present, 2)` and `fmt(PICKET.onPicketGivenPresent, 2)`, so the
TeX is computed and the legend keys are not. They happen to agree today (`P_WRECKER_PRESENT = 0.75`,
`P_ON_PICKET_GIVEN_PRESENT = 0.4`), and `src/instruments/act-10/data.test.ts:142-143` pins only the
product (`canRespond === 0.3`) and the identity `present × onPicketGivenPresent === canRespond` —
not either factor individually. Change `PICKET.present` to 0.6 and the two factors still multiply to
a pinned 0.3 while the legend silently becomes a lie.

Violates the zero-tolerance rule ("every table value… computed at runtime"). Correction: key the
legend on the symbols (`P(\text{wrecker at Kettle})`, `P(\text{on picket} \mid \text{present})`) and
let the TeX carry the figures, or pin both factors in `data.test.ts`.

## 11. CONFIRMED · `docs/curriculum-map.md:591` — stale expected-count figure (open question 1)

See §A below. The line says 0.46; the built table's minimum expected count is **0.830**.

## 12. CONFIRMED · `content/act-6/02-margin.mdx:225-233` — computed `correct=`, hand-written feedback

`correct={claimCorrect}` where `claimCorrect = clearsRook && clearsBoard ? 2 : clearsRook ? 0 :
clearsBoard ? 1 : 3` (line 50). The feedback array nulls index 0 **conditionally**
(`claimCorrect === 0 ? null : …`) and hard-codes the other three for the `claimCorrect === 0` world:

- `feedback[1]`: "…so 'only the second' is not a shape this comparison can produce"
- `feedback[3]`: "One of the two lies entirely below the interval"

Computed today: `ROOK_BASELINE` = 0.005039, `BOARD_BASELINE` = 0.011005, `LANE_INTERVAL.ci` =
(0.007715, 0.016021) → clearsRook = true, clearsBoard = false → **claimCorrect = 0**, so the beat is
correct as it stands.

But the branch is live. If the Ledger seed moves and `claimCorrect` becomes 1, 2 or 3, the beat
shows *explanatory feedback on the correct option* and `null` on a distractor, and `feedback[3]`
asserts something false. Either pin the shape in a test, or derive the whole feedback array from
`claimCorrect` the way `src/lib/problems/generators/act-6/margin.ts:212-233` does for the same
question (that generator is correct — I checked all three shapes and confirmed "only the second" is
unreachable because `b > a` by construction in every branch).

## 13. CONFIRMED · `content/act-6/02-margin.mdx:248` — tolerance wider than the rounding asked for

`answer={targetTransits} answerKind="count" tolerance={60}`, prompt: *"Give the answer **to the
nearest hundred transits**."*

`TRANSITS_FOR_TARGET_MARGIN` = 11,263 → `targetTransits` = 11,300. A tolerance of 60 on a
nearest-hundred answer admits 11,240 — which rounds to 11,200, the wrong bucket. Not a wrong-method
pass (the real distractors, e.g. p* = 0.5 → 240,100, are far away), but the tolerance and the
instruction disagree. Either drop the rounding instruction and set tolerance ≈ 50, or keep the
rounding and set tolerance ≈ 49.

## 14. CONFIRMED · `<Formula terms>` keys that are not in the TeX

I parsed all 187 `<Formula>` blocks that carry a `terms` legend (resolving template-literal and
identifier `tex=` forms) and checked each key against the rendered TeX under the matching rules in
`src/components/Formula.tsx:wrapTerms`. 31 keys never match, so their legend rows render with no
corresponding highlight in the formula. Most are compound or paraphrased keys ("`s_1, s_2`",
"`a, b`", "`\sqrt{\;\cdot\;}`", "`\sqrt{\hat{p}(1-\hat{p})/n}`" against a `\frac` form) — cosmetic.
Two name a symbol the formula genuinely does not contain and should be renamed:

- `content/act-2/02-inferred-mass.mdx:98` — key `z_x`; the TeX writes the z-scores out longhand as
  `(x_i − x̄)/s_x` and never shows `z_x`.
- `content/act-1/02-cause-codes.mdx:105` — key `v_i`; the TeX uses `v_1` and `v_2` only.

Full list on request; the other 29 are legend-highlight cosmetics, not maths.

---

## SUSPECTED

- **`content/act-7/01-twelve-is-a-margin.mdx:151`** — *"Older TI-84 firmware hides `invT` behind
  `2nd` `DISTR` and lists it as item 4. If it is not there, the OS predates it…"* This describes
  current firmware, not older firmware: `4:invT(` is exactly where it lives on every TI-84 Plus CE.
  `invT` was added in OS 2.30 for the monochrome TI-84 Plus and has never been absent from the CE,
  so the fallback advice is unreachable on the platform the book targets. I could not verify what
  behaviour the line was written against; suggest cutting it or restating it as "on a monochrome
  TI-84 Plus running OS below 2.30, `invT` is absent and the interval comes off `8:TInterval`."

- **`content/act-9/04-the-evidence-board.mdx:216`** — inside a `<Calculator.Watch>`: *"A slope held
  against a value physics or a contract fixes is computed by hand from the `Coef` and `SE Coef` of
  the output."* `Coef` / `SE Coef` are the course's own in-world regression-output labels (used in
  the hints at `act-9/02:249` and `act-9/03:233`), not TI-84 labels. Inside a panel whose contract is
  "the calculator's own menu labels" this reads as a cross-platform label leak. `act-9/03:239` does
  the same job correctly off the calculator: `SE(b) = b ÷ t`. Suggest matching that.

- **`content/act-2/02-inferred-mass.mdx:141` and `content/act-2/03-line-of-best-fit.mdx:140`** —
  *"`2nd` `0` for CATALOG, `ALPHA` `D` to jump"*. CATALOG opens with alpha-lock already on, so
  pressing `ALPHA` turns the lock **off** and the next key types `x⁻¹` rather than jumping to D.
  `content/act-9/01:179` gets it right ("`2nd 0` is `CATALOG`. Scroll to `DiagnosticOn`"). I am
  confident about the alpha-lock behaviour but flagging rather than asserting, since some OS
  revisions re-lock.

- **`content/act-5/01-why-the-reports-disagree.mdx:136, 138`** and **`act-5/03:126, 127`** —
  `<Calculator.Read label="mean(L1)" value={fmt(marsRate, 5)}>` and
  `<Calculator.Read label="Sx" value={fmt(marsSd, 5)}>` present the *theoretical* parameter and the
  closed-form SD as the value the screen returns from a simulation. The prose disclaims it
  immediately ("Your run will land near it and never exactly on it"), so this is a presentation
  choice rather than an error, but a `Calculator.Read` is elsewhere a literal screen transcription
  and a learner comparing their own run will not match to five decimals.

---

## Checked and correct — not re-listed above

Recorded only so the next reviewer does not repeat the sweep.

- **No literal `answer=` props.** All 88 `answer=` props across 45 files are computed expressions;
  `grep answer=\{?-?[0-9]` returns nothing.
- **No duplicate options in any generator.** I instantiated every registered generator over 200
  seeds and compared option strings pairwise: zero collisions. (`tests/unit/problems/all-generators.test.ts`
  checks that a generator's stated answer grades *itself* correct — it does not check the
  mathematics, so this was worth doing separately.)
- **P-value, "accept H₀" and confidence-level language.** Every instance of each misstatement in the
  book appears as a named misconception with a correct refutation (`act-6/checkpoint.mdx:118`,
  `act-6/05:266`, `act-6/01:128,196`, `act-7/02:133`), or as a distractor with correct feedback
  (`act-6/05:206` → `feedback[3]`). The duality option at `act-6/05:203` correctly matches a
  one-sided test at α to the (1 − 2α) interval and correctly flags the pooled/unpooled SE difference.
- **Large Counts and the 10% condition** are stated *and* applied with arithmetic everywhere they
  appear, including the hard case: test at p₀ / pooled p̂c versus interval at p̂
  (`act-6/03:195,206,241`, `act-6/07:170`, `act-6/08:155,184,201,225`).
- **Every df statement** in prose, Formula and LogEntry is correct (n − 1, k − 1, (r−1)(c−1), n − 2,
  Welch's and the conservative min) except §8.
- **TESTS-menu letters** are correct everywhere except §5 and §6: `5:1-PropZTest`, `6:2-PropZTest`,
  `A:1-PropZInt`, `B:2-PropZInt`, `C:χ²-Test`, `D:χ²GOF-Test`, `2:T-Test`, `8:TInterval`,
  `0:2-SampTInt`, `4:2-SampTTest`, `F:LinRegTTest`, `G:LinRegTInt`.
- **Argument orders and bounds**: `binompdf/binomcdf(n,p,x)` against `geometpdf/geometcdf(p,x)`
  (`act-4/08:238-239`, `act-4/09:182`, `act-4/10:215-216`), `normalcdf(lower,upper,μ,σ)` with
  `±1E99` and the `2nd ,` EE key, `invNorm` left-tail with the `(1+C)/2` conversion, `Sx` vs `σx`
  including the FreqList case where `n` returns 1 — all correct.
- **`2nd DISTR`** (8 occurrences) coexists with `2nd VARS` (6 occurrences). Both are valid — DISTR is
  the yellow legend above the VARS key — so this is an inconsistency, not an error. Worth settling on
  one, but I have not counted it as a defect.

---

## A. Open question 1 — the examiner table's expected count

**The doc line is stale, and the table has not been dropped.**

`docs/curriculum-map.md:591` says the examiner × lost table "fails the expected-count condition (one
cell expects 0.46)". The built Act VIII has *both* tables:

| table | source | smallest expected count | condition |
| --- | --- | --- | --- |
| beneficiary × outcome | `src/instruments/act-8/data.ts:107` `beneficiaryTable` = [[19, 881], [12, 1700]] | **10.681** (Perrine & lost) | passes |
| examiner × diverted | `src/instruments/act-8/data.ts:186` `examinerTable` = [[17, 1], [2, 392]] | **0.830** (Dacre & diverted) | fails |

Full expected table for the examiner case: [[0.8301, 17.1699], [18.1699, 375.8301]], n = 412 from
DS-02.

So:

- The real figure is **0.830**, not 0.46. The doc is stale on the number.
- The doc is also stale on the variable: the built table cross-classifies by **diverted**, not lost,
  over the 412 Manifest departures rather than the Ledger.
- The doc's substantive claim — the condition fails, so the module answers it by permuting the
  labels rather than by χ² — is **correct and is what the built Act does**
  (`EXAMINER_PERMUTATION`, 10,000 reps, observed gap never reached, `pValue` = 0).
- `src/instruments/act-8/data.ts:27` already carries the right figure in its header comment:
  *"examiner × diverted on the 412: the Dacre-diverted cell expects 0.83"*. The code is right; only
  `docs/curriculum-map.md:591` needs the edit.

(For completeness, the GOF table at `act-8/01-02` has expected counts 11.78 / 6.51 / 5.27 / 7.44,
all ≥ 5, χ² = 40.833 on df 3, p = 7.1e-9 — matching `docs/beat-sheet.md:120`.)

## B. Open question 2 — the DS-09 discrepancy

**Act VII is internally correct, asserts the 2.7 nominal nowhere, and should not be changed. The
stale line is in `docs/beat-sheet.md:97`.**

Computed from the accepted seed (`LEDGER_SEED_ATTEMPT = 31`):

| quantity | value |
| --- | --- |
| `LANE_DELAY_MEAN` (honest, n = 2,593) | 0.0554 d |
| `LANE_DELAY_SD` (honest) | **2.7291 d** |
| `NINETEEN_MEAN_DELAY` | 2.8295 d |
| `NINETEEN_SD_DELAY` | **2.3340 d** |
| `Z_MEAN_19` (σ/√19, Act V) | **4.4306** |
| `NINETEEN_TEST` (one-sample t, Act VII) | t = **5.2843**, se = 0.53545, df = 18, p = 2.52e-5 |

**Is Act VII's inference internally correct?** Yes, exactly. se = s/√n = 2.33398/√19 = 0.535452;
t = 2.829474 / 0.535452 = 5.284275; df = 18; p = P(T₁₈ ≥ 5.2843) = 2.52e-5. Every downstream Act VII
figure follows from the same s and is consistent. `src/instruments/act-7/data.test.ts:150-153` pins
t ∈ (4.0, 5.6), df = 18, p < 0.001 — satisfied.

**Does any Act VII prose assert the 2.7 nominal or the 4.5 target?** No. I grepped `content/act-7/`
for 2.7, 2.8, 4.5, 5.28 and word forms: the only hits are unrelated data literals in the worked
escort-trial arrays. Act VII states no SD for the nineteen and no expected t anywhere.

**Where the 2.7/4.5 pair actually comes from.** `docs/beat-sheet.md:97` reads: *"their SD ≈ 2.7 d …
P(mean of 19 honest ≥ 2.8) → z ≈ 4.5; one-sample t on the nineteen's own s: t ≈ 4.5, df 18."* That
sentence conflates two different spreads. The **z** of 4.43 is computed on the Lane's honest
σ = 2.729 and matches the registry's 4.5 to within rounding — that figure is fine and
`acceptLedger` pins it hard (`src/instruments/act-5/data.ts:216`, z ∈ [4.35, 4.95]). The **t** uses
the nineteen's *own* s, and the registry assumed the nineteen's s would also land near 2.7. It does
not: the acceptance rule at `src/instruments/act-5/data.ts:210` allows
`sd(nineteen) ∈ [2.2, 3.2]`, a band wide enough that the seed found at attempt 31 sits at 2.334.
With s = 2.334, t = 5.28 is the only arithmetically possible answer.

**Which would I change? The beat-sheet, not Act VII.** Reasons:

1. Act VII is not wrong about anything. Its numbers follow from its data and it never quotes the
   nominal, so there is no statement in the shipped book that the discrepancy falsifies.
2. Tightening `acceptLedger` to force s ≈ 2.7 regenerates DS-09, which is the spine of Acts V, VI,
   VII, VIII, IX and X. Every pinned value in five `data.test.ts` files, every worked figure in
   roughly thirty modules, and the two checkpoints that quote them would move at once — a large,
   high-risk change bought for a doc line.
3. Nothing pedagogical is lost at s = 2.334. t = 5.28 on df 18 teaches the same lesson as t = 4.5:
   collectively impossible, individually unremarkable (P(one honest transit that late) = 0.155, and
   exactly one of the nineteen clears the 1% cutoff, which is the point `act-5/02` is built on).
4. The one place the gap genuinely matters is the *contrast* the story wants between z = 4.43 (the
   Act V machine, on the Lane's σ) and t ≈ the same (the Act VII procedure, on the nineteen's own s).
   At 5.28 against 4.43 the two no longer land on top of each other. That is a narrative nicety, not
   an error, and the honest fix is the one the beat sheet should have made: stop asserting a value
   for the nineteen's s that the acceptance rule does not enforce.

**Recommended edit to `docs/beat-sheet.md:97`:** replace *"their SD ≈ 2.7 d"* with the band the
acceptance rule actually enforces (2.2–3.2 d, currently 2.33), and replace *"one-sample t on the
nineteen's own s: t ≈ 4.5, df 18"* with *"one-sample t on the nineteen's own s: t ≈ 5.3, df 18
(the t moves with the drawn s; z ≈ 4.4 is the pinned figure)"*. If the orchestrator wants the 2.7
nominal honoured instead, the change is one line —
`src/instruments/act-5/data.ts:210`, narrow `[2.2, 3.2]` to roughly `[2.6, 2.85]` — but it must be
treated as a DS-09 regeneration with a full re-pin of Acts V–X, not as a tweak.

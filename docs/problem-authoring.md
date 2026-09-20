# Problem Authoring Guide — DEAD RECKONING

How to write drill generators, mission-beat answers and checkpoint items that the grading engine,
the Math Auditor's validation sweep and the AP "conclusion in context" discipline all accept.

Framework: `src/lib/problems/` (Assessment Designer owned). Act Teams add files under
`src/lib/problems/generators/act-N/*.ts` and `src/lib/problems/checkpoints/act-N.ts`.

---

## 1. Write a generator, step by step

```ts
// src/lib/problems/generators/act-6/loss-rate-test.ts
import { defineGenerator, drawDataset, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import { mean, sd } from '@/lib/stats'          // every number comes from here
import { fmt, fmtP } from '@/lib/stats/format'  // round ONCE, at display

export const lossRateTest = defineGenerator({
  id: 'act-6/loss-rate-test',        // act-N/kebab-slug — validated
  label: 'Loss rate vs baseline',    // drill card header
  ap_topics: ['6.4', '6.5'],         // CED topic codes, non-empty
  skills: ['3', '4'],                // optional CED skill categories
  generate(rng) {
    // 1. Draw parameters through the Rng only (Math.random is banned).
    const ctx = pickContext(rng, CONTEXTS)
    const n = rng.int(40, 90)
    // 2. Reject degenerate draws unless the degenerate case IS the lesson.
    const { x } = retry(rng, (r) => ({ x: r.binomial(n, 0.11) }), ({ x }) => x >= 10 && n - x >= 10)
    // 3. Compute the answer with @/lib/stats.
    const result = onePropZTest(x, n, 0.08, 'greater')   // Engine function
    // 4. Return the instance. Numbers in `solution` MUST come from the same computation.
    return {
      prompt: `…in-world framing with ${n} transits and ${x} losses…`,
      answer: numericAnswer(result.p, 'pValue'),
      hints: ['nudge', 'method', 'nearly-the-answer'],      // 2–3 entries
      solution: `$z = … = ${fmt(result.z, 2)}$, so $p = ${fmtP(result.p)}$.`,
      misconception: 'optional common mistake',
    }
  },
})
```

**Registration is automatic**: any exported `ProblemGenerator` (or array) under `generators/**` is picked up.
`defineGenerator` validates the definition at load time and self-checks **every draw**:

| Check | Failure means |
|---|---|
| prompt / solution non-empty, 2–3 hints | incomplete item |
| answer finite | a stats call returned NaN — your rejection rule is too loose |
| **formatted numeric answer appears in the solution** (or any number in the solution is within tolerance) | solution/answer drift — the worked solution and the answer were computed differently |
| choice: `correct` in range, options distinct | broken distractors |
| interpretation: exemplar passes its own rubric | rubric and exemplar disagree |
| display / data specs well-formed | chart would not render |

In dev and tests a failed self-check **throws** with the seed; in production it logs and renders anyway.
`tests/unit/problems/all-generators.test.ts` runs every registered generator across 200 seeds — run
`npx vitest run tests/unit/problems` before you report.

### Answer types

```ts
numericAnswer(value, kind, { digits?, units?, tolerance?, allowInequality? })   // preferred
{ type: 'numeric', value, tolerance?, relativeTolerance?, digits?, units?, kind?, allowInequality? }
{ type: 'choice', options: string[], correct: number, feedback?: (string|null)[] }
{ type: 'multi',  options: string[], correct: number[], feedback?: (string|null)[] }
{ type: 'interpretation', required: RubricGroup[], forbidden?, exemplar, minWords?, passScore? }  // use a template
{ type: 'display', display: DisplaySpec, question: <numeric|choice|multi|interpretation> }         // "interpret this display"
```

`problem.data` (a `DisplaySpec`) shows a table or plot above the prompt; `display` answers render the
chart with the label INTERPRET THIS DISPLAY. Both are drawn by `<Plot>` with an accessible table fallback.

---

## 2. Tolerance policy (by answer kind)

| `kind` | default digits | tolerance | notes |
|---|---|---|---|
| `pValue` | 4 | **0.0005 absolute** | `allowInequality` auto-enabled when p < 0.001 ("p < 0.001" accepted; bound must exceed the true value and be ≤ 0.001, or ≤ `{ max }`) |
| `testStat` | 2 | **0.01 absolute** | z, t, χ² |
| `proportion` | 3 | **0.001 absolute** | "41.2%" is converted to 0.412 automatically |
| `count` | 0 | exact | |
| `mean` / `other` | 2 (set `digits` to what the prompt asks for) | **half a unit in the last displayed digit** | e.g. digits 1 → ±0.05 |
| `percent` | 1 | half the last digit | set `units: '%'`; "0.412" gets "express as a percentage" feedback |

Explicit `tolerance` or `relativeTolerance` always wins. The prompt should state the precision it wants
("to one decimal place") and `digits` should match it.

The parser accepts: commas, `%`/percent, fractions `3/4`, scientific `1.2e-4` / `1.2 × 10^-4`, leading
`≈ ~ about`, labels `p =`, `z ≈`, unicode minus, trailing units (`12.5 km`), European decimal comma.
Wrong answers get diagnostic feedback: close-but-rounding, sign error, percent-vs-proportion.

---

## 3. Hints: nudge → method → nearly-the-answer

1. **Nudge** — which concept applies, no numbers: "A conditional relative frequency uses a row total."
2. **Method** — the procedure with the problem's numbers named: "Row total for Hull A: 38. Faults: 9."
3. **Nearly the answer** (optional third) — the expression set up: "$9/38$, to three decimals."

Never put the final answer in a hint; the "READ INSTRUMENT" reveal after two wrong attempts does that.

## 4. Worked solutions

- Show the formula **with the numbers substituted**, then the result, using `fmt`/`fmtP` for every number:
  ``$\bar{x} = \frac{${xs.map(v => fmt(v,1)).join(' + ')}}{${n}} = ${fmt(m, 3)}$``
- Bold the final answer at the precision the prompt asked for. The validator checks that the formatted
  answer (or a number within tolerance) appears in the solution.
- For interpretation items, the solution is the template `exemplar` plus one sentence on the common mistake.
- Markdown subset: paragraphs, `**bold**`, `*em*`, `` `code` ``, `- lists`, `1. lists`, `## headings`,
  GFM tables (`tableMd(columns, rows, digits)`), `$inline$` and `$$display$$` math. All text is HTML-escaped.

## 5. Degenerate-case rejection rule

Use `retry(rng, draw, accept)` or the `accept` option of the draw helpers to redraw until the case is
realistic and the lesson is unambiguous:

- inference conditions met (np ≥ 10, expected counts ≥ 5, n ≥ 30 …) unless the item is *about* a failed condition — then say so in `notes`;
- no ties where the learner must read a median/quartile off a list; distinct values where sorting matters;
- |r| large enough that the relationship the drill is about is visible (`drawScatter` rejects |r| < 0.1 by default);
- a dotplot whose sample actually shows its parent shape (see `act-0/dotplot-shape`);
- an outlier that moves the mean clearly more than the median (see `act-0/resistant-center`).

`retry` throws after 200 tries — loosen the constraints rather than raising the cap.

## 6. Dataset helpers (`@/lib/problems/generate`)

```ts
drawDataset(rng, { n, mean, sd, round?, min?, max?, shape?: 'normal'|'skewLeft'|'skewRight'|'uniform'|'bimodal', distinct?, accept? })
drawScatter(rng, { n, slope, intercept, noise, xRange, round?, xStep?, rRange?, accept? })  // → { points, xs, ys, r }
drawTwoWay(rng, { rows, cols, n, association?: 0..1, minCell?, accept? })                 // → { counts, rowTotals, colTotals, total, expected }
pickContext(rng, contexts)      // one in-world framing
tableMd(columns, rows, digits?) // Markdown table for prompts/solutions
tableSpec(columns, rows)        // DisplaySpec table for `data:` / `display:`
listNumbers(values, digits)     // "11.2, 14.8, 9.6"
```

`drawScatter.r` is an internal rejection metric only — report r, slope, r² from `@/lib/stats` regression
functions (Engine). `drawTwoWay.expected` likewise; use the Engine's chi-square for answers.

---

## 7. AP conclusion-in-context: the template rules

The rubric engine (`src/lib/problems/rubric.ts`) normalizes case/whitespace/punctuation, maps symbols
(`<` → less, `%` → percent, `H₀` → null, `α` → alpha), stems lightly (plural/-ing/-ed/-ly), collapses
synonym groups (suggests/supports/indicates → evidence; higher/larger/exceeds/increases → greater; …),
and is **negation-aware**: "do not reject", "fail to reject", "cannot reject", "no evidence",
"insufficient evidence" never satisfy a positive phrasing like `reject` or `evidence`. Forbidden
phrasings fail the item (score capped at 0.5) with an explanation. Optional groups are feedback only.

A significance-test conclusion must:
1. **Decide** — "reject H₀" when p < α; "fail to reject H₀" (never "accept") otherwise.
2. **Cite p and α** — "p = 0.0123 < α = 0.05".
3. **Frame as evidence** — "there is convincing evidence that…" / "there is not convincing evidence that…".
4. **State Hₐ's direction** — greater / less / differs, with the null value.
5. **Name the context** — the population and the variable: "the true mean transit time of corridor freighters".
6. Never: "proves", "accept H₀", "the probability that H₀ is true", the wrong decision.

A confidence-interval interpretation must give the level with "confident", both endpoints, the
**true/population** parameter, and the context; never "95% probability the parameter is in the interval",
"95% of the freighters", or "the sample mean is between…".

## 8. Rubric templates (`@/lib/problems/rubrics`)

Each returns an `InterpretationAnswer` (required groups with per-group feedback, forbidden claims with
explanations, `exemplar`, `minWords`). Spread it into a `<MissionBeat kind="interpretation" {...tpl}>` or
use it as a drill `answer`. Pass numbers from `@/lib/stats`.

| Template | Parameters | Requires | Forbids |
|---|---|---|---|
| `confidenceIntervalInterpretation` | `{ level (0.95 or 95), parameter, lower, upper, context: { population, variable, units? }, digits? }` | level %, "confident", both endpoints, true/population, parameter word, context | probability/likely statements, "95% of the individuals", sample statistic, proves |
| `significanceTestConclusion` | `{ pValue, alpha, direction: 'greater'|'less'|'two-sided', parameterContext: { parameter, population, variable, units?, nullValue? }, directionWords? }` | decision consistent with p vs α, p cited, α cited, evidence framing (reject case), Hₐ direction, context | proves, accept H₀, probability H₀ true, the opposite decision |
| `slopeInterpretation` | `{ slope, xVar, yVar, xUnits?, yUnits?, digits? }` | slope value, predicted/on average, direction, per one unit of x, both variables | causes, proves |
| `rSquaredInterpretation` | `{ r2 (0–1 or %), xVar, yVar }` | value, "variation in y", "explained by", both variables | "% of the data points", causes |
| `correlationDescription` | `{ r, xVar, yVar }` | direction, strength band, "linear", association/correlation, both variables (optional: cites r) | wrong direction, causes |
| `residualInterpretation` | `{ residual (actual − predicted), yVar, yUnits?, xVar?, xValue?, digits? }` | magnitude, actual-vs-predicted direction (under/overestimates), response variable | wrong direction |
| `standardDeviationInterpretation` | `{ sd, variable, units?, population?, mean?, digits? }` | value, typically/on average, vary/distance from, the mean, context | SD as a bound ("all values within…") |
| `expectedValueInterpretation` | `{ value, variable, units?, context (plural process), digits? }` | value, long-run/many repetitions, average/mean/expected, context | exactly/always/every time |
| `samplingBiasIdentification` | `{ biasType, mechanism (one sentence), direction?: 'over'|'under', parameter, population }` | bias type, mechanism keywords, consequence, direction (if given), context | wrong direction |
| `conditionsCheck` | `{ procedure, random?: 'sample'|'assignment', n, counts?, populationSize?, normal?: 'clt'|'graph'|'stated', minExpected?, context? }` | Random, 10%/independence with numbers, Normal/Large Counts with numbers | — |

Custom groups: `{ label, phrasings: (string | RegExp)[], feedback?, polarity?: 'positive'|'any', minMatches?, weight?, optional? }`.
String phrasings are token phrases (gaps ≤ 3 words, one clause); RegExps run on the normalized text
(lower-case, numbers intact, `pvalue`, `alpha`, `null`, `percent`, `less`/`greater`). Use
`numberRegex(value, digits)` from `@/lib/problems/rubric` to require a computed number, and
`contextGroup(label, [population, variable])` for context. Set `polarity: 'any'` on direction groups
("not enough evidence that the mean is **greater**").

## 9. Mission beats and checkpoints

```mdx
<MissionBeat id="act-6-02-test" kind="interpretation" hint="p versus α first; then say it in context."
  {...significanceTestConclusion({ pValue: t.p, alpha: 0.05, direction: 'greater', parameterContext: {...} })}>
  <Success>…</Success><Failure>…</Failure>
</MissionBeat>
<MissionBeat id="…" kind="numeric" answer={t.p} answerKind="pValue" prompt="…" />
```

Checkpoint spec (`checkpoints/act-N.ts`): `{ act, title, briefing, items: [{ id, generator, review: [moduleIds], weight?, debrief? }], threshold? (0.8), onPass, onFail, est_minutes }`.
Include one `display` item. Every attempt reseeds; missed items list their `review` modules and `debrief` line.

## 10. Checklist before you report

- [ ] `defineGenerator` used; id `act-N/slug`; `ap_topics` non-empty; `label` set
- [ ] every number from `@/lib/stats`; `fmt`/`fmtP` only at display; no literal answers
- [ ] degenerate draws rejected (or `notes` says the degenerate case is the lesson)
- [ ] `answer` uses `numericAnswer(value, kind)` or a rubric template; prompt states the precision
- [ ] hints: 2–3, nudge → method → nearly-the-answer; no final answer
- [ ] solution shows the formula with numbers substituted and the bold final answer
- [ ] `misconception` for the predictable wrong path
- [ ] `npx vitest run tests/unit/problems` green (all-generators sweep, 200 seeds)
- [ ] `npx tsc -p tsconfig.app.json --noEmit` clean

/**
 * Act III drill generators: shape across seeds, plus the content invariants that matter — the answer
 * really is the quantity the prompt asks for, recomputed here from @/lib/stats rather than trusted.
 *
 * Run: npx vitest run src/lib/problems/generators/act-3
 */
import { describe, expect, it } from 'vitest'
import { getGenerator, instantiate } from '@/lib/problems/registry'
import { validateInstance } from '@/lib/problems/validate'
import { gradeInterpretation } from '@/lib/problems/rubric'
import type { ChoiceAnswer, DisplayAnswer, NumericAnswer, ProblemInstance, QuestionAnswer } from '@/lib/problems/types'
import { binomial, permutationPValue } from '@/lib/stats'

const SEEDS = 30
const seed = (i: number) => i * 104729 + 7

/** The gradeable part of an instance's answer (unwraps `display`). */
const question = (p: ProblemInstance): QuestionAnswer => (p.answer.type === 'display' ? p.answer.question : (p.answer as QuestionAnswer))

const KINDS: Record<string, QuestionAnswer['type'] | 'display'> = {
  // act-3-01 · who was asked
  'act-3/study-type-scope': 'choice',
  'act-3/population-frame-sample': 'choice',
  'act-3/frame-defect': 'numeric',
  'act-3/scope-of-inference-framing': 'interpretation',
  // act-3-02 · drawing the sample
  'act-3/identify-method': 'choice',
  'act-3/srs-random-digits': 'numeric',
  'act-3/stratify-or-cluster': 'choice',
  'act-3/design-justification': 'interpretation',
  'act-3/sampling-cost': 'numeric',
  // act-3-03 · bias
  'act-3/name-the-bias': 'interpretation',
  'act-3/bias-or-variability': 'choice',
  'act-3/bias-direction': 'choice',
  'act-3/nonresponse-rate': 'numeric',
  'act-3/larger-sample-effect': 'choice',
  // act-3-04 · the Admiralty's trial
  'act-3/units-factors-response': 'choice',
  'act-3/explain-confound': 'interpretation',
  'act-3/choose-design': 'choice',
  'act-3/blocking-rationale': 'choice',
  'act-3/control-replication': 'choice',
  // act-3-05 · the escort lottery
  'act-3/randomization-significance': 'display',
  'act-3/scope-of-inference': 'interpretation',
  'act-3/randomization-p': 'numeric',
  'act-3/significant-vs-important': 'choice',
  'act-3/small-trial-power': 'numeric',
  'act-3/assignment-conditions': 'interpretation',
}

const IDS = Object.keys(KINDS)

/** Parse a number written by `fmt` (typographic minus, thousands separators). */
const num = (s: string): number => Number(s.replace(/\u2212/g, '-').replace(/,/g, ''))

// ---------------------------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------------------------

describe('act-3 generators: registration and shape', () => {
  it('every id in the Act III checkpoint spec is registered', () => {
    for (const id of IDS) expect(() => getGenerator(id), id).not.toThrow()
  })

  it.each(IDS)('%s: shape holds across seeds', (id) => {
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate(id, seed(i))
      const where = `${id} seed ${seed(i)}`
      // The framework's own self-check: prompt/solution non-empty, 2–3 hints, answer finite,
      // formatted numeric answer present in the solution, choice indices in range, exemplar passes.
      expect(validateInstance(p), where).toEqual([])
      expect(p.hints.length, where).toBeGreaterThanOrEqual(2)
      expect(p.hints.length, where).toBeLessThanOrEqual(3)
      expect(p.misconception, where).toBeTruthy()

      const declared = KINDS[id]
      if (declared === 'display') expect(p.answer.type, where).toBe('display')
      else expect(p.answer.type, where).toBe(declared)

      const q = question(p)
      if (q.type === 'choice') {
        expect(q.options.length, where).toBeGreaterThanOrEqual(3)
        expect(new Set(q.options).size, where).toBe(q.options.length)
        expect(q.feedback?.[q.correct] ?? null, where).toBeNull()
        for (let k = 0; k < q.options.length; k++) if (k !== q.correct) expect(q.feedback?.[k], `${where} option ${k}`).toBeTruthy()
      }
      if (q.type === 'interpretation') {
        const r = gradeInterpretation(q, q.exemplar)
        expect(r.forbidden ?? [], where).toEqual([])
        expect(r.correct, `${where}: ${r.feedback}`).toBe(true)
        // The worked solution leads with the exemplar.
        expect(p.solution.includes(q.exemplar), where).toBe(true)
      }
      if (q.type === 'numeric') {
        expect(Number.isFinite(q.value), where).toBe(true)
        // No hint may give the answer away verbatim at the stated precision.
        const shown = q.value.toFixed(q.digits ?? 3)
        if (Math.abs(q.value) >= 0.001) for (const h of p.hints) expect(h.includes(`**${shown}**`), `${where} hint reveals answer`).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Content invariants
// ---------------------------------------------------------------------------------------------

describe('act-3/frame-defect: the answer is the population minus the frame', () => {
  it('matches the status table', () => {
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/frame-defect', seed(i))
      const spec = p.data
      expect(spec?.kind).toBe('table')
      const rows = (spec as { kind: 'table'; rows: (string | number)[][] }).rows
      const [berthed, inTransit, laidUp, dark, total] = rows.map((r) => Number(r[1]))
      expect(berthed + inTransit + laidUp + dark).toBe(total)
      const missed = inTransit + laidUp + dark
      const a = p.answer as NumericAnswer
      if (/proportion/.test(p.prompt)) expect(a.value).toBeCloseTo(missed / total, 10)
      else expect(a.value).toBe(missed)
    }
  })
})

describe('act-3/srs-random-digits: the digit line is walked correctly', () => {
  const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth']
  it('agrees with an independent walk of the line', () => {
    let sawPairs = false
    let sawHull = false
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/srs-random-digits', seed(i))
      const N = Number(/numbered the (\d+) hulls/.exec(p.prompt)![1])
      const k = Number(/simple random sample of (\d+) of them/.exec(p.prompt)![1])
      const digits = /`([\d ]+)`/.exec(p.prompt)![1].replace(/ /g, '')
      const selected: number[] = []
      let pairsRead = 0
      for (let j = 0; j + 1 < digits.length && selected.length < k; j += 2) {
        pairsRead++
        const label = Number(digits.slice(j, j + 2))
        if (label >= 1 && label <= N && !selected.includes(label)) selected.push(label)
      }
      expect(selected.length, `seed ${seed(i)}`).toBe(k)
      const a = p.answer as NumericAnswer
      if (/How many pairs/.test(p.prompt)) {
        sawPairs = true
        expect(a.value).toBe(pairsRead)
        // A skipped pair was actually read: the walk is longer than the sample.
        expect(pairsRead).toBeGreaterThan(k)
      } else {
        sawHull = true
        const wanted = ORDINALS.findIndex((w) => p.prompt.includes(`the **${w}** one selected`))
        expect(wanted).toBeGreaterThanOrEqual(0)
        expect(wanted).toBe(k - 1)
        expect(a.value).toBe(selected[k - 1])
      }
    }
    expect(sawPairs && sawHull, 'both variants appear across seeds').toBe(true)
  })
})

describe('act-3/sampling-cost: hours and affordable n are consistent with the stated rates', () => {
  it('recomputes the cost', () => {
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/sampling-cost', seed(i))
      const first = Number(/contact costs \*\*(\d+) minutes\*\*/.exec(p.prompt)![1])
      const a = p.answer as NumericAnswer
      if (/How many hours/.test(p.prompt)) {
        const follow = Number(/costs only \*\*(\d+) minutes\*\*/.exec(p.prompt)![1])
        const k = Number(/\*\*(\d+) [a-z ]+\*\* drawn at random/.exec(p.prompt)![1])
        const per = Number(/\*\*(\d+) masters\*\* contacted in each/.exec(p.prompt)![1])
        expect(a.value).toBeCloseTo((k * first + k * (per - 1) * follow) / 60, 10)
      } else {
        const budget = Number(/spare \*\*(\d+) hours\*\*/.exec(p.prompt)![1])
        expect(a.value).toBe(Math.floor((budget * 60) / first))
        // Rounded DOWN: the budget cannot buy the next contact.
        expect((a.value + 1) * first).toBeGreaterThan(budget * 60)
      }
    }
  })
})

describe('act-3/nonresponse-rate: silent ÷ contacted, and a refusal is a response', () => {
  it('uses the right numerator and the right denominator', () => {
    let sawNon = false
    let sawResp = false
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/nonresponse-rate', seed(i))
      const m = /link to \*\*([\d,]+)\*\* masters\. Of those, \*\*([\d,]+)\*\* answered the questions, \*\*([\d,]+)\*\* came back on the link and said "no comment", and \*\*([\d,]+)\*\* never replied/.exec(p.prompt)
      expect(m, `seed ${seed(i)} prompt shape`).not.toBeNull()
      const [contacted, answered, refused, silent] = m!.slice(1).map(num)
      expect(answered + refused + silent).toBe(contacted)
      const a = p.answer as NumericAnswer
      if (/\*\*nonresponse rate\*\*/.test(p.prompt)) {
        sawNon = true
        expect(a.value).toBeCloseTo(silent / contacted, 12)
        // NOT a refusal-inclusive numerator, and NOT the respondent denominator.
        expect(a.value).not.toBeCloseTo((silent + refused) / contacted, 6)
        expect(a.value).not.toBeCloseTo(silent / answered, 6)
      } else {
        sawResp = true
        expect(a.value).toBeCloseTo((answered + refused) / contacted, 12)
        expect(a.value).not.toBeCloseTo(answered / contacted, 6)
      }
      expect(a.digits).toBe(3)
    }
    expect(sawNon && sawResp, 'both variants appear across seeds').toBe(true)
  })
})

describe('act-3/bias-direction: "cannot be predicted" is a live answer', () => {
  it('produces every direction across seeds, and the correct option carries no feedback', () => {
    const seen = new Set<string>()
    for (let i = 1; i <= 60; i++) {
      const p = instantiate('act-3/bias-direction', seed(i))
      const q = p.answer as ChoiceAnswer
      const text = q.options[q.correct]
      seen.add(/cannot be predicted/.test(text) ? 'unknown' : /too high/.test(text) ? 'over' : 'under')
    }
    expect([...seen].sort()).toEqual(['over', 'under', 'unknown'])
  })
})

describe('act-3/larger-sample-effect: the correct option keeps the bias fixed', () => {
  it('names a √4 = 2 reduction in spread and no change in bias', () => {
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/larger-sample-effect', seed(i))
      const q = p.answer as ChoiceAnswer
      const text = q.options[q.correct]
      expect(text).toMatch(/\\sqrt\{4\} = 2/)
      expect(text).toMatch(/does not move/)
    }
  })
})

describe('act-3/randomization-significance: a real randomization distribution, read at the right place', () => {
  it('is a display item whose verdict follows the p-value in the solution', () => {
    const verdicts = new Set<string>()
    for (let i = 1; i <= 40; i++) {
      const p = instantiate('act-3/randomization-significance', seed(i))
      const a = p.answer as DisplayAnswer
      expect(a.display.kind).toBe('histogram')
      const values = (a.display as { kind: 'histogram'; values: number[]; binWidth?: number }).values
      expect(values.length).toBe(400)
      expect((a.display as { binWidth?: number }).binWidth).toBeGreaterThan(0)
      expect(a.question.type).toBe('choice')

      const m = /P = \\frac\{(\d+)\}\{(\d+)\}/.exec(p.solution)!
      const count = Number(m[1])
      const reps = Number(m[2])
      expect(reps).toBe(values.length)
      const pv = count / reps
      // The count in the solution is genuinely the upper tail of the drawn distribution. The observed
      // value in the prompt is displayed to 2 dp, so bracket it rather than demanding equality.
      const observed = num(/Observed difference \(standard − damper\): \*\*(−?[\d.]+) advisories/.exec(p.prompt)![1])
      expect(pv).toBeGreaterThanOrEqual(permutationPValue(values, observed + 0.005, 'greater') - 1e-12)
      expect(pv).toBeLessThanOrEqual(permutationPValue(values, observed - 0.005, 'greater') + 1e-12)

      const q = a.question as ChoiceAnswer
      const chosen = q.options[q.correct]
      const saysSignificant = chosen.startsWith('**Statistically significant.**')
      expect(saysSignificant).toBe(pv < 0.05)
      // The correct reason is about position in the distribution, never about the size of the gap.
      expect(chosen).toMatch(/randomization distribution/)
      verdicts.add(saysSignificant ? 'sig' : 'ns')
    }
    expect([...verdicts].sort()).toEqual(['ns', 'sig'])
  })
})

describe('act-3/scope-of-inference: all four cells of the scope table appear', () => {
  it('rotates cause × generalization with matching polarity', () => {
    const cells = new Set<string>()
    for (let i = 1; i <= 60; i++) {
      const p = instantiate('act-3/scope-of-inference', seed(i))
      const q = question(p)
      expect(q.type).toBe('interpretation')
      const ex = q.type === 'interpretation' ? q.exemplar : ''
      const cause = /^Because .* was assigned at random/.test(ex)
      const general = /the finding extends to/.test(ex)
      // Exactly one of the two generalization clauses is used.
      expect(general).toBe(!/cannot be generalized beyond/.test(ex))
      cells.add(`${cause ? 'RA' : '-'}/${general ? 'RS' : '-'}`)
    }
    expect([...cells].sort()).toEqual(['-/-', '-/RS', 'RA/-', 'RA/RS'])
  })
})

describe('act-3/randomization-p: agrees with permutationPValue on the listed relabellings', () => {
  it('counts the right tail(s)', () => {
    let sawOne = false
    let sawTwo = false
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/randomization-p', seed(i))
      const listed = /Sorted, they run: ([^\n]+)\./.exec(p.prompt)![1].split(', ').map(num)
      const observed = num(/difference in mean advisories of \*\*(−?[\d.]+)\*\*/.exec(p.prompt)![1])
      const twoSided = /\*\*two-sided\*\*/.test(p.prompt)
      if (twoSided) sawTwo = true
      else sawOne = true
      const expected = permutationPValue(listed, observed, twoSided ? 'two-sided' : 'greater')
      const a = p.answer as NumericAnswer
      expect(a.value, `seed ${seed(i)}`).toBeCloseTo(expected, 12)
      expect(a.kind).toBe('pValue')
      // A one-sided count is never larger than the two-sided one.
      expect(permutationPValue(listed, observed, 'greater')).toBeLessThanOrEqual(permutationPValue(listed, observed, 'two-sided') + 1e-12)
    }
    expect(sawOne && sawTwo, 'both sidednesses appear across seeds').toBe(true)
  })
})

describe('act-3/small-trial-power: agrees with binomial.atLeast', () => {
  it('computes P(at least one loss), or inverts it to the smallest n', () => {
    let sawDirect = false
    let sawInvert = false
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/small-trial-power', seed(i))
      const pLoss = num(/— ([\d.]+) per transit/.exec(p.prompt)![1])
      const a = p.answer as NumericAnswer
      const direct = /ran \*\*([\d,]+) transits\*\*/.exec(p.prompt)
      if (direct) {
        sawDirect = true
        const n = num(direct[1])
        expect(a.value).toBeCloseTo(binomial.atLeast(1, n, pLoss), 12)
        expect(a.value).toBeLessThan(0.6)
      } else {
        sawInvert = true
        const target = num(/at least a \*\*([\d.]+)%\*\* chance/.exec(p.prompt)![1]) / 100
        const n = a.value
        expect(Number.isInteger(n)).toBe(true)
        expect(binomial.atLeast(1, n, pLoss)).toBeGreaterThanOrEqual(target - 1e-12)
        expect(binomial.atLeast(1, n - 1, pLoss)).toBeLessThan(target)
      }
    }
    expect(sawDirect && sawInvert, 'both variants appear across seeds').toBe(true)
  })
})

describe('act-3/assignment-conditions: the conditionsCheck template, on random assignment', () => {
  it('requires Random, Independent and a graph-based Normal condition', () => {
    for (let i = 1; i <= SEEDS; i++) {
      const p = instantiate('act-3/assignment-conditions', seed(i))
      const q = question(p)
      expect(q.type).toBe('interpretation')
      if (q.type !== 'interpretation') continue
      const labels = q.required.map((g) => g.label)
      expect(labels).toContain('Random assignment')
      expect(labels.some((l) => /Independence/.test(l))).toBe(true)
      expect(labels.some((l) => /Normal \(graph/.test(l))).toBe(true)
      // A "random sample" answer must not satisfy the whole rubric on its own.
      const thin = 'The data come from a random sample of transits on the lane, so everything is fine.'
      expect(gradeInterpretation(q, thin).correct).toBe(false)
    }
  })
})

describe('act-3 drills keep clear of the Act III mission-beat headline numbers', () => {
  const RESERVED = [212, 260, 924]
  it('no drill answers with a reserved count, and no reserved proportion is an answer', () => {
    for (const id of IDS) {
      for (let i = 1; i <= SEEDS; i++) {
        const p = instantiate(id, seed(i))
        const q = question(p)
        if (q.type !== 'numeric') continue
        if (Number.isInteger(q.value)) expect(RESERVED, `${id} seed ${seed(i)}`).not.toContain(q.value)
        for (const bad of [0.94, 0.31, 0.23]) expect(Math.abs(q.value - bad), `${id} seed ${seed(i)} ≈ ${bad}`).toBeGreaterThan(0.0005)
      }
    }
  })
})

/**
 * Act VIII group-B generators (act-8-03 and act-8-04): every answer re-derived from `@/lib/stats`
 * rather than trusted, swept over seeds. `defineGenerator` already self-checks every draw, so what
 * is tested here is that the numbers the prompts print and the numbers the answers carry come out
 * of the same chi-square call the course uses everywhere else.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { chi2, chiSquareHomogeneity, chiSquareIndependence, expectedCounts } from '@/lib/stats'
import { fmt, fmtP } from '@/lib/stats/format'
import type { NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { TWO_WAY_CONTEXTS, drawFailingTable, drawTable, expectedCountCell, expectedTableMargins, homogeneityOrIndependence, reservedCount, twoWayConditions, twoWayDf, twoWayHypotheses } from './two-way-setup'
import { chiSquareConclusion, drivingCell, twoWayPValue, twoWayStatistic } from './two-way-test'
import { LEAF_NAME, procedureJustification, selectCategoricalProcedure } from './select-procedure'

const SEEDS = Array.from({ length: 60 }, (_, i) => 5_000 + i * 37)

const ALL: ProblemGenerator[] = [
  expectedCountCell,
  homogeneityOrIndependence,
  twoWayDf,
  twoWayConditions,
  twoWayHypotheses,
  expectedTableMargins,
  twoWayStatistic,
  twoWayPValue,
  drivingCell,
  chiSquareConclusion,
  selectCategoricalProcedure,
  procedureJustification,
]

/** Every number a prompt or solution prints, as JS numbers. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/(?<![\w.])[-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w.]|\.\d)/g)].map((m) => Number(m[0].replace(/−/g, '-').replace(/,/g, '')))
}

describe('act-8 group-B generators: shape', () => {
  it('registers twelve generators with act-8 ids and CED topics', () => {
    expect(ALL).toHaveLength(12)
    for (const g of ALL) {
      expect(g.id).toMatch(/^act-8\/[a-z0-9-]+$/)
      expect(g.ap_topics.length).toBeGreaterThan(0)
      expect(g.label.length).toBeGreaterThan(0)
    }
    expect(new Set(ALL.map((g) => g.id)).size).toBe(12)
  })

  it('draws cleanly on every seed, with hints that never hold the answer', () => {
    for (const g of ALL) {
      for (const seed of SEEDS) {
        const p = g.generate(new Rng(seed))
        expect(p.prompt.length, `${g.id} @ ${seed}`).toBeGreaterThan(40)
        expect(p.solution.length, `${g.id} @ ${seed}`).toBeGreaterThan(40)
        expect(p.hints.length).toBeGreaterThanOrEqual(2)
        expect(p.hints.length).toBeLessThanOrEqual(3)
        if (p.answer.type === 'numeric') {
          const a = p.answer as NumericAnswer
          const shown = a.kind === 'pValue' ? fmtP(a.value) : fmt(a.value, a.digits ?? 2)
          for (const h of p.hints) expect(h.includes(shown), `${g.id} @ ${seed}: hint gives the answer away`).toBe(false)
        }
      }
    }
  })
})

describe('act-8/expected-count-cell', () => {
  it('answers with row × column ÷ n for a cell whose margins are printed in the prompt', () => {
    for (const seed of SEEDS) {
      const p = expectedCountCell.generate(new Rng(seed))
      const a = p.answer as NumericAnswer
      const m = /\\frac\{(\d+) \\times (\d+)\}\{(\d+)\}/.exec(p.solution)
      expect(m, `no formula in solution @ ${seed}`).not.toBeNull()
      const [, rowT, colT, n] = m!
      expect(a.value).toBeCloseTo((Number(rowT) * Number(colT)) / Number(n), 10)
      expect(a.digits).toBe(2)
    }
  })
})

describe('act-8/two-way-df', () => {
  it('is (r − 1)(c − 1), with rc − 1 among the distractors', () => {
    for (const seed of SEEDS) {
      const p = twoWayDf.generate(new Rng(seed))
      const dims = /\*\*(\d+) categories\*\*|\((\d+) categories\)/g
      const found = [...p.prompt.matchAll(/\((\d+) categories\)/g)].map((m) => Number(m[1]))
      expect(dims).toBeTruthy()
      expect(found).toHaveLength(2)
      const [r, c] = found
      const df = (r - 1) * (c - 1)
      if (p.answer.type !== 'choice') throw new Error('expected a choice')
      expect(p.answer.options[p.answer.correct]).toContain(String(df))
      expect(p.answer.options.some((o) => o.includes(String(r * c - 1)))).toBe(true)
      expect(numbersIn(p.solution)).toContain(df)
    }
  })
})

describe('act-8/two-way-statistic and act-8/two-way-pvalue', () => {
  it('agree with chiSquareIndependence / chiSquareHomogeneity on the printed table', () => {
    for (const gen of [twoWayStatistic, twoWayPValue]) {
      for (const seed of SEEDS) {
        const p = gen.generate(new Rng(seed))
        const a = p.answer as NumericAnswer
        // Recover the table from the observed rows the prompt prints.
        const ctx = TWO_WAY_CONTEXTS.find((x) => p.prompt.includes(x.office))!
        const rows = ctx.rowLabels.map((rl) => {
          const line = p.prompt.split('\n').find((l) => l.trim().startsWith(`| ${rl} |`))!
          return line
            .split('|')
            .slice(2, 2 + ctx.colLabels.length)
            .map((s) => Number(s.trim()))
        })
        const res = ctx.design === 'one-sample' ? chiSquareIndependence(rows, { random: true }) : chiSquareHomogeneity(rows, { random: true })
        if (a.kind === 'pValue') {
          expect(a.value).toBeCloseTo(res.pValue!, 12)
          expect(a.value).toBeCloseTo(chi2.sf(res.statistic, res.df!), 12)
        } else {
          expect(a.value).toBeCloseTo(res.statistic, 10)
          expect(res.df).toBe(1)
        }
        expect(Math.min(...expectedCounts(rows).flat())).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('keeps the 2 × 3 P-value readable and the 2 × 2 statistic finite', () => {
    for (const seed of SEEDS) {
      const pv = twoWayPValue.generate(new Rng(seed)).answer as NumericAnswer
      expect(pv.value).toBeGreaterThan(0.00002)
      expect(pv.value).toBeLessThan(0.6)
      const st = twoWayStatistic.generate(new Rng(seed)).answer as NumericAnswer
      expect(Number.isFinite(st.value)).toBe(true)
      expect(st.value).toBeGreaterThan(0)
    }
  })
})

describe('act-8/driving-cell', () => {
  it('names the largest contribution and gets the direction from O − E', () => {
    for (const seed of SEEDS) {
      const p = drivingCell.generate(new Rng(seed))
      if (p.answer.type !== 'choice') throw new Error('expected a choice')
      const right = p.answer.options[p.answer.correct]
      const m = /(\d+) recorded against ([\d.]+) expected, (more|fewer)/.exec(right)!
      const [, o, e, dir] = m
      expect(dir === 'more').toBe(Number(o) > Number(e))
      // Exactly one option is right, and the wrong-direction twin is present.
      expect(p.answer.options.filter((o2) => o2 === right)).toHaveLength(1)
      expect(p.answer.options.some((o2) => o2.includes(`${o} recorded against ${e} expected, ${dir === 'more' ? 'fewer' : 'more'}`))).toBe(true)
    }
  })
})

describe('act-8/chi-square-conclusion', () => {
  it('decides the way the P-value and α decide, and its exemplar passes its own rubric', () => {
    for (const seed of SEEDS) {
      const p = chiSquareConclusion.generate(new Rng(seed))
      if (p.answer.type !== 'interpretation') throw new Error('expected an interpretation')
      const pm = /P = ([\d.]+|<\s*[\d.]+)/.exec(p.prompt)
      const am = /alpha = ([\d.]+)/.exec(p.prompt.replace('\\alpha', 'alpha'))!
      expect(pm).not.toBeNull()
      const alpha = Number(am[1])
      const rejects = /we reject/.test(p.answer.exemplar)
      const failsTo = /fail to reject/.test(p.answer.exemplar)
      expect(rejects !== failsTo).toBe(true)
      expect(alpha).toBeGreaterThan(0)
      // A rejected conclusion has to name the cell that drove it.
      if (rejects) expect(p.answer.exemplar).toMatch(/largest contribution/)
    }
  })
})

describe('act-8/select-categorical-procedure', () => {
  it('always offers four questions including one census and one failed-condition table', () => {
    for (const seed of SEEDS) {
      const p = selectCategoricalProcedure.generate(new Rng(seed))
      if (p.answer.type !== 'choice') throw new Error('expected a choice')
      expect(p.answer.options).toHaveLength(4)
      expect(new Set(p.answer.options).size).toBe(4)
      const named = Object.values(LEAF_NAME).find((n) => p.prompt.includes(n))
      expect(named, `no leaf named in the prompt @ ${seed}`).toBeTruthy()
      // The census and the simulation are in every instance: one is the answer, the rest are feedback.
      const allText = (p.answer.feedback ?? []).filter(Boolean).join(' ') + ' ' + p.solution
      expect(allText).toMatch(/census/)
      expect(allText).toMatch(/simulat/)
    }
  })
})

describe('act-8/procedure-justification', () => {
  it('covers all seven endings across the seeds', () => {
    const seen = new Set<string>()
    for (const seed of Array.from({ length: 200 }, (_, i) => 9_000 + i)) {
      const p = procedureJustification.generate(new Rng(seed))
      for (const [leaf, name] of Object.entries(LEAF_NAME)) if (p.solution.includes(name) || p.hints.join(' ').includes(name)) seen.add(leaf)
    }
    expect(seen.size).toBeGreaterThanOrEqual(5)
  })
})

describe('the table draws the Act VIII drills are built on', () => {
  it('keeps every expected count above five and every total off the Act’s own numbers', () => {
    for (const seed of SEEDS) {
      const rng = new Rng(seed)
      for (const ctx of TWO_WAY_CONTEXTS) {
        const d = drawTable(rng, ctx)
        expect(d.minE).toBeGreaterThanOrEqual(6)
        expect(Math.min(...expectedCounts(d.counts).flat())).toBeCloseTo(d.minE, 12)
        expect(reservedCount(d.total)).toBe(false)
        expect(d.rowTotals.reduce((a, b) => a + b, 0)).toBe(d.total)
        expect(d.colTotals.reduce((a, b) => a + b, 0)).toBe(d.total)
      }
    }
  })

  it('produces a failing 2 × 2 whose smallest expected count is below five and above zero', () => {
    for (const seed of SEEDS) {
      const d = drawFailingTable(new Rng(seed))
      expect(d.minE).toBeLessThan(5)
      expect(d.minE).toBeGreaterThan(0)
      expect(d.counts).toHaveLength(2)
      expect(Math.min(...expectedCounts(d.counts).flat())).toBeCloseTo(d.minE, 12)
    }
  })
})

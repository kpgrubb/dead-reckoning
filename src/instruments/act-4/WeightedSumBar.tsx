/**
 * ENGINEERING · THE WEIGHTED SUM (calc briefing "expected-value-as-weighted-sum") — build
 * E(X) = Σ x·p(x) one term at a time and watch the running total land on µ.
 *
 * The variable is the Act's own: the sink-hours a 64-hour Watch window costs at the chosen loiter
 * point. Two things the briefing asks the learner to see:
 *  - the running total converges on µ, and the *unweighted* mean of the same cell centres does not;
 *  - refining the cell width doubles the number of terms and lands on the same µ, because the
 *    integral is the weighted sum with cells too narrow to be wrong. Each halving splits a cell's
 *    mass symmetrically about its centre, which leaves the mean exactly alone.
 *
 * Every figure is computed from `@/lib/stats`, never written as a literal.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Readout, ReadoutRow, Slider } from '@/instruments/shared'
import { expectedValue, fmt, mean as plainMean } from '@/lib/stats'
import { DEFAULT_LOITER, loiterOption_, type LoiterOption } from './data'
import { KeyTable, Note, Subhead, stackStyle } from './_ui'

const MAX_HALVINGS = 3
const TABLE_ROWS = 14

interface Cells {
  values: number[]
  probs: number[]
}

/**
 * Split every cell into two half-width cells carrying half its mass, placed symmetrically about the
 * old centre. Twice the terms; identical mean, by construction.
 */
function halve(cells: Cells, width: number): Cells {
  const values: number[] = []
  const probs: number[] = []
  cells.values.forEach((v, i) => {
    values.push(v - width / 4, v + width / 4)
    probs.push(cells.probs[i] / 2, cells.probs[i] / 2)
  })
  return { values, probs }
}

export interface WeightedSumBarProps {
  /** Loiter point whose cost distribution is summed. Defaults to the Act's middle point. */
  option?: LoiterOption
}

export function WeightedSumBar({ option = loiterOption_(DEFAULT_LOITER) }: WeightedSumBarProps) {
  const base: Cells = useMemo(() => ({ values: [...option.pmf.values], probs: [...option.pmf.probs] }), [option])
  const baseWidth = base.values.length > 1 ? base.values[1] - base.values[0] : 1

  const [halvings, setHalvings] = useState(0)
  const cells = useMemo(() => {
    let c = base
    let w = baseWidth
    for (let i = 0; i < halvings; i++) {
      c = halve(c, w)
      w /= 2
    }
    return c
  }, [base, baseWidth, halvings])

  const n = cells.values.length
  const [terms, setTerms] = useState(base.values.length)
  const used = Math.min(terms, n)

  const contributions = useMemo(() => cells.values.map((v, i) => v * cells.probs[i]), [cells])
  const running = contributions.slice(0, used).reduce((s, c) => s + c, 0)
  const totalProb = cells.probs.reduce((s, p) => s + p, 0)
  const muAll = useMemo(() => expectedValue(cells.values, cells.probs), [cells])
  const unweighted = useMemo(() => plainMean(cells.values), [cells])
  const complete = used === n

  const refine = (h: number) => {
    setHalvings(h)
    setTerms(base.values.length * 2 ** h) // a refinement shows every term of the finer sum
  }

  const rows = cells.values.slice(0, TABLE_ROWS).map((v, i) => [
    fmt(v, halvings === 0 ? 0 : 2),
    fmt(cells.probs[i], 5),
    i < used ? fmt(contributions[i], 4) : '—',
    i < used ? fmt(contributions.slice(0, i + 1).reduce((s, c) => s + c, 0), 4) : '—',
  ])

  return (
    <Panel label="ENGINEERING · THE WEIGHTED SUM" status={`${used}/${n} TERMS · ${option.label.toUpperCase()}`} tone="engineering" led={complete ? 'on' : 'busy'}>
      <div style={stackStyle}>
        <Slider label="terms added, left to right" value={used} min={0} max={n} step={1} onChange={setTerms} />
        <Slider label="refine · halvings of the cell" value={halvings} min={0} max={MAX_HALVINGS} step={1} onChange={refine} />

        <Subhead>Each cell's width is its share of the probability</Subhead>
        <div
          className="dr-wsum"
          role="img"
          aria-label={`Unit bar of ${n} terms x times p of x; ${used} of them added, running total ${fmt(running, 2)} hours against an expected value of ${fmt(muAll, 2)} hours.`}
        >
          {cells.values.map((v, i) => (
            <span
              key={i}
              className={`dr-wsum__cell ${i < used ? 'is-on' : ''}`}
              style={{ flexGrow: Math.max(cells.probs[i], 1e-6) }}
              title={`x = ${fmt(v, 2)} h · p(x) = ${fmt(cells.probs[i], 5)}`}
            />
          ))}
        </div>

        <ReadoutRow>
          <Readout label="running Σ x·p(x)" value={fmt(running, 4)} units="h" live />
          <Readout label="E[X] · all terms" value={fmt(muAll, 4)} units="h" tone="tactical" />
          <Readout label="∫ x f(x) dx = μ" value={fmt(option.meanHours, 4)} units="h" />
          <Readout label="plain average of the cell centres — NOT E[X]" value={fmt(unweighted, 4)} units="h" tone="engineering" />
          <Readout label="Σ p(x)" value={fmt(totalProb, 6)} />
          <Readout label="cells" value={String(n)} />
        </ReadoutRow>

        <Note tone={complete ? 'ok' : 'muted'} live>
          {complete
            ? `All ${n} terms: the weighted sum is ${fmt(running, 4)} h, which is µ. The plain average of the same cell centres is ${fmt(unweighted, 4)} h — it says a ${fmt(Math.max(...cells.values), 0)}-hour window is exactly as common as a ${fmt(Math.min(...cells.values), 0)}-hour one, and it is not.`
            : `Each term is one cell centre times its share of the probability. The weights used so far add to ${fmt(cells.probs.slice(0, used).reduce((s, p) => s + p, 0), 5)}; until they add to 1 the running total is not an average of anything.`}
        </Note>
        <Note live>
          Halving the cell doubles the terms and moves µ by nothing: refinement is bookkeeping, and the integral is this sum with the cells too narrow to be wrong.
        </Note>

        <KeyTable
          columns={['x (h)', 'p(x)', 'x · p(x)', 'running Σ']}
          rows={rows}
          caption={`Terms of the weighted sum · ${n} cells${n > TABLE_ROWS ? ` (first ${TABLE_ROWS})` : ''}`}
          ariaLabel="Terms of the weighted sum"
        />
      </div>
    </Panel>
  )
}

/**
 * INTEL · READING THE PACKAGE OUTPUT (act-7-05) — the block the exam prints, line by line.
 *
 * A statistics package hands back everything at once: two summary rows, a difference, a standard
 * error, degrees of freedom, a t and a p. The skill is knowing which of those lines answers the
 * question that was asked, and which two lines change when somebody ticks "assume equal variances".
 *
 * What the learner does: focuses a line (click or Tab + Enter) and is told what it is; switches the
 * output between the unpooled procedure and the pooled one and watches the standard error and the
 * degrees of freedom move while the two group summaries do not; switches the question between
 * "how large is the difference" and "is there evidence of one" and watches which lines light up.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   a, b, nameA, nameB   the two independent samples and their names. Defaults: DS-09's lost
 *                        Perrine hulls against the Perrine hulls that arrived.
 *   measure, units       the response, named.
 *   confidence           the level the printed interval uses. Default 0.95.
 *   label, tone          Panel header and ship-system tone.
 *
 * The unpooled block is `twoMeanTest` / `twoMeanInterval` from `@/lib/stats`. The pooled block is
 * the procedure this course never uses, so the library does not offer it; it is assembled here from
 * `variance`, `tStar` and `pValueT` in the same library, and it exists only to be compared with the
 * block above it.
 */
import { useMemo, useState, type CSSProperties } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout, Segmented } from '@/instruments/shared'
import { conservativeDf, fmt, fmtInt, fmtP, fmtPct, mean, pValueT, sd, tStar, twoMeanInterval, twoMeanTest, variance, welchDf } from '@/lib/stats'
import { lostPerrineDelays, survivingPerrineDelays } from './data'
import { Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type Method = 'unpooled' | 'pooled'
type Question = 'magnitude' | 'decision'

export interface OutputReaderProps {
  a?: readonly number[]
  b?: readonly number[]
  nameA?: string
  nameB?: string
  measure?: string
  units?: string
  confidence?: number
  label?: string
  tone?: PanelTone
}

interface OutputLine {
  id: string
  text: string
  what: string
  /** Which question this line serves. */
  serves: Question | 'both' | 'neither'
}

const monoBlock: CSSProperties = {
  fontFamily: 'var(--dr-font-mono)',
  fontSize: 'var(--dr-fs-xs)',
  border: '1px solid var(--dr-line)',
  borderRadius: 'var(--dr-radius)',
  overflowX: 'auto',
  background: 'var(--dr-chart-surface)',
}

export function OutputReader({
  a = lostPerrineDelays,
  b = survivingPerrineDelays,
  nameA = 'lost Perrine',
  nameB = 'surviving Perrine',
  measure = 'Mark-9 delay',
  units = 'd',
  confidence = 0.95,
  label = 'INTEL · READING THE PACKAGE OUTPUT',
  tone = 'intel',
}: OutputReaderProps = {}) {
  const [method, setMethod] = useState<Method>('unpooled')
  const [question, setQuestion] = useState<Question>('magnitude')
  const [selected, setSelected] = useState<string | null>(null)

  const xs = useMemo(() => [...a], [a])
  const ys = useMemo(() => [...b], [b])
  const n1 = xs.length
  const n2 = ys.length
  const m1 = mean(xs)
  const m2 = mean(ys)
  const s1 = sd(xs)
  const s2 = sd(ys)
  const estimate = m1 - m2

  /** The procedure the course teaches: no assumption that the two spreads match. */
  const unpooled = useMemo(() => twoMeanTest(xs, ys, { alt: 'two-sided', random: true }), [xs, ys])
  const unpooledCi = useMemo(() => twoMeanInterval(xs, ys, { confidence, random: true }), [xs, ys, confidence])

  /**
   * The pooled block. `@/lib/stats` does not provide it — the AP two-sample procedure is unpooled —
   * so it is built from the library's own variance, critical value and tail area, and printed only
   * so that the two standard errors and the two degrees of freedom can be read against each other.
   */
  const pooled = useMemo(() => {
    const sp2 = ((n1 - 1) * variance(xs) + (n2 - 1) * variance(ys)) / (n1 + n2 - 2)
    const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2))
    const df = n1 + n2 - 2
    const t = estimate / se
    return { sp: Math.sqrt(sp2), se, df, t, p: pValueT(t, df, 'two-sided'), tStar: tStar(confidence, df) }
  }, [xs, ys, n1, n2, estimate, confidence])

  const se = method === 'unpooled' ? unpooled.se : pooled.se
  const df = method === 'unpooled' ? (unpooled.df ?? welchDf(s1, n1, s2, n2)) : pooled.df
  const t = method === 'unpooled' ? unpooled.statistic : pooled.t
  const p = method === 'unpooled' ? (unpooled.pValue ?? NaN) : pooled.p
  const crit = method === 'unpooled' ? (unpooledCi.criticalValue ?? tStar(confidence, df)) : pooled.tStar
  const lower = estimate - crit * se
  const upper = estimate + crit * se

  const pad = (s: string, w: number) => (s.length >= w ? s : ' '.repeat(w - s.length) + s)
  const nameW = Math.max(nameA.length, nameB.length, 8)
  const row = (name: string, n: number, m: number, s: number) =>
    `${name.padEnd(nameW)} ${pad(fmtInt(n), 6)} ${pad(fmt(m, 4), 9)} ${pad(fmt(s, 4), 8)} ${pad(fmt(s / Math.sqrt(n), 4), 9)}`

  const lines: OutputLine[] = [
    {
      id: 'header',
      text: `Two-Sample T for ${measure} (${units})${method === 'pooled' ? '   [assume equal variances]' : ''}`,
      what: `The procedure the package ran. ${method === 'pooled' ? 'The bracket is the tick-box that pooled the two standard deviations into one — the thing the write-up must never do without a reason.' : 'No bracket: the two groups kept their own standard deviations, which is the default and the right choice.'}`,
      serves: 'both',
    },
    { id: 'colhead', text: `${''.padEnd(nameW)} ${pad('N', 6)} ${pad('Mean', 9)} ${pad('StDev', 8)} ${pad('SE Mean', 9)}`, what: 'Column headings. "SE Mean" is each group\'s own s/√n, not the standard error of the difference — that is four lines down.', serves: 'both' },
    { id: 'rowA', text: row(nameA, n1, m1, s1), what: `Group 1: ${fmtInt(n1)} transits, mean ${fmt(m1, 4)} ${units}, standard deviation ${fmt(s1, 4)} ${units}. These three numbers are all you need to rebuild every line below by hand.`, serves: 'both' },
    { id: 'rowB', text: row(nameB, n2, m2, s2), what: `Group 2: ${fmtInt(n2)} transits, mean ${fmt(m2, 4)} ${units}, standard deviation ${fmt(s2, 4)} ${units}.`, serves: 'both' },
    { id: 'diffdef', text: `Difference = mu (${nameA}) - mu (${nameB})`, what: 'The order of subtraction, and it is a decision the package made for you. Every sign below follows from this line, and a conclusion written the other way round is wrong even when the arithmetic is right.', serves: 'both' },
    { id: 'estimate', text: `Estimate for difference:  ${fmt(estimate, 4)}`, what: `x̄₁ − x̄₂ = ${fmt(m1, 4)} − ${fmt(m2, 4)} = ${fmt(estimate, 4)} ${units}. The point estimate, and the one line that is identical in the pooled and unpooled blocks.`, serves: 'both' },
    {
      id: 'se',
      text: `SE of difference:  ${fmt(se, 4)}`,
      what:
        method === 'unpooled'
          ? `√(s₁²/n₁ + s₂²/n₂) = √(${fmt(s1, 3)}²/${fmtInt(n1)} + ${fmt(s2, 3)}²/${fmtInt(n2)}) = ${fmt(se, 4)}. Each group's own spread over its own count.`
          : `s_p√(1/n₁ + 1/n₂) with a pooled s_p of ${fmt(pooled.sp, 4)}: one standard deviation used for both groups, weighted by ${fmtInt(n2)} against ${fmtInt(n1)}. The larger group has effectively set the spread for the smaller one.`,
      serves: 'both',
    },
    { id: 'ci', text: `${fmtPct(confidence, 0)} CI for difference:  (${fmt(lower, 4)}, ${fmt(upper, 4)})`, what: `The estimate plus and minus t* × SE, with t* = ${fmt(crit, 4)} on ${fmt(df, 2)} degrees of freedom. This is the line that answers "how much".`, serves: 'magnitude' },
    { id: 'test', text: `T-Value = ${fmt(t, 2)}   P-Value = ${fmtP(p)}   DF = ${fmt(df, 2)}`, what: `The decision line: how many standard errors the estimate sits from zero, and how often a difference at least this large turns up when there is none. DF is ${method === 'unpooled' ? "Welch's, and a fraction is not a mistake" : 'n₁ + n₂ − 2, which the pooled procedure can afford only because it assumed the two spreads are equal'}.`, serves: 'decision' },
  ]

  const selectedLine = lines.find((l) => l.id === selected) ?? null
  const serves = (l: OutputLine) => l.serves === 'both' || l.serves === question

  return (
    <Panel label={label} status={method === 'unpooled' ? 'POOLED: NO' : 'POOLED: YES'} tone={tone} led={method === 'unpooled' ? 'on' : 'warn'} ariaLabel="Output reader: a two-sample t output block with an explanation for every line">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Method>
            label="how the package was run"
            value={method}
            onChange={setMethod}
            options={[
              { value: 'unpooled', label: 'Pooled: No' },
              { value: 'pooled', label: 'Pooled: Yes' },
            ]}
          />
          <Segmented<Question>
            label="the question being asked"
            value={question}
            onChange={setQuestion}
            options={[
              { value: 'magnitude', label: 'how large is the difference?' },
              { value: 'decision', label: 'is there evidence of one?' },
            ]}
          />
        </div>

        <div style={monoBlock}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Package output, one selectable line at a time">
            {lines.map((l) => {
              const isSelected = l.id === selected
              const lit = serves(l)
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelected(isSelected ? null : l.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      whiteSpace: 'pre',
                      font: 'inherit',
                      padding: 'var(--dr-sp-1) var(--dr-sp-3)',
                      border: 'none',
                      borderLeft: `3px solid ${isSelected ? 'var(--dr-violet)' : lit ? 'var(--dr-phosphor)' : 'transparent'}`,
                      background: isSelected ? 'var(--dr-bg-2)' : 'transparent',
                      color: lit ? 'var(--dr-fg-0)' : 'var(--dr-fg-2)',
                      cursor: 'pointer',
                    }}
                  >
                    {l.text}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <Note live>
          {selectedLine ? (
            <>
              <strong>{selectedLine.text.trim()}</strong> — {selectedLine.what}
            </>
          ) : (
            <>Select any line of the block to be told what it is. Lines in the brighter colour are the ones the current question needs.</>
          )}
        </Note>

        <section aria-label="Pooled against unpooled">
          <Subhead>What the tick-box changed</Subhead>
          <ReadoutGrid>
            <Readout label="estimate" value={fmt(estimate, 4)} tone="intel" />
            <Readout label="SE · unpooled" value={fmt(unpooled.se, 4)} size="sm" />
            <Readout label="SE · pooled" value={fmt(pooled.se, 4)} size="sm" />
            <Readout label="df · Welch" value={fmt(unpooled.df ?? 0, 2)} size="sm" />
            <Readout label="df · pooled" value={fmtInt(pooled.df)} size="sm" />
            <Readout label="df · conservative" value={fmtInt(conservativeDf(n1, n2))} size="sm" />
          </ReadoutGrid>
          <Note tone="warn">
            The two group summary rows never move. The standard error and the degrees of freedom do, and on samples this uneven they move a long way: pooling hands the smaller group the
            larger group's spread and then claims {fmtInt(pooled.df)} degrees of freedom for a comparison that rests on {fmtInt(Math.min(n1, n2))} observations. Pooling is defensible only
            where the two population standard deviations are known to be equal, which no Lane file has ever established. Leave the box on <strong>No</strong>, and say in the write-up which
            degrees of freedom you used: Welch's {fmt(welchDf(s1, n1, s2, n2), 2)}, or the conservative {fmtInt(conservativeDf(n1, n2))}.
          </Note>
        </section>

        <Note>
          σ appears nowhere on this screen and it should not. A block that asks you to type σ is a z procedure, and a two-sample comparison of means with an unknown population standard
          deviation is a t procedure whatever the sample sizes are.
        </Note>
      </div>
    </Panel>
  )
}
